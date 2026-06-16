import React, { useState } from 'react';
import { socket } from '../socket';
import Scoreboard, { typeLabel } from './Scoreboard.jsx';
import Chat from './Chat.jsx';
import { disabledByDefault } from '../config';

export default function Lobby({ room, you, isHost, types, difficulties, messages, onChat }) {
  const [target, setTarget] = useState(room.config?.targetScore || 5);
  const [concurrent, setConcurrent] = useState(room.config?.concurrent || 3);
  const [difficulty, setDifficulty] = useState(room.config?.difficulty || 'normal');
  const [selected, setSelected] = useState(
    () =>
      new Set((room.config?.types || types).filter((t) => !disabledByDefault.has(t)))
  );

  const toggle = (t) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  };

  const start = () => {
    const chosen = [...selected];
    socket.emit('start', {
      targetScore: target,
      concurrent,
      difficulty,
      types: chosen.length ? chosen : types,
    });
  };

  const isOver = room.state === 'over';

  return (
    <div className="screen">
      <header className="topbar">
        <div className="logo small glitch" data-text="uberhacker">uberhacker</div>
        <div className="roomcode">gameroom: <b>{room.code}</b></div>
      </header>

      <div className="layout">
        <main className="panel">
          {isOver && room.winner ? (
            <div className="winner">
              <h2>🏆 {room.winner.name} wins!</h2>
              <p>{room.winner.score} points</p>
            </div>
          ) : (
            <h2>waiting in the lobby</h2>
          )}

          {isHost ? (
            <div className="hostctrl">
              <label className="inline">
                <span>first to</span>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                />
                <span>points</span>
              </label>

              <label className="inline">
                <span>windows open</span>
                <input
                  type="number"
                  min="1"
                  max="6"
                  value={concurrent}
                  onChange={(e) => setConcurrent(e.target.value)}
                />
                <span>at once</span>
              </label>

              <label className="inline">
                <span>difficulty</span>
              </label>
              <div className="typegrid">
                {difficulties.map((d) => (
                  <button
                    key={d}
                    className={`chip ${difficulty === d ? 'on' : ''}`}
                    onClick={() => setDifficulty(d)}
                    type="button"
                  >
                    {d}
                  </button>
                ))}
              </div>

              <div className="typegrid">
                {types.map((t) => (
                  <button
                    key={t}
                    className={`chip ${selected.has(t) ? 'on' : ''}`}
                    onClick={() => toggle(t)}
                    type="button"
                  >
                    {typeLabel(t)}
                  </button>
                ))}
              </div>

              <label className="inline">
                <span>visibility</span>
                <button
                  className={`chip ${room.public ? 'on' : ''}`}
                  onClick={() => socket.emit('setPublic', { public: !room.public })}
                  type="button"
                >
                  {room.public ? 'public — listed on login' : 'private'}
                </button>
              </label>

              <button className="big" onClick={start} type="button">
                &gt; {isOver ? 'play again' : 'start game'}
              </button>
            </div>
          ) : (
            <p className="hint">waiting for the host (★) to start the game…</p>
          )}
        </main>

        <aside>
          <Scoreboard players={room.players} you={you} target={room.config?.targetScore} />
          <Chat mode="lobby" messages={messages} onSend={onChat} you={you} />
        </aside>
      </div>
    </div>
  );
}
