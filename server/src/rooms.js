const { makeChallenge, checkAnswer, ALL_TYPES, DIFFICULTIES } = require('./challenges');

// Delay before a solved window is replaced by a fresh challenge, so players
// can see who won before a new window pops up in its place.
const REFILL_DELAY_MS = 1600;

class Room {
  constructor(code, io) {
    this.code = code;
    this.io = io;
    this.players = new Map(); // socketId -> { id, name, score }
    this.hostId = null;
    this.state = 'lobby'; // lobby | playing | over
    this.config = { targetScore: 5, concurrent: 3, types: ALL_TYPES, difficulty: 'normal' };
    this.active = new Map(); // challengeId -> challenge (with _answer)
    this.timers = new Set(); // pending refill timeouts
    this.winner = null; // overall game winner
  }

  isEmpty() {
    return this.players.size === 0;
  }

  addPlayer(socketId, name) {
    this.players.set(socketId, { id: socketId, name, score: 0 });
    if (!this.hostId) this.hostId = socketId;
  }

  removePlayer(socketId) {
    this.players.delete(socketId);
    if (socketId === this.hostId) {
      // promote next remaining player to host
      this.hostId = this.players.keys().next().value || null;
    }
  }

  scoreboard() {
    return [...this.players.values()]
      .map((p) => ({ id: p.id, name: p.name, score: p.score, isHost: p.id === this.hostId }))
      .sort((a, b) => b.score - a.score);
  }

  // Public room snapshot for clients (no answers).
  snapshot() {
    return {
      code: this.code,
      state: this.state,
      hostId: this.hostId,
      config: this.config,
      players: this.scoreboard(),
      winner: this.winner,
    };
  }

  broadcastState() {
    this.io.to(this.code).emit('roomState', this.snapshot());
  }

  // Strip the server-only answer before sending a challenge to clients.
  static safe(challenge) {
    const { _answer, ...rest } = challenge;
    return rest;
  }

  // Active challenges, safe for clients (used for late joiners).
  openChallenges() {
    return [...this.active.values()].map(Room.safe);
  }

  clearTimers() {
    for (const t of this.timers) clearTimeout(t);
    this.timers.clear();
  }

  start(config = {}) {
    if (this.players.size === 0) return;
    this.config = {
      targetScore: clampInt(config.targetScore, 1, 50, this.config.targetScore),
      concurrent: clampInt(config.concurrent, 1, 6, this.config.concurrent),
      types: validTypes(config.types) || this.config.types,
      difficulty: DIFFICULTIES.includes(config.difficulty)
        ? config.difficulty
        : this.config.difficulty,
    };
    this.clearTimers();
    this.active.clear();
    for (const p of this.players.values()) p.score = 0;
    this.winner = null;
    this.state = 'playing';
    this.broadcastState();
    this.refill();
  }

  // Spawn one challenge and broadcast its window.
  spawnChallenge() {
    if (this.state !== 'playing') return;
    const type = this.config.types[Math.floor(Math.random() * this.config.types.length)];
    const ch = makeChallenge(type, this.config.difficulty);
    this.active.set(ch.id, ch);
    this.io.to(this.code).emit('challengeOpen', { ...Room.safe(ch), startedAt: Date.now() });
  }

  // Keep the active set topped up to the configured concurrent count.
  refill() {
    while (this.state === 'playing' && this.active.size < this.config.concurrent) {
      this.spawnChallenge();
    }
  }

  // Returns 'correct' | 'wrong' | 'closed'
  submitAnswer(socketId, challengeId, value) {
    if (this.state !== 'playing') return 'closed';
    const challenge = this.active.get(challengeId);
    if (!challenge) return 'closed'; // already solved / stale window
    const player = this.players.get(socketId);
    if (!player) return 'closed';

    if (!checkAnswer(challenge, value)) return 'wrong';

    // First correct answer closes this window.
    player.score++;
    this.active.delete(challengeId);

    this.io.to(this.code).emit('roundResult', {
      challengeId,
      answer: challenge._answer,
      winnerId: socketId,
      winnerName: player.name,
    });

    if (player.score >= this.config.targetScore) {
      this.endGame({ id: socketId, name: player.name, score: player.score });
      return 'correct';
    }

    this.broadcastState();

    // Refill the slot after a short delay so the solved window can flash first.
    const t = setTimeout(() => {
      this.timers.delete(t);
      this.refill();
    }, REFILL_DELAY_MS);
    this.timers.add(t);
    return 'correct';
  }

  endGame(winner) {
    this.clearTimers();
    this.active.clear();
    this.state = 'over';
    this.winner = winner;
    this.broadcastState();
    this.io.to(this.code).emit('gameOver', winner);
  }

  stop() {
    this.clearTimers();
    this.active.clear();
    this.state = 'lobby';
    this.winner = null;
    this.broadcastState();
  }
}

function clampInt(v, min, max, fallback) {
  const n = parseInt(v, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function validTypes(types) {
  if (!Array.isArray(types)) return null;
  const filtered = types.filter((t) => ALL_TYPES.includes(t));
  return filtered.length ? filtered : null;
}

class RoomManager {
  constructor(io) {
    this.io = io;
    this.rooms = new Map();
  }

  get(code) {
    return this.rooms.get(code);
  }

  getOrCreate(code) {
    let room = this.rooms.get(code);
    if (!room) {
      room = new Room(code, this.io);
      this.rooms.set(code, room);
    }
    return room;
  }

  delete(code) {
    const room = this.rooms.get(code);
    if (room) room.clearTimers();
    this.rooms.delete(code);
  }
}

module.exports = { RoomManager, Room };
