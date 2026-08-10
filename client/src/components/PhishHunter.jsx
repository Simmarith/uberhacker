import React, { useMemo, useState } from 'react';

export default function PhishHunter({ challenge, onAnswer }) {
  const { legitEmail, phishEmail, legitName, phishName } = challenge;

  // Keep order stable while feedback renders; changing it after click is jarring.
  const shuffled = useMemo(() => (Math.random() < 0.5
    ? [{ name: legitName, email: legitEmail }, { name: phishName, email: phishEmail }]
    : [{ name: phishName, email: phishEmail }, { name: legitName, email: legitEmail }]), [legitEmail, phishEmail, legitName, phishName]);

  const [state, setState] = useState('waiting'); // waiting | correct | wrong

  const onClick = (email) => {
    if (state !== 'waiting') return;
    const isPhish = email === phishEmail;
    setState(isPhish ? 'correct' : 'wrong');
    setTimeout(() => onAnswer(email, () => setState('waiting')), 800);
  };

  return (
    <div className="phish-hunter">
      <div className="mail-preview">
        <div className="mail-preview-top"><span>INBOX / SECURITY REVIEW</span><span className="mail-unread">UNREAD</span></div>
        <div className="mail-subject">{challenge.subject || 'Account security review'}</div>
        <p>Choose sender address you would report before opening this message.</p>
      </div>
      <div className="phish-boxes">
        {shuffled.map((s, i) => (
          <button
            key={i}
            className={`phish-sender ${state === 'waiting' ? 'clickable' : ''} ${
              state !== 'waiting' && s.email === phishEmail ? 'correct' : ''
            } ${
              state !== 'waiting' && s.email === legitEmail ? 'wrong' : ''
            }`}
            onClick={() => onClick(s.email)}
            type="button"
          >
            <span className="phish-label">From</span>
            <span className="phish-display">{s.name}</span>
            <span className="phish-email">&lt;{s.email}&gt;</span>
          </button>
        ))}
      </div>
      {state === 'wrong' && (
        <p className="phish-feedback wrong">Not that one — check the domain carefully!</p>
      )}
      {state === 'correct' && (
        <p className="phish-feedback correct">Nice catch! That's the spoofed address.</p>
      )}
    </div>
  );
}
