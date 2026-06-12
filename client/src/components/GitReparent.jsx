import React, { useRef, useState } from 'react';

// A tiny commit chain (oldest first in `commits`). The player drags the HEAD
// pointer onto the commit whose SHA starts with the target prefix. Releasing
// HEAD over a commit submits that commit's full SHA as the answer.
export default function GitReparent({ challenge, onAnswer }) {
  const commits = challenge.commits || [];
  const prefix = challenge.prefix || '';
  const plen = prefix.length;

  const [headIdx, setHeadIdx] = useState(commits.length - 1); // starts at tip
  const [drag, setDrag] = useState(null); // {x, y} pointer pos while dragging
  const nodeRefs = useRef([]);

  const startDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const move = (ev) => setDrag({ x: ev.clientX, y: ev.clientY });
    const up = (ev) => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      setDrag(null);
      // Hit-test the commit rows; drop assigns HEAD and submits that SHA.
      const hit = nodeRefs.current.findIndex((el) => {
        if (!el) return false;
        const r = el.getBoundingClientRect();
        return ev.clientX >= r.left && ev.clientX <= r.right &&
          ev.clientY >= r.top && ev.clientY <= r.bottom;
      });
      if (hit >= 0) {
        setHeadIdx(hit);
        onAnswer(commits[hit].sha);
      }
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    setDrag({ x: e.clientX, y: e.clientY });
  };

  // Render tip (latest) at the top, root at the bottom.
  const order = commits.map((_, i) => i).reverse();

  return (
    <div className="reparent">
      <div className="gr-graph">
        {order.map((i) => {
          const c = commits[i];
          const isHead = i === headIdx;
          return (
            <div
              key={c.sha}
              ref={(el) => (nodeRefs.current[i] = el)}
              className={`gr-row ${isHead ? 'head' : ''} ${drag ? 'live' : ''}`}
            >
              <span className="gr-node" />
              <span className="gr-sha">
                <b className="gr-prefix">{c.sha.slice(0, plen)}</b>{c.sha.slice(plen)}
              </span>
              <span className="gr-msg">{c.message}</span>
              {isHead && !drag && (
                <span className="gr-head" onMouseDown={startDrag} title="drag onto target commit">
                  ⌖ HEAD
                </span>
              )}
            </div>
          );
        })}
      </div>

      {drag && (
        <span className="gr-head dragging" style={{ left: drag.x, top: drag.y }}>
          ⌖ HEAD
        </span>
      )}
    </div>
  );
}
