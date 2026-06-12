import React, { useEffect, useRef, useState } from 'react';

const KEYS = [
  ['C', '←', '%', '/'],
  ['7', '8', '9', '*'],
  ['4', '5', '6', '-'],
  ['1', '2', '3', '+'],
  ['0', '.', '='],
];

// Logical navigation grid. '0' spans two columns in the layout, so it
// occupies two cells here; every other value is unique, which lets us
// match the selected button by value alone.
const GRID = [
  ['C', '←', '%', '/'],
  ['7', '8', '9', '*'],
  ['4', '5', '6', '-'],
  ['1', '2', '3', '+'],
  ['0', '0', '.', '='],
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
  const [focused, setFocused] = useState(false);
  // 'select' = arrow-key navigation; 'keyboard' = direct typing.
  const [mode, setMode] = useState('select');
  const [sel, setSel] = useState({ r: 1, c: 0 });
  const drag = useRef(null);
  const winRef = useRef(null);

  useEffect(() => {
    winRef.current?.focus();
  }, []);

  const press = (k) => {
    if (k === 'C') return setExpr('');
    if (k === '←') return setExpr((e) => e.slice(0, -1));
    if (k === '=') return setExpr((e) => compute(e));
    setExpr((e) => (e === 'ERR' ? k : e + k));
  };

  // Clicking a key acts on it and returns to "selecting keys" mode,
  // moving the selection to the clicked key.
  const clickKey = (k) => {
    const found = findCell(k);
    if (found) setSel(found);
    setMode('select');
    press(k);
    winRef.current?.focus();
  };

  const findCell = (k) => {
    for (let r = 0; r < GRID.length; r++) {
      const c = GRID[r].indexOf(k);
      if (c !== -1) return { r, c };
    }
    return null;
  };

  const move = (s, dir) => {
    let { r, c } = s;
    if (dir === 'ArrowUp') r = Math.max(0, r - 1);
    else if (dir === 'ArrowDown') r = Math.min(GRID.length - 1, r + 1);
    else if (dir === 'ArrowLeft') c = Math.max(0, c - 1);
    else if (dir === 'ArrowRight') c = Math.min(GRID[0].length - 1, c + 1);
    return { r, c };
  };

  const onKeyDown = (e) => {
    const k = e.key;
    if (k === 'ArrowUp' || k === 'ArrowDown' || k === 'ArrowLeft' || k === 'ArrowRight') {
      e.preventDefault();
      setMode('select');
      setSel((s) => move(s, k));
      return;
    }
    if (k === 'Enter') {
      e.preventDefault();
      // Select mode: activate the highlighted key. Keyboard mode: compute.
      if (mode === 'select') return press(GRID[sel.r][sel.c]);
      return press('=');
    }
    if (k === '=') {
      e.preventDefault();
      return press('=');
    }
    if (k === 'Backspace') {
      e.preventDefault();
      setMode('keyboard');
      return press('←');
    }
    if (k === 'Escape') {
      e.preventDefault();
      return winRef.current?.blur();
    }
    if (k === 'c' || k === 'C' || k === 'Delete') {
      e.preventDefault();
      setMode('keyboard');
      return press('C');
    }
    if (/^[0-9]$/.test(k) || '+-*/%.'.includes(k)) {
      e.preventDefault();
      setMode('keyboard');
      return press(k);
    }
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

  const selKey = GRID[sel.r][sel.c];
  const showSel = focused && mode === 'select';

  return (
    <div
      ref={winRef}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      className={`hackwindow calc ${focused ? 'focused' : ''}`}
      style={{ left: xy.x, top: xy.y, zIndex: 5000 }}
    >
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
              tabIndex={-1}
              className={`calc-key ${k === '0' ? 'wide' : ''} ${/[+\-*/%=]/.test(k) ? 'op' : ''} ${
                showSel && k === selKey ? 'selected' : ''
              }`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => clickKey(k)}
            >
              {k}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
