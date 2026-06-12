import React, { useEffect, useRef, useState } from 'react';

// Shared chat used in both the lobby and the live game.
//   mode="lobby" → docked panel in the lobby sidebar
//   mode="game"  → floating, draggable, collapsible window in the corner
export default function Chat({ messages, onSend, you, mode }) {
  const [text, setText] = useState('');
  const [open, setOpen] = useState(true); // game mode: expanded vs minimized
  const [unread, setUnread] = useState(0);
  const [xy, setXy] = useState(null); // game mode: null until first measured
  const logRef = useRef(null);
  const rootRef = useRef(null);
  const drag = useRef(null);
  const lastSeen = useRef(messages.length);

  const isGame = mode === 'game';

  // Park the window in the bottom-right corner once we know its size.
  useEffect(() => {
    if (!isGame || xy || !rootRef.current) return;
    const el = rootRef.current;
    const TASKBAR = 52;
    setXy({
      x: Math.max(0, window.innerWidth - el.offsetWidth - 16),
      y: Math.max(0, window.innerHeight - el.offsetHeight - TASKBAR - 8),
    });
  }, [isGame, xy, open]);

  // Stick to the bottom as messages arrive (when the log is visible).
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [messages, open]);

  // Track unread count while a game-mode window is minimized.
  useEffect(() => {
    if (isGame && !open) {
      const added = messages.length - lastSeen.current;
      if (added > 0) setUnread((u) => u + added);
    } else {
      setUnread(0);
    }
    lastSeen.current = messages.length;
  }, [messages, open, isGame]);

  const submit = (e) => {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    onSend(t);
    setText('');
  };

  // ---- dragging (game mode only) ----
  const onDown = (e) => {
    if (!isGame) return;
    const base = xy || { x: 0, y: 0 };
    drag.current = { dx: e.clientX - base.x, dy: e.clientY - base.y };
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

  const log = (
    <div className="chat-log" ref={logRef}>
      {messages.length === 0 ? (
        <div className="chat-empty">// no messages yet</div>
      ) : (
        messages.map((m) =>
          m.system ? (
            <div key={m.id} className="chat-msg system">// {m.text}</div>
          ) : (
            <div key={m.id} className={`chat-msg ${m.senderId === you ? 'me' : ''}`}>
              <span className="chat-name">{m.name}:</span>
              <span className="chat-text">{m.text}</span>
            </div>
          )
        )
      )}
    </div>
  );

  const form = (
    <form className="chat-form" onSubmit={submit}>
      <span className="caret">&gt;</span>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="say something + enter"
        maxLength={280}
      />
    </form>
  );

  if (!isGame) {
    return (
      <div className="chat docked">
        <div className="chat-head">team chat</div>
        {log}
        {form}
      </div>
    );
  }

  // ---- game mode: floating window ----
  return (
    <div
      ref={rootRef}
      className="hackwindow chat-window"
      style={{
        left: xy ? xy.x : undefined,
        top: xy ? xy.y : undefined,
        right: xy ? undefined : 16,
        bottom: xy ? undefined : 60,
        zIndex: 6000,
      }}
    >
      <div className="windowbar" onMouseDown={onDown}>
        <span
          className="dot g"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={() => setOpen((o) => !o)}
          title={open ? 'minimize' : 'open'}
          style={{ cursor: 'pointer' }}
        />
        <span className="dot y" /><span className="dot r" />
        <span className="wtitle">chat.log{!open && unread ? ` (${unread})` : ''}</span>
        <button
          type="button"
          className="chat-toggle"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? '–' : '+'}
        </button>
      </div>
      {open ? (
        <div className="windowbody chatbody">
          {log}
          {form}
        </div>
      ) : null}
    </div>
  );
}
