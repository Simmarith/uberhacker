const path = require('path');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { RoomManager, Room } = require('./rooms');
const { ALL_TYPES, CONVERSION_TYPES, DIFFICULTIES, makeChallenge, checkAnswer } = require('./challenges');

const PORT = process.env.PORT || 3000;

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
const manager = new RoomManager(io);

// Per-socket lobby practice challenges. Lives outside any Room so it never
// touches scoring or the game loop. socket.id -> challenge (with _answer).
const demos = new Map();

// Serve the built client (client/dist) if it exists.
const clientDist = path.resolve(__dirname, '../../client/dist');
app.use(express.static(clientDist));

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

io.on('connection', (socket) => {
  let roomCode = null;

  // Seed the join-page lobby browser with the current public rooms.
  socket.emit('publicRooms', manager.publicList());

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
    const r = roomCode && manager.get(roomCode);
    if (!r) return ack && ack({ result: 'closed' });
    const result = r.submitAnswer(socket.id, challengeId, value);
    if (ack) ack({ result });
  });

  // Lobby practice: generate an unscored demo challenge and hold its answer
  // server-side so checking reuses the real verification path.
  socket.on('demo', ({ type, difficulty } = {}, ack) => {
    const ch = makeChallenge(type, difficulty);
    demos.set(socket.id, ch);
    if (ack) ack({ ok: true, challenge: Room.safe(ch) });
  });

  socket.on('demoAnswer', ({ value } = {}, ack) => {
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
