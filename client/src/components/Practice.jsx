import React, { useEffect, useRef, useState } from 'react';
import { socket } from '../socket';
import { typeLabel } from './Scoreboard.jsx';
import PortKnock from './PortKnock.jsx';
import GitReparent from './GitReparent.jsx';

// Inline lobby practice panel: pick a game, get a real (unscored) instance from
// the server, answer it, get instant feedback, pull a fresh one. Reuses the
// same input components and verification path as the live game.
export default function Practice({ types, difficulties, defaultDifficulty }) {
  const [type, setType] = useState(types[0]);
  const [difficulty, setDifficulty] = useState(defaultDifficulty || 'normal');
  const [challenge, setChallenge] = useState(null);
  const [result, setResult] = useState(null); // 'correct' | 'wrong' | null
  const [value, setValue] = useState('');
  const [shake, setShake] = useState(false);
  const inputRef = useRef(null);

  const requestDemo = (t, d) => {
    socket.emit('demo', { type: t, difficulty: d }, (res) => {
      if (res && res.ok) {
        setChallenge(res.challenge);
        setResult(null);
        setValue('');
      }
    });
  };

  // (Re)fetch whenever the chosen game or difficulty changes.
  useEffect(() => {
    requestDemo(type, difficulty);
  }, [type, difficulty]);

  // Keep focus on the text input for the simple challenge types.
  useEffect(() => {
    if (challenge && !result) inputRef.current?.focus();
  }, [challenge, result]);

  // Mirrors the (val, onWrong) contract PortKnock / GitReparent expect.
  const submit = (val, onWrong) => {
    if (result === 'correct' || !String(val).trim()) return;
    socket.emit('demoAnswer', { value: val }, (res) => {
      if (res && res.result === 'correct') {
        setResult('correct');
      } else {
        setResult('wrong');
        setShake(true);
        setTimeout(() => setShake(false), 400);
        onWrong && onWrong();
      }
    });
  };

  const onFormSubmit = (e) => {
    e.preventDefault();
    submit(value, () => setValue(''));
  };

  const special = challenge && challenge.type;

  return (
    <div className="practice">
      <div className="practice-head">
        <span className="wtitle">PRACTICE :: warm up before the round</span>
      </div>

      <div className="practice-pickers">
        <div className="typegrid">
          {types.map((t) => (
            <button
              key={t}
              className={`chip ${type === t ? 'on' : ''}`}
              onClick={() => setType(t)}
              type="button"
            >
              {typeLabel(t)}
            </button>
          ))}
        </div>
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
      </div>

      <div className={`practice-body ${shake ? 'shake' : ''}`}>
        {!challenge ? (
          <p className="hintline">// loading challenge…</p>
        ) : result === 'correct' ? (
          <div className="result">
            <h2 className="good">you got it!</h2>
            <div className="practice-actions">
              <button className="chip on" type="button" onClick={() => requestDemo(type, difficulty)}>
                ↻ next
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="prompt">{challenge.prompt}</p>
            {special === 'portKnock' ? (
              <PortKnock key={challenge.id} challenge={challenge} onAnswer={submit} />
            ) : special === 'gitReparent' ? (
              <GitReparent key={challenge.id} challenge={challenge} onAnswer={submit} />
            ) : (
              <form onSubmit={onFormSubmit}>
                <span className="caret">&gt;</span>
                <input
                  ref={inputRef}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="answer + enter"
                />
              </form>
            )}
            <p className="hintline">// {challenge.hint}</p>
            <div className="practice-actions">
              <button className="chip" type="button" onClick={() => requestDemo(type, difficulty)}>
                ↻ new
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
