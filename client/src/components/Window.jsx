import React, { useEffect, useRef, useState } from 'react';
import { socket } from '../socket';
import { typeLabel } from './Scoreboard.jsx';

// A single draggable challenge window in the fake desktop.
export default function Window({ win, onFocus }) {
  const { id, challenge, pos, z, solved } = win;
  const [value, setValue] = useState('');
  const [shake, setShake] = useState(false);
  const [xy, setXy] = useState(pos);
  const inputRef = useRef(null);
  const rootRef = useRef(null);
  const drag = useRef(null);

  // Once rendered we know the real size; nudge back in if any edge clips off-screen.
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const TASKBAR = 48;
    const maxX = Math.max(0, window.innerWidth - el.offsetWidth);
    const maxY = Math.max(0, window.innerHeight - el.offsetHeight - TASKBAR);
    setXy((p) => {
      const x = Math.min(Math.max(0, p.x), maxX);
      const y = Math.min(Math.max(0, p.y), maxY);
      return x === p.x && y === p.y ? p : { x, y };
    });
  }, []);

  useEffect(() => {
    if (solved || !inputRef.current) return;
    // Don't rip focus away if the user is already typing in another input.
    const active = document.activeElement;
    if (active && active !== inputRef.current && active.tagName === 'INPUT') return;
    inputRef.current.focus();
  }, [solved]);

  const submit = (e) => {
    e.preventDefault();
    if (solved || !value.trim()) return;
    socket.emit('answer', { challengeId: id, value }, (res) => {
      if (res && res.result === 'wrong') {
        setShake(true);
        setTimeout(() => setShake(false), 400);
        setValue('');
      }
    });
  };

  // ---- dragging via the title bar ----
  const onDown = (e) => {
    onFocus(id);
    drag.current = { dx: e.clientX - xy.x, dy: e.clientY - xy.y };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };
  const onMove = (e) => {
    if (!drag.current) return;
    setXy({
      x: Math.max(0, e.clientX - drag.current.dx),
      y: Math.max(0, e.clientY - drag.current.dy),
    });
  };
  const onUp = () => {
    drag.current = null;
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onUp);
  };

  return (
    <div
      ref={rootRef}
      className={`hackwindow ${shake ? 'shake' : ''} ${solved ? 'solved' : ''}`}
      style={{ left: xy.x, top: xy.y, zIndex: z }}
      onMouseDown={() => onFocus(id)}
    >
      <div className="windowbar" onMouseDown={onDown}>
        <span className="dot r" /><span className="dot y" /><span className="dot g" />
        <span className="wtitle">CHALLENGE :: {typeLabel(challenge.type)}</span>
      </div>

      {solved ? (
        <div className="windowbody result">
          <h2 className={solved.youWon ? 'good' : 'bad'}>
            {solved.youWon ? 'you got it!' : `${solved.winnerName} solved it`}
          </h2>
          <p>answer: <code>{solved.answer}</code></p>
        </div>
      ) : (
        <div className="windowbody">
          <p className="prompt">{challenge.prompt}</p>
          <form onSubmit={submit}>
            <span className="caret">&gt;</span>
            <input
              ref={inputRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="answer + enter"
            />
          </form>
          <p className="hintline">// {challenge.hint}</p>
        </div>
      )}
    </div>
  );
}
