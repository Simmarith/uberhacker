import React, { useRef, useState } from 'react';

const KEYS = [
  ['C', '←', '%', '/'],
  ['7', '8', '9', '*'],
  ['4', '5', '6', '-'],
  ['1', '2', '3', '+'],
  ['0', '.', '='],
];

// Evaluate a flat "a op b op c" expression left-to-right with standard
// operator precedence. No eval(), tokenises the digit/operator string.
function compute(expr) {
  const tokens = expr.match(/(\d+\.?\d*|[+\-*/%])/g);
  if (!tokens || !tokens.length) return '';
  const nums = [];
  const ops = [];
  const prec = (o) => (o === '+' || o === '-' ? 1 : 2);
  const apply = () => {
    const b = nums.pop();
    const a = nums.pop();
    const op = ops.pop();
    if (op === '+') nums.push(a + b);
    else if (op === '-') nums.push(a - b);
    else if (op === '*') nums.push(a * b);
    else if (op === '/') nums.push(b === 0 ? NaN : a / b);
    else if (op === '%') nums.push(a % b);
  };
  for (const t of tokens) {
    if (/[+\-*/%]/.test(t)) {
      while (ops.length && prec(ops[ops.length - 1]) >= prec(t)) apply();
      ops.push(t);
    } else {
      nums.push(parseFloat(t));
    }
  }
  while (ops.length) apply();
  const r = nums[0];
  if (!isFinite(r) || isNaN(r)) return 'ERR';
  return String(Math.round(r * 1e10) / 1e10);
}

// A plain client-side calculator window. Same draggable chrome as the
// challenge windows, but talks to nothing — just local math.
export default function Calculator({ onClose }) {
  const [expr, setExpr] = useState('');
  const [xy, setXy] = useState({ x: 220, y: 120 });
  const drag = useRef(null);

  const press = (k) => {
    if (k === 'C') return setExpr('');
    if (k === '←') return setExpr((e) => e.slice(0, -1));
    if (k === '=') return setExpr((e) => compute(e));
    setExpr((e) => (e === 'ERR' ? k : e + k));
  };

  const onDown = (e) => {
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
    <div className="hackwindow calc" style={{ left: xy.x, top: xy.y, zIndex: 5000 }}>
      <div className="windowbar" onMouseDown={onDown}>
        <span className="dot r" onMouseDown={(e) => e.stopPropagation()} onClick={onClose} />
        <span className="dot y" /><span className="dot g" />
        <span className="wtitle">calc.exe</span>
      </div>
      <div className="windowbody calcbody">
        <div className="calc-display">{expr || '0'}</div>
        <div className="calc-keys">
          {KEYS.flat().map((k) => (
            <button
              key={k}
              className={`calc-key ${k === '0' ? 'wide' : ''} ${/[+\-*/%=]/.test(k) ? 'op' : ''}`}
              onClick={() => press(k)}
            >
              {k}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
