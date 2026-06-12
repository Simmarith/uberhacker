// Challenge generators. Each returns { type, prompt, answer, hint }.
// `answer` is the canonical solution string; verification is done via
// normalize() so capitalization / whitespace don't matter.

function rand(max) {
  // inclusive 0..max
  return Math.floor(Math.random() * (max + 1));
}

function pick(arr) {
  return arr[rand(arr.length - 1)];
}

// ---- helpers -------------------------------------------------------------

function randIp() {
  return [rand(255), rand(255), rand(255), rand(255)];
}

function maskOctets(cidr) {
  // returns 4 octets of the netmask for a /8, /16, /24-style prefix
  const mask = [0, 0, 0, 0];
  let bits = cidr;
  for (let i = 0; i < 4; i++) {
    const take = Math.min(8, Math.max(0, bits));
    mask[i] = (256 - Math.pow(2, 8 - take)) & 255;
    bits -= 8;
  }
  return mask;
}

// ---- generators ----------------------------------------------------------

const WORD_POOL = [
  'override', 'mainframe', 'firewall', 'payload', 'kernel', 'exploit',
  'backdoor', 'sudo', 'packet', 'subnet', 'daemon', 'cipher', 'rootkit',
  'buffer', 'inject', 'spoof', 'proxy', 'handshake', 'bytecode', 'token',
];

// Per-difficulty knobs for each generator. `easy` is the gentlest, `hard`
// the toughest; `normal` sits in the middle and matches the old behaviour.
const DIFFICULTIES = ['easy', 'normal', 'hard'];

const DIFFICULTY_CONFIG = {
  easy: { words: 1, cidrs: [8, 16, 24], maxNum: 15, bits: 4, xorMax: 15, knockPorts: 2 },
  normal: { words: 2, cidrs: [8, 16, 24], maxNum: 255, bits: 8, xorMax: 255, knockPorts: 3 },
  hard: { words: 4, cidrs: [12, 18, 20, 26, 28, 30], maxNum: 4095, bits: 12, xorMax: 4095, knockPorts: 5 },
};

function cfg(difficulty) {
  return DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.normal;
}

const generators = {
  // Type the word(s) as fast as you can. Harder = more words.
  fastType(difficulty) {
    const count = cfg(difficulty).words;
    const words = Array.from({ length: count }, () => pick(WORD_POOL));
    const phrase = words.join(' ');
    return {
      type: 'fastType',
      prompt: `Type this as fast as you can:  ${phrase}`,
      answer: phrase,
      hint: 'Type it exactly, words separated by spaces.',
    };
  },

  // Given IP / CIDR, find the network address. Harder = non-octet CIDRs.
  getNet(difficulty) {
    const ip = randIp();
    const cidr = pick(cfg(difficulty).cidrs);
    const mask = maskOctets(cidr);
    const network = ip.map((o, i) => o & mask[i]);
    return {
      type: 'getNet',
      prompt: `Network address of  ${ip.join('.')}/${cidr}  ?`,
      answer: network.join('.'),
      hint: 'AND the IP with the netmask.',
    };
  },

  // Broadcast address for an IP / CIDR. Harder = non-octet CIDRs.
  broadcast(difficulty) {
    const ip = randIp();
    const cidr = pick(cfg(difficulty).cidrs);
    const mask = maskOctets(cidr);
    const bcast = ip.map((o, i) => (o & mask[i]) | (~mask[i] & 255));
    return {
      type: 'broadcast',
      prompt: `Broadcast address of  ${ip.join('.')}/${cidr}  ?`,
      answer: bcast.join('.'),
      hint: 'Set all host bits to 1.',
    };
  },

  // Hex -> decimal. Harder = bigger numbers.
  hexToDec(difficulty) {
    const n = rand(cfg(difficulty).maxNum);
    return {
      type: 'hexToDec',
      prompt: `Convert hex  0x${n.toString(16).toUpperCase()}  to decimal:`,
      answer: String(n),
      hint: 'A=10, B=11 … F=15.',
    };
  },

  // Decimal -> hex. Harder = bigger numbers.
  decToHex(difficulty) {
    const n = rand(cfg(difficulty).maxNum);
    return {
      type: 'decToHex',
      prompt: `Convert decimal  ${n}  to hex (no 0x prefix):`,
      answer: n.toString(16),
      hint: '10=A, 11=B … 15=F.',
    };
  },

  // Binary -> decimal. Harder = wider binary.
  binToDec(difficulty) {
    const bits = cfg(difficulty).bits;
    const n = rand(Math.pow(2, bits) - 1);
    return {
      type: 'binToDec',
      prompt: `Convert binary  ${n.toString(2).padStart(bits, '0')}  to decimal:`,
      answer: String(n),
      hint: 'Each bit doubles: 1, 2, 4, 8 …',
    };
  },

  // Knock a sequence of ports on a safe-style rotary dial. Harder = more
  // ports in the sequence. Ports are kept in 1..9999.
  portKnock(difficulty) {
    const count = cfg(difficulty).knockPorts;
    const ports = Array.from({ length: count }, () => 1 + rand(9998));
    return {
      type: 'portKnock',
      prompt: `Knock these ports in order:  ${ports.join(' → ')}`,
      answer: ports.join('-'),
      hint: 'Dial each port on the safe, then knock it in sequence.',
      data: { ports }, // public: the dial UI needs the target sequence
    };
  },

  // Bitwise XOR of two numbers (answer in decimal). Harder = bigger operands.
  xor(difficulty) {
    const max = cfg(difficulty).xorMax;
    const a = rand(max);
    const b = rand(max);
    return {
      type: 'xor',
      prompt: `Compute  ${a} XOR ${b}  (decimal):`,
      answer: String(a ^ b),
      hint: 'Bits differ -> 1.',
    };
  },
};

const ALL_TYPES = Object.keys(generators);

// Normalize an answer for comparison: trim, lowercase, collapse spaces,
// strip a leading 0x on hex-ish answers.
function normalize(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/^0x/, '');
}

// Build a fresh challenge of a given type (or random if omitted) at the
// given difficulty (defaults to 'normal').
function makeChallenge(type, difficulty = 'normal') {
  const t = type && generators[type] ? type : pick(ALL_TYPES);
  const d = DIFFICULTIES.includes(difficulty) ? difficulty : 'normal';
  const c = generators[t](d);
  return {
    id: `${t}-${rand(1e9)}`,
    type: c.type,
    prompt: c.prompt,
    hint: c.hint,
    ...(c.data || {}), // public extras a custom UI needs (survives Room.safe)
    _answer: c.answer, // server-only, never sent to clients
  };
}

function checkAnswer(challenge, value) {
  return normalize(challenge._answer) === normalize(value);
}

module.exports = { makeChallenge, checkAnswer, ALL_TYPES, DIFFICULTIES, normalize };
