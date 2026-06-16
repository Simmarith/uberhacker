import React, { useState } from 'react';

export default function Join({ onJoin, publicRooms = [] }) {
  const [name, setName] = useState('');
  const [room, setRoom] = useState('');

  const submit = (e) => {
    e.preventDefault();
    if (!name.trim() || !room.trim()) return;
    onJoin(room, name);
  };

  return (
    <div className="screen center">
      <div className="logo glitch" data-text="uberhacker">
        uberhacker
      </div>
      <p className="tagline">// look like the hackers on TV. race your friends.</p>

      <form className="panel" onSubmit={submit}>
        <label>
          <span>handle</span>
          <input
            autoFocus
            value={name}
            maxLength={20}
            placeholder="n30_ph34k"
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label>
          <span>gameroom</span>
          <input
            value={room}
            maxLength={8}
            placeholder="LOBBY1"
            onChange={(e) => setRoom(e.target.value.toUpperCase())}
          />
        </label>
        <button type="submit">&gt; connect</button>
      </form>

      {publicRooms.length > 0 && (
        <div className="panel publicrooms">
          <span className="publictitle">// public lobbies</span>
          <div className="typegrid">
            {publicRooms.map((r) => (
              <button
                key={r.code}
                type="button"
                className={`chip ${room === r.code ? 'on' : ''}`}
                onClick={() => setRoom(r.code)}
              >
                {r.code} ({r.players})
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="hint">share the gameroom name with friends to play together.</p>
    </div>
  );
}
