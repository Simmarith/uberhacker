import React, { useEffect, useState } from 'react';
import { socket } from '../socket';
import Window from './Window.jsx';

function Clock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return <span className="clock">{now.toTimeString().slice(0, 8)}</span>;
}

// The fake desktop: wallpaper, floating challenge windows, and a taskbar
// that doubles as the live scoreboard.
export default function Desktop({ room, you, isHost, windows, onFocus }) {
  const target = room.config?.targetScore;
  return (
    <div className="desktop">
      <div className="desktop-watermark">uberhacker_OS</div>

      <div className="windows">
        {windows.map((w) => (
          <Window key={w.id} win={w} onFocus={onFocus} />
        ))}
        {windows.length === 0 ? (
          <div className="desktop-idle">// loading challenges…</div>
        ) : null}
      </div>

      <footer className="taskbar">
        <span className="tb-brand glitch" data-text="uberhacker">uberhacker</span>
        <span className="tb-room">[{room.code}]</span>

        <div className="tb-scores">
          {room.players.map((p) => (
            <span key={p.id} className={`tb-player ${p.id === you ? 'me' : ''}`}>
              {p.isHost ? '★' : ''}{p.name}
              <b>{p.score}</b>
              {target ? <i>/{target}</i> : null}
            </span>
          ))}
        </div>

        {isHost ? (
          <button className="stopbtn" onClick={() => socket.emit('stop')}>abort</button>
        ) : null}
        <Clock />
      </footer>
    </div>
  );
}
