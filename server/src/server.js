const path = require('path');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { RoomManager } = require('./rooms');
const { ALL_TYPES, DIFFICULTIES } = require('./challenges');

const PORT = process.env.PORT || 3000;

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
const manager = new RoomManager(io);

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

  socket.on('join', ({ room, username }, ack) => {
    const code = sanitizeCode(room);
    const name = sanitizeName(username);
    if (!code) return ack && ack({ ok: false, error: 'Invalid room code.' });

    const r = manager.getOrCreate(code);
    if (r.players.has(socket.id)) return ack && ack({ ok: true, you: socket.id });

    r.addPlayer(socket.id, name);
    socket.join(code);
    roomCode = code;

    if (ack) ack({ ok: true, you: socket.id, types: ALL_TYPES, difficulties: DIFFICULTIES });
    r.broadcastState();

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
    if (r && socket.id === r.hostId) r.start(config || {});
  });

  socket.on('answer', ({ challengeId, value }, ack) => {
    const r = roomCode && manager.get(roomCode);
    if (!r) return ack && ack({ result: 'closed' });
    const result = r.submitAnswer(socket.id, challengeId, value);
    if (ack) ack({ result });
  });

  socket.on('stop', () => {
    const r = roomCode && manager.get(roomCode);
    if (r && socket.id === r.hostId) r.stop();
  });

  socket.on('disconnect', () => {
    const r = roomCode && manager.get(roomCode);
    if (!r) return;
    const leaver = r.players.get(socket.id);
    r.removePlayer(socket.id);
    if (r.isEmpty()) manager.delete(roomCode);
    else {
      if (leaver) r.addChat({ system: true, text: `${leaver.name} left` });
      r.broadcastState();
    }
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
