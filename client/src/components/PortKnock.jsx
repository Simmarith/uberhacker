import React, { useEffect, useRef, useState } from 'react';

// Ports run 1..9999; the dial wraps modulo 10000. One full rotation moves the
// value by PER_TURN, so reaching a 4-digit port takes several spins.
const SLOTS = 10000;
const PER_TURN = 1000;

// A safe-style rotary dial. The player reproduces a target sequence of ports
// by dialling each one and "knocking" it. Spin the dial (drag in circles, as
// many turns as needed) for coarse movement, fine-tune with the +/- buttons,
// arrow keys, or the scroll wheel.
export default function PortKnock({ challenge, onAnswer }) {
  const targets = challenge.ports || [];
  const [value, setValue] = useState(0);
  const [knocked, setKnocked] = useState([]);
  const rootRef = useRef(null);
  const dialRef = useRef(null);
  const dragging = useRef(false);
  const lastAng = useRef(0); // pointer angle at the previous drag sample
  const acc = useRef(0); // fractional accumulated value while dragging

  useEffect(() => {
    rootRef.current?.focus();
  }, []);

  // Pointer angle around the dial centre: 0 at the top, clockwise, in degrees.
  const pointerAngle = (e) => {
    const el = dialRef.current;
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    return ((Math.atan2(e.clientY - cy, e.clientX - cx) * 180) / Math.PI + 90 + 360) % 360;
  };

  const onMove = (e) => {
    if (!dragging.current) return;
    const ang = pointerAngle(e);
    // Shortest signed delta so crossing the 0/360 seam doesn't jump a turn.
    let delta = ang - lastAng.current;
    if (delta > 180) delta -= 360;
    else if (delta < -180) delta += 360;
    lastAng.current = ang;
    acc.current = (acc.current + (delta / 360) * PER_TURN + SLOTS) % SLOTS;
    setValue(Math.round(acc.current));
  };
  const onUp = () => {
    dragging.current = false;
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onUp);
  };
  const onDown = (e) => {
    e.preventDefault();
    rootRef.current?.focus();
    dragging.current = true;
    lastAng.current = pointerAngle(e);
    acc.current = value;
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const nudge = (d) =>
    setValue((v) => {
      const next = (v + d + SLOTS) % SLOTS;
      acc.current = next;
      return next;
    });
  const onWheel = (e) => {
    e.preventDefault();
    nudge(e.deltaY > 0 ? -1 : 1);
  };

  const knock = () => {
    const next = [...knocked, value];
    setKnocked(next);
    if (next.length >= targets.length) {
      // Wrong answer resets the sequence so the player can start over.
      onAnswer(next.join('-'), () => setKnocked([]));
    }
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
      e.preventDefault();
      nudge(e.shiftKey ? 10 : 1);
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
      e.preventDefault();
      nudge(e.shiftKey ? -10 : -1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      knock();
    } else if (e.key === 'Backspace') {
      e.preventDefault();
      setKnocked((k) => k.slice(0, -1));
    }
  };

  const done = knocked.length;
  const angle = ((value % PER_TURN) / PER_TURN) * 360;

  return (
    <div className="portknock" ref={rootRef} tabIndex={0} onKeyDown={onKeyDown}>
      <div className="pk-targets">
        {targets.map((p, i) => (
          <span
            key={i}
            className={`pk-target ${i < done ? 'hit' : ''} ${i === done ? 'next' : ''}`}
          >
            {p}
          </span>
        ))}
      </div>

      <div className="pk-dial" ref={dialRef} onMouseDown={onDown} onWheel={onWheel}>
        {Array.from({ length: 10 }, (_, i) => (
          <span key={i} className="pk-tick" style={{ transform: `rotate(${i * 36}deg)` }} />
        ))}
        <span className="pk-pointer" style={{ transform: `rotate(${angle}deg)` }} />
        <span className="pk-readout">{value}</span>
      </div>

      <div className="pk-controls">
        <button type="button" className="pk-step" onMouseDown={(e) => e.preventDefault()} onClick={() => nudge(-1)}>−</button>
        <button type="button" className="pk-knock op" onMouseDown={(e) => e.preventDefault()} onClick={knock}>▸ knock</button>
        <button type="button" className="pk-step" onMouseDown={(e) => e.preventDefault()} onClick={() => nudge(1)}>+</button>
      </div>

      <div className="pk-meta">
        <span>port {Math.min(done + 1, targets.length)} / {targets.length}</span>
        <button type="button" className="pk-reset" onClick={() => setKnocked([])} disabled={!done}>reset</button>
      </div>
    </div>
  );
}
