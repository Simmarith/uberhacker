const path = require('path');
const express = require('express');
const compression = require('compression');
const http = require('http');
const { Server } = require('socket.io');
const { RoomManager, Room } = require('./rooms');
const { ALL_TYPES, CONVERSION_TYPES, DIFFICULTIES, makeChallenge, checkAnswer } = require('./challenges');

const PORT = process.env.PORT || 3000;

const app = express();
app.use(compression()); // gzip/brotli static responses before they hit the wire
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// Finished games since this server process (re)started. Rawcount is shared
// with every client; the manager bumps it when a game actually ends.
let gamesSinceRestart = 0;
const manager = new RoomManager(io, {
  onGameEnded: () => {
    gamesSinceRestart++;
    io.emit('serverStats', { gamesSinceRestart });
  },
});

// Per-socket lobby practice challenges. Lives outside any Room so it never
// touches scoring or the game loop. socket.id -> challenge (with _answer).
const demos = new Map();

// Serve the built client (client/dist) if it exists.
const clientDist = path.resolve(__dirname, '../../client/dist');
app.use(
  express.static(clientDist, {
    setHeaders(res, filePath) {
      // Build assets are content-hashed, so cache them aggressively; a repeat
      // visit re-downloads nothing. index.html stays no-cache so new deploys
      // pick up fresh asset URLs immediately (it's revalidated via ETag).
      if (filePath.includes(`${path.sep}assets${path.sep}`)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      } else {
        res.setHeader('Cache-Control', 'no-cache');
      }
    },
  })
);

function sanitizeName(name) {
  return String(name || '').trim().slice(0, 20) || 'anon';
}

function sanitizeCode(code) {
  return String(code || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 8);
}

// Per-socket token bucket so a buggy or hostile client can't flood the event
// loop or the broadcast fanout. Refills `rate` tokens/sec up to a `burst`
// capacity; `allow` returns false (and drops the event) while the bucket is
// empty. Created per connection so it's garbage-collected on disconnect —
// no cleanup map to leak.
function makeRateLimiter({ rate, burst }) {
  let tokens = burst;
  let last = Date.now();
  return {
    allow(cost = 1) {
      const now = Date.now();
      tokens = Math.min(burst, tokens + ((now - last) / 1000) * rate);
      last = now;
      if (tokens < cost) return false;
      tokens -= cost;
      return true;
    },
  };
}

io.on('connection', (socket) => {
  let roomCode = null;

  // Game traffic is human-paced; these caps only trip under automated floods.
  // Heavier events (chat fans out to the whole room) cost more tokens.
  const limiter = makeRateLimiter({ rate: 25, burst: 50 });

  // Seed the join-page lobby browser with the current public rooms.
  socket.emit('publicRooms', manager.publicList());
  socket.emit('serverStats', { gamesSinceRestart });

  socket.on('join', ({ room, username }, ack) => {
    const code = sanitizeCode(room);
    const name = sanitizeName(username);
    if (!code) return ack && ack({ ok: false, error: 'Invalid room code.' });

    const r = manager.getOrCreate(code);
    if (r.players.has(socket.id)) return ack && ack({ ok: true, you: socket.id });

    r.addPlayer(socket.id, name);
    socket.join(code);
    roomCode = code;

    if (ack) ack({ ok: true, you: socket.id, types: ALL_TYPES, conversionTypes: CONVERSION_TYPES, difficulties: DIFFICULTIES });
    r.broadcastState();
    manager.broadcastPublic();

    // Backfill the chat log for the new player, then announce their arrival.
    socket.emit('chatHistory', r.chat);
    r.addChat({ system: true, text: `${name} joined` });

    // If a game is already running, drop the new player straight into it
    // by opening every currently-active challenge window.
    if (r.state === 'playing') {
      for (const c of r.openChallenges()) {
        socket.emit('challengeOpen', { ...c, startedAt: Date.now() });
      }
    }
  });

  socket.on('chat', ({ text } = {}) => {
    if (!limiter.allow(5)) return; // drop flood silently, no ack to hang on
    const r = roomCode && manager.get(roomCode);
    if (r) r.addChat({ socketId: socket.id, text });
  });

  socket.on('start', (config) => {
    const r = roomCode && manager.get(roomCode);
    if (r && socket.id === r.hostId) {
      r.start(config || {});
      manager.broadcastPublic(); // room left the lobby, drop it from the list
    }
  });

  socket.on('setPublic', ({ public: isPublic } = {}) => {
    const r = roomCode && manager.get(roomCode);
    if (!r || socket.id !== r.hostId) return;
    r.public = !!isPublic;
    r.broadcastState();
    manager.broadcastPublic();
  });

  socket.on('answer', ({ challengeId, value }, ack) => {
    if (!limiter.allow()) return ack && ack({ result: 'throttled' });
    const r = roomCode && manager.get(roomCode);
    if (!r) return ack && ack({ result: 'closed' });
    const result = r.submitAnswer(socket.id, challengeId, value);
    if (ack) ack({ result });
  });

  // Lobby practice: generate an unscored demo challenge and hold its answer
  // server-side so checking reuses the real verification path.
  socket.on('demo', ({ type, difficulty } = {}, ack) => {
    if (!limiter.allow(2)) return ack && ack({ ok: false, error: 'slow down.' });
    const ch = makeChallenge(type, difficulty);
    demos.set(socket.id, ch);
    if (ack) ack({ ok: true, challenge: Room.safe(ch) });
  });

  socket.on('demoAnswer', ({ value } = {}, ack) => {
    if (!limiter.allow(2)) return ack && ack({ result: 'throttled' });
    const ch = demos.get(socket.id);
    if (!ch) return ack && ack({ result: 'closed' });
    if (ack) ack({ result: checkAnswer(ch, value) ? 'correct' : 'wrong' });
  });

  socket.on('stop', () => {
    const r = roomCode && manager.get(roomCode);
    if (r && socket.id === r.hostId) {
      r.stop();
      manager.broadcastPublic(); // back in the lobby, may reappear in the list
    }
  });

  socket.on('disconnect', () => {
    demos.delete(socket.id);
    const r = roomCode && manager.get(roomCode);
    if (!r) return;
    const leaver = r.players.get(socket.id);
    r.removePlayer(socket.id);
    if (r.isEmpty()) manager.delete(roomCode);
    else {
      if (leaver) r.addChat({ system: true, text: `${leaver.name} left` });
      r.broadcastState();
    }
    manager.broadcastPublic(); // player count changed or room vanished
  });
});

// SPA fallback: anything not matched above returns the client.
// Express 5 / path-to-regexp v8 no longer accepts a bare '*' path, so match
// any remaining GET with a regex instead.
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'), (err) => {
    if (err) res.status(404).send('Client not built. Run `npm run build`.');
  });
});

server.listen(PORT, () => {
  console.log(`uberhacker server on http://localhost:${PORT}`);
});
