import React from 'react';

const TYPE_LABELS = {
  fastType: 'fast type',
  getNet: 'network addr',
  broadcast: 'broadcast addr',
  hexToDec: 'hex → dec',
  decToHex: 'dec → hex',
  binToDec: 'bin → dec',
  xor: 'bitwise xor',
};

export function typeLabel(t) {
  return TYPE_LABELS[t] || t;
}

export default function Scoreboard({ players, you, target }) {
  return (
    <div className="scoreboard">
      <div className="scoreboard-head">
        <span>players</span>
        {target ? <span>first to {target}</span> : null}
      </div>
      <ul>
        {players.map((p) => (
          <li key={p.id} className={p.id === you ? 'me' : ''}>
            <span className="pname">
              {p.isHost ? '★ ' : ''}
              {p.name}
              {p.id === you ? ' (you)' : ''}
            </span>
            <span className="pscore">{p.score}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
