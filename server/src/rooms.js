const { makeChallenge, checkAnswer, ALL_TYPES, CONVERSION_TYPES, DIFFICULTIES } = require('./challenges');

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
    this.public = false; // listed on the join page for anyone to find
    this.config = {
      targetScore: 5,
      concurrent: 3,
      types: ALL_TYPES,
      conversionTypes: CONVERSION_TYPES,
      difficultySettings: {},
      gameDifficulties: {},
      difficulty: 'normal',
    };
    this.active = new Map(); // challengeId -> challenge (with _answer)
    this.timers = new Set(); // pending refill timeouts
    this.winner = null; // overall game winner
    this.chat = []; // recent chat log: { id, name, text, ts, system }
    this.chatSeq = 0; // monotonic message id counter
    this.onGameEnded = null; // manager hook, fired when a game reaches "over"
  }

  // Append a chat message, cap the log, and broadcast it live. A system
  // message (join/leave notice) has no author and renders differently.
  addChat({ socketId, text, system }) {
    let name;
    if (system) {
      name = null;
    } else {
      const player = this.players.get(socketId);
      if (!player) return; // not in this room
      const clean = String(text || '').replace(/\s+/g, ' ').trim().slice(0, 280);
      if (!clean) return;
      text = clean;
      name = player.name;
    }
    const msg = {
      id: ++this.chatSeq,
      senderId: system ? null : socketId,
      name,
      text,
      ts: Date.now(),
      system: !!system,
    };
    this.chat.push(msg);
    if (this.chat.length > 50) this.chat.shift();
    this.io.to(this.code).emit('chatMessage', msg);
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
      public: this.public,
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
      conversionTypes: validConversionTypes(config.conversionTypes) || this.config.conversionTypes,
      difficultySettings: validDifficultySettings(config.difficultySettings),
      gameDifficulties: validGameDifficulties(config.gameDifficulties),
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
    const ch = makeChallenge(type, this.config.gameDifficulties[type] || this.config.difficulty, this.config.conversionTypes, this.config.difficultySettings[type]);
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
    if (this.onGameEnded) this.onGameEnded();
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

function validConversionTypes(types) {
  if (!Array.isArray(types)) return null;
  const filtered = types.filter((type) => CONVERSION_TYPES.includes(type));
  return filtered.length ? filtered : null;
}

function validDifficultySettings(settings) {
  const source = settings && typeof settings === 'object' ? settings : {};
  return Object.fromEntries(
    ALL_TYPES.map((type) => [type, validOneDifficultySettings(source[type])]).filter(([, value]) => Object.keys(value).length)
  );
}

function validOneDifficultySettings(source) {
  source = source && typeof source === 'object' ? source : {};
  const int = (key, min, max) => {
    const value = parseInt(source[key], 10);
    return Number.isNaN(value) ? undefined : Math.max(min, Math.min(max, value));
  };
  const out = {};
  for (const [key, min, max] of [
    ['words', 1, 10], ['maxNum', 1, 65535], ['bits', 1, 16], ['xorMax', 1, 65535],
    ['knockPorts', 1, 8], ['knockOffset', 0, 5000], ['choices', 2, 6], ['hashPrefix', 1, 32],
  ]) {
    const value = int(key, min, max);
    if (value !== undefined) out[key] = value;
  }
  const commits = int('commits', 2, 30);
  const prefix = int('prefix', 1, 10);
  if (commits !== undefined || prefix !== undefined) out.reparent = { ...(commits !== undefined && { commits }), ...(prefix !== undefined && { prefix }) };
  if (typeof source.cidrs === 'string') {
    const cidrs = source.cidrs.split(',').map((value) => parseInt(value.trim(), 10)).filter((value) => Number.isInteger(value) && value >= 1 && value <= 30);
    if (cidrs.length) out.cidrs = [...new Set(cidrs)];
  }
  return out;
}

function validGameDifficulties(difficulties) {
  if (!difficulties || typeof difficulties !== 'object') return {};
  return Object.fromEntries(
    ALL_TYPES.filter((type) => DIFFICULTIES.includes(difficulties[type])).map((type) => [type, difficulties[type]])
  );
}

class RoomManager {
  constructor(io, opts = {}) {
    this.io = io;
    this.rooms = new Map();
    this._onGameEnded = opts.onGameEnded || null;
    this._publicTimer = null; // trailing debounce timer for public-list broadcasts
    this._publicKey = ''; // signature of the last public list we actually sent (empty at boot)
  }

  get(code) {
    return this.rooms.get(code);
  }

  getOrCreate(code) {
    let room = this.rooms.get(code);
    if (!room) {
      room = new Room(code, this.io);
      room.onGameEnded = this._onGameEnded;
      this.rooms.set(code, room);
    }
    return room;
  }

  delete(code) {
    const room = this.rooms.get(code);
    if (room) room.clearTimers();
    this.rooms.delete(code);
  }

  // Public rooms still waiting in the lobby, for the join-page browser.
  publicList() {
    return [...this.rooms.values()]
      .filter((r) => r.public && r.state === 'lobby')
      .map((r) => ({ code: r.code, players: r.players.size }))
      .sort((a, b) => a.code.localeCompare(b.code));
  }

  // Cheap signature of the current public-lobby list so no-op broadcasts (a
  // player joining/leaving a *private* room, toggles that don't change the
  // visible list) are skipped instead of re-sent to every connected socket.
  _publicListKey() {
    let key = '';
    for (const [code, r] of this.rooms) {
      if (r.public && r.state === 'lobby') key += `${code}:${r.players.size};`;
    }
    return key;
  }

  // Push the public-room list to every connected client (joined or not).
  // Trailing-edge debounce coalesces bursts — N players joining at once within
  // the window becomes a single emit, not N — and _emitPublic skips the fanout
  // entirely when the list didn't visibly change (players joining/leaving a
  // private room, host toggles that don't alter the visible list).
  broadcastPublic() {
    if (this._publicTimer) clearTimeout(this._publicTimer);
    this._publicTimer = setTimeout(() => {
      this._publicTimer = null;
      this._emitPublic();
    }, 100);
  }

  _emitPublic() {
    const key = this._publicListKey();
    if (key === this._publicKey) return;
    this._publicKey = key;
    this.io.emit('publicRooms', this.publicList());
  }
}

module.exports = { RoomManager, Room };
