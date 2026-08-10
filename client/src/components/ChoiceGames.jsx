import React, { useState } from 'react';

function useChoice(onAnswer) {
  const [picked, setPicked] = useState(null);
  const choose = (id) => {
    if (picked) return;
    setPicked(id);
    setTimeout(() => onAnswer(id, () => setPicked(null)), 350);
  };
  return [picked, choose];
}

export function PacketSniffer({ challenge, onAnswer }) {
  const [picked, choose] = useChoice(onAnswer);
  return (
    <div className="packet-sniffer" role="list" aria-label="Captured packets">
      <div className="packet-head"><span>FLOW</span><span>PROTOCOL</span><span>PAYLOAD</span></div>
      {challenge.packets.map((packet) => (
        <button
          className={`packet-row ${picked === packet.id ? 'picked' : ''}`}
          key={packet.id}
          onClick={() => choose(packet.id)}
          type="button"
        >
          <span className="packet-flow">{packet.src} <b>›</b> {packet.dst}</span>
          <span className="packet-protocol">{packet.protocol}</span>
          <span className="packet-detail">{packet.detail}</span>
        </button>
      ))}
    </div>
  );
}

export function AccessControl({ challenge, onAnswer }) {
  const [picked, choose] = useChoice(onAnswer);
  return (
    <div className="access-control">
      {challenge.options.map((option) => (
        <button
          className={`policy-card ${option.tone} ${picked === option.id ? 'picked' : ''}`}
          key={option.id}
          onClick={() => choose(option.id)}
          type="button"
        >
          <span className="policy-title">{option.title}</span>
          <span><i>scope</i> {option.scope}</span>
          <span><i>access</i> {option.access}</span>
        </button>
      ))}
    </div>
  );
}

export function HashHunt({ challenge, onAnswer }) {
  const [picked, choose] = useChoice(onAnswer);
  return (
    <div className="hash-hunt">
      <div className="hash-target">expected prefix <b>{challenge.prefix}</b></div>
      {challenge.options.map((option) => (
        <button
          className={`hash-option ${picked === option.id ? 'picked' : ''}`}
          key={option.id}
          onClick={() => choose(option.id)}
          type="button"
        >
          <span className="hash-mark">SHA-256</span>
          <code>{option.digest}</code>
        </button>
      ))}
    </div>
  );
}
