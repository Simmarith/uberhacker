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

// Hacker-flavoured commit subjects for the Git Re-Parent challenge.
const COMMIT_MSGS = [
  'init repo', 'add auth middleware', 'fix off-by-one', 'refactor parser',
  'patch buffer overflow', 'bump deps', 'wire up sockets', 'inject payload',
  'spoof headers', 'rotate keys', 'cache busting', 'handle edge case',
  'silence linter', 'add rootkit hook', 'tune firewall rules', 'seed rng',
  'harden tls', 'drop privileges', 'flush dns', 'fork daemon',
];

const HEX = '0123456789abcdef';

function randSha(len) {
  let s = '';
  for (let i = 0; i < len; i++) s += HEX[rand(15)];
  return s;
}

const WORD_POOL = [
  'override', 'mainframe', 'firewall', 'payload', 'kernel', 'exploit',
  'backdoor', 'sudo', 'packet', 'subnet', 'daemon', 'cipher', 'rootkit',
  'buffer', 'inject', 'spoof', 'proxy', 'handshake', 'bytecode', 'token',
];

// Per-difficulty knobs for each generator. `easy` is the gentlest, `hard`
// the toughest; `normal` sits in the middle and matches the old behaviour.
const DIFFICULTIES = ['easy', 'normal', 'hard'];

const DIFFICULTY_CONFIG = {
  easy: { words: 1, cidrs: [8, 16, 24], maxNum: 15, bits: 4, xorMax: 15, knockPorts: 1, knockOffset: 60, reparent: { commits: 5, prefix: 7 }, choices: 3, hashPrefix: 5 },
  normal: { words: 2, cidrs: [8, 16, 24], maxNum: 255, bits: 8, xorMax: 255, knockPorts: 2, knockOffset: 250, reparent: { commits: 8, prefix: 10 }, choices: 4, hashPrefix: 7 },
  hard: { words: 4, cidrs: [12, 18, 20, 26, 28, 30], maxNum: 4095, bits: 12, xorMax: 4095, knockPorts: 4, knockOffset: 900, reparent: { commits: 15, prefix: 12 }, choices: 5, hashPrefix: 10 },
};

function cfg(difficulty, overrides = {}) {
  const base = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.normal;
  return { ...base, ...overrides, reparent: { ...base.reparent, ...(overrides.reparent || {}) } };
}

const generators = {
  // Type the word(s) as fast as you can. Harder = more words.
  fastType(difficulty, settings) {
    const count = cfg(difficulty, settings).words;
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
  getNet(difficulty, settings) {
    const ip = randIp();
    const cidr = pick(cfg(difficulty, settings).cidrs);
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
  broadcast(difficulty, settings) {
    const ip = randIp();
    const cidr = pick(cfg(difficulty, settings).cidrs);
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
  hexToDec(difficulty, settings) {
    const n = rand(cfg(difficulty, settings).maxNum);
    return {
      type: 'hexToDec',
      prompt: `Convert hex  0x${n.toString(16).toUpperCase()}  to decimal:`,
      answer: String(n),
      hint: 'A=10, B=11 … F=15.',
    };
  },

  // Decimal -> hex. Harder = bigger numbers.
  decToHex(difficulty, settings) {
    const n = rand(cfg(difficulty, settings).maxNum);
    return {
      type: 'decToHex',
      prompt: `Convert decimal  ${n}  to hex (no 0x prefix):`,
      answer: n.toString(16),
      hint: '10=A, 11=B … 15=F.',
    };
  },

  // Binary -> decimal. Harder = wider binary.
  binToDec(difficulty, settings) {
    const bits = cfg(difficulty, settings).bits;
    const n = rand(Math.pow(2, bits) - 1);
    return {
      type: 'binToDec',
      prompt: `Convert binary  ${n.toString(2).padStart(bits, '0')}  to decimal:`,
      answer: String(n),
      hint: 'Each bit doubles: 1, 2, 4, 8 …',
    };
  },

  // Knock a sequence of ports on a safe-style rotary dial. Harder = more
  // ports in the sequence, and the dial starts further from each target.
  // Ports are kept in 1..9999.
  portKnock(difficulty, settings) {
    const { knockPorts: count, knockOffset } = cfg(difficulty, settings);
    const ports = Array.from({ length: count }, () => 1 + rand(9998));
    return {
      type: 'portKnock',
      prompt: `Knock these ports in order:  ${ports.join(' → ')}`,
      answer: ports.join('-'),
      hint: 'Dial each port on the safe, then knock it in sequence.',
      // public: the dial UI needs the target sequence and the per-target start offset
      data: { ports, knockOffset },
    };
  },

  // Bitwise XOR of two numbers (answer in decimal). Harder = bigger operands.
  xor(difficulty, settings) {
    const max = cfg(difficulty, settings).xorMax;
    const a = rand(max);
    const b = rand(max);
    return {
      type: 'xor',
      prompt: `Compute  ${a} XOR ${b}  (decimal):`,
      answer: String(a ^ b),
      hint: 'Bits differ -> 1.',
    };
  },

  // A tiny commit chain; move HEAD to the commit whose SHA starts with the
  // given prefix. Harder = more commits and a longer prefix to match.
  gitReparent(difficulty, settings) {
    const { commits: n, prefix: plen } = cfg(difficulty, settings).reparent;
    const SHA_LEN = 10;
    const commits = [];
    const seenPrefix = new Set();
    for (let i = 0; i < n; i++) {
      let sha;
      // Keep prefixes distinct so exactly one commit matches the target.
      do {
        sha = randSha(SHA_LEN);
      } while (seenPrefix.has(sha.slice(0, plen)));
      seenPrefix.add(sha.slice(0, plen));
      commits.push({ sha, message: pick(COMMIT_MSGS) });
    }
    const target = commits[rand(n - 1)];
    const prefix = target.sha.slice(0, plen);
    return {
      type: 'gitReparent',
      prompt: `Move HEAD to the commit whose SHA starts with  ${prefix}`,
      answer: target.sha,
      hint: 'Drag the HEAD pointer onto the matching commit.',
      data: { commits, prefix }, // public: the graph UI needs the commit list
    };
  },

  // Spot the spoofed sender. Harder = more subtle typos in the domain.
  phishHunter(difficulty, settings) {
    const tier = difficulty === 'easy' ? 'easy' : difficulty === 'hard' ? 'hard' : 'normal';
    const set = pick(PHISH_SETS.filter((entry) => entry.tier === tier));
    const legitEmail = `${pick(FIRST_NAMES)}${set.legit}`;
    const phishEmail = `${pick(FIRST_NAMES)}${set.phish}`;
    const role = pick(['IT', 'HR', 'Security', 'Support']);
    return {
      type: 'phishHunter',
      prompt: 'Which email is suspicious? Click it!',
      answer: phishEmail,
      hint: `The message claims to be from the ${role} team. Look closely at the sender's domain name.`,
      data: {
        legitEmail,
        phishEmail,
        legitName: `${set.brand} ${role}`,
        phishName: `${set.brand} ${role}`,
        subject: pick(['Password reset required', 'Unusual sign-in detected', 'Security review needed']),
      },
    };
  },

  // Inspect packet metadata and click the one leaking data to a hostile host.
  packetSniffer(difficulty, settings) {
    const count = cfg(difficulty, settings).choices;
    const normal = [
      ['10.0.0.12', '10.0.0.1', 'DNS', 'query api.internal'],
      ['10.0.0.44', '10.0.0.8', 'HTTPS', 'GET /status'],
      ['10.0.0.16', '10.0.0.2', 'NTP', 'clock sync'],
      ['10.0.0.37', '10.0.0.9', 'SSH', 'key exchange'],
      ['10.0.0.25', '10.0.0.5', 'HTTPS', 'POST /metrics'],
      ['10.0.0.63', '10.0.0.7', 'SMTP', 'relay health check'],
    ];
    const incidents = [
      {
        prompt: 'Packet capture live. Which flow is exfiltrating data?',
        hint: 'Look for unexpected external destination and unusually large outbound transfer.',
        packet: (host) => ({ id: 'incident', src: host, dst: `${rand(199) + 20}.${rand(255)}.${rand(255)}.${rand(255)}`, protocol: 'HTTPS', detail: 'POST /archive.zip  •  48.2 MB' }),
      },
      {
        prompt: 'SOC alert: find the port scan before it maps your network.',
        hint: 'A scan hits many destination ports from one source in a short burst.',
        packet: (host) => ({ id: 'incident', src: `${rand(199) + 20}.${rand(255)}.${rand(255)}.${rand(255)}`, dst: host, protocol: 'TCP', detail: 'SYN ports 22, 80, 443, 3306' }),
      },
      {
        prompt: 'DNS telemetry flagged a tunnel. Which query should be blocked?',
        hint: 'Tunnels hide data in long, random-looking subdomains.',
        packet: (host) => ({ id: 'incident', src: host, dst: '10.0.0.1', protocol: 'DNS', detail: `${randSha(18)}.sync-check.net` }),
      },
      {
        prompt: 'Find the command-and-control beacon in this packet capture.',
        hint: 'Beacons often repeat at a fixed interval to an unknown public host.',
        packet: (host) => ({ id: 'incident', src: host, dst: `${rand(199) + 20}.${rand(255)}.${rand(255)}.${rand(255)}`, protocol: 'HTTPS', detail: 'POST /checkin  •  every 60s' }),
      },
    ];
    const incident = pick(incidents);
    const safePackets = [...normal].sort(() => Math.random() - 0.5).slice(0, count - 1);
    const packets = safePackets.map((p, i) => ({ id: `safe-${i}`, src: p[0], dst: p[1], protocol: p[2], detail: p[3], risk: 'clear' }));
    const bad = { ...incident.packet(`10.0.0.${50 + rand(180)}`), risk: 'incident' };
    packets.splice(rand(packets.length), 0, bad);
    return {
      type: 'packetSniffer',
      prompt: incident.prompt,
      answer: bad.id,
      hint: incident.hint,
      data: { packets },
    };
  },

  // Pick the least-privilege access policy for a deployment robot.
  accessControl(difficulty, settings) {
    const count = cfg(difficulty, settings).choices;
    const scenarios = [
      {
        prompt: 'Grant deploy-bot only access needed to ship releases. Choose policy.',
        hint: 'Use least privilege: enough permission for deploys, nothing more.',
        correct: { id: 'deploy', title: 'Deploy token', scope: 'production deploys', access: 'deploy only', tone: 'safe' },
        distractors: [
          { id: 'admin', title: 'Admin everywhere', scope: '*', access: 'read · write · delete', tone: 'danger' },
          { id: 'repo', title: 'Repository write', scope: 'all repositories', access: 'read · write', tone: 'danger' },
          { id: 'shell', title: 'Shell access', scope: 'production hosts', access: 'interactive shell', tone: 'danger' },
          { id: 'read', title: 'Read-only token', scope: 'production deploys', access: 'read only', tone: 'danger' },
        ],
      },
      {
        prompt: 'Give log-bot access needed to collect system logs. Choose policy.',
        hint: 'It needs read access to logs, not host control or secrets.',
        correct: { id: 'logs', title: 'Log reader', scope: '/var/log only', access: 'read only', tone: 'safe' },
        distractors: [
          { id: 'root', title: 'Root shell', scope: 'all production hosts', access: 'interactive shell', tone: 'danger' },
          { id: 'secrets', title: 'Secret manager', scope: 'all application secrets', access: 'read · write', tone: 'danger' },
          { id: 'write', title: 'Log editor', scope: '/var/log only', access: 'read · write', tone: 'danger' },
          { id: 'cluster', title: 'Cluster admin', scope: 'entire cluster', access: 'admin', tone: 'danger' },
        ],
      },
      {
        prompt: 'Give backup-bot only access needed to create database backups. Choose policy.',
        hint: 'Creating backups needs a database snapshot permission, not database writes.',
        correct: { id: 'snapshot', title: 'Snapshot role', scope: 'production database', access: 'backup only', tone: 'safe' },
        distractors: [
          { id: 'dbadmin', title: 'Database admin', scope: 'production database', access: 'read · write · delete', tone: 'danger' },
          { id: 'restore', title: 'Restore role', scope: 'production database', access: 'restore only', tone: 'danger' },
          { id: 'bucket', title: 'Storage admin', scope: 'all backup buckets', access: 'read · write · delete', tone: 'danger' },
          { id: 'readonly', title: 'Database reader', scope: 'production database', access: 'read only', tone: 'danger' },
        ],
      },
      {
        prompt: 'Give incident analyst access needed to investigate one alert. Choose policy.',
        hint: 'An investigation needs time-limited, read-only access to alert evidence.',
        correct: { id: 'case', title: 'Case investigator', scope: 'incident #4821', access: 'read only · 8 hours', tone: 'safe' },
        distractors: [
          { id: 'allcases', title: 'Global case admin', scope: 'every incident', access: 'read · write · delete', tone: 'danger' },
          { id: 'prod', title: 'Production shell', scope: 'all production hosts', access: 'interactive shell', tone: 'danger' },
          { id: 'permanent', title: 'Permanent analyst', scope: 'incident #4821', access: 'read only · no expiry', tone: 'danger' },
          { id: 'mutate', title: 'Case editor', scope: 'incident #4821', access: 'read · write', tone: 'danger' },
        ],
      },
    ];
    const scenario = pick(scenarios);
    const correct = scenario.correct;
    // Some rounds test scope separately from permission. These look tempting:
    // same action, but access reaches too broadly or the wrong environment.
    const scopeTraps = Math.random() < 0.5
      ? makeScopeTraps(correct, scenario.prompt)
      : [];
    const distractors = [
      ...scopeTraps,
      ...scenario.distractors
        .sort(() => Math.random() - 0.5)
        .slice(0, Math.max(0, count - 1 - scopeTraps.length)),
    ];
    const options = [...distractors, correct].sort(() => Math.random() - 0.5);
    return {
      type: 'accessControl',
      prompt: scenario.prompt,
      answer: correct.id,
      hint: scenario.hint,
      data: { options },
    };
  },

  // Match a signed artifact against its short SHA-256 fingerprint.
  hashHunt(difficulty, settings) {
    const count = cfg(difficulty, settings).choices;
    const prefix = randSha(cfg(difficulty, settings).hashPrefix);
    const correct = { id: 'verified', digest: `${prefix}${randSha(64 - prefix.length)}` };
    const options = [correct];
    while (options.length < count) {
      let digest;
      do { digest = randSha(64); } while (digest.startsWith(prefix));
      options.push({ id: `candidate-${options.length}`, digest });
    }
    options.sort(() => Math.random() - 0.5);
    return {
      type: 'hashHunt',
      prompt: `Verify release fingerprint. Select SHA-256 starting with  ${prefix}`,
      answer: correct.id,
      hint: 'Only one digest begins with every fingerprint character.',
      data: { options, prefix },
    };
  },
};

const PHISH_SETS = [
  { tier: 'easy', brand: 'PayPal', legit: '@paypal.com', phish: '@paypal-alerts.net' },
  { tier: 'easy', brand: 'Google', legit: '@google.com', phish: '@google-login.org' },
  { tier: 'easy', brand: 'Microsoft', legit: '@microsoft.com', phish: '@microsoft-support.net' },
  { tier: 'normal', brand: 'Amazon', legit: '@amazon.com', phish: '@amaz0n.com' },
  { tier: 'normal', brand: 'Apple', legit: '@apple.com', phish: '@app1e.com' },
  { tier: 'normal', brand: 'Netflix', legit: '@netflix.com', phish: '@netf1ix.com' },
  { tier: 'hard', brand: 'LinkedIn', legit: '@linkedin.com', phish: '@linkedin-secure.com' },
  { tier: 'hard', brand: 'Spotify', legit: '@spotify.com', phish: '@spotify-account.com' },
  { tier: 'hard', brand: 'Facebook', legit: '@facebook.com', phish: '@facebook-verify.com' },
];

const FIRST_NAMES = [
  'jessica', 'michael', 'sarah', 'david', 'emily',
  'james', 'lisa', 'robert', 'amanda', 'thomas',
];

function makeScopeTraps(correct, prompt) {
  const isIncident = prompt.includes('incident analyst');
  const isLogs = prompt.includes('log-bot');
  const isBackup = prompt.includes('backup-bot');
  const label = correct.title;
  const action = correct.access;
  if (isIncident) {
    return [
      { id: 'scope-all-incidents', title: label, scope: 'all incidents', access: action, tone: 'danger' },
      { id: 'scope-wrong-case', title: label, scope: 'incident #4819', access: action, tone: 'danger' },
    ];
  }
  if (isLogs) {
    return [
      { id: 'scope-all-hosts', title: label, scope: 'all host files', access: action, tone: 'danger' },
      { id: 'scope-prod-secrets', title: label, scope: '/run/secrets', access: action, tone: 'danger' },
    ];
  }
  if (isBackup) {
    return [
      { id: 'scope-all-databases', title: label, scope: 'all production databases', access: action, tone: 'danger' },
      { id: 'scope-staging-db', title: label, scope: 'staging database', access: action, tone: 'danger' },
    ];
  }
  return [
    { id: 'scope-all-environments', title: label, scope: 'all environments', access: action, tone: 'danger' },
    { id: 'scope-staging', title: label, scope: 'staging deploys', access: action, tone: 'danger' },
  ];
}

// Base conversions are one game in the rotation. Its enabled directions are
// configured separately, so three conversion variants do not triple its odds.
const CONVERSION_TYPES = ['hexToDec', 'decToHex', 'binToDec'];
const ALL_TYPES = [...Object.keys(generators).filter((type) => !CONVERSION_TYPES.includes(type)), 'convert'];

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
function makeChallenge(type, difficulty = 'normal', conversionTypes = CONVERSION_TYPES, settings = {}) {
  const t = type && ALL_TYPES.includes(type) ? type : pick(ALL_TYPES);
  const d = DIFFICULTIES.includes(difficulty) ? difficulty : 'normal';
  const enabledConversions = conversionTypes.filter((conversion) => CONVERSION_TYPES.includes(conversion));
  const c = t === 'convert'
    ? generators[pick(enabledConversions.length ? enabledConversions : CONVERSION_TYPES)](d, settings)
    : generators[t](d, settings);
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

module.exports = { makeChallenge, checkAnswer, ALL_TYPES, CONVERSION_TYPES, DIFFICULTIES, normalize };
