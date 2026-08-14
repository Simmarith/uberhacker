import React, { useState } from 'react';
import { socket } from '../socket';
import Scoreboard, { typeLabel } from './Scoreboard.jsx';
import Chat from './Chat.jsx';
import Practice from './Practice.jsx';
import Slider from './Slider.jsx';
import { disabledByDefault } from '../config';

const PRESET_DEFAULTS = {
  easy: { words: 1, cidrs: '8, 16, 24', maxNum: 15, bits: 4, xorMax: 15, knockPorts: 1, knockOffset: 60, reparent: { commits: 5, prefix: 7 }, choices: 3, hashPrefix: 5 },
  normal: { words: 2, cidrs: '8, 16, 24', maxNum: 255, bits: 8, xorMax: 255, knockPorts: 2, knockOffset: 250, reparent: { commits: 8, prefix: 10 }, choices: 4, hashPrefix: 7 },
  hard: { words: 4, cidrs: '12, 18, 20, 26, 28, 30', maxNum: 4095, bits: 12, xorMax: 4095, knockPorts: 4, knockOffset: 900, reparent: { commits: 15, prefix: 12 }, choices: 5, hashPrefix: 10 },
};

const DIFFICULTY_SETTINGS = [
  { game: 'fastType', key: 'words', label: 'words', min: 1, max: 10 },
  { game: 'getNet', key: 'cidrs', label: 'CIDR prefixes', type: 'text' },
  { game: 'broadcast', key: 'cidrs', label: 'CIDR prefixes', type: 'text' },
  { game: 'convert', key: 'maxNum', label: 'max decimal', min: 1, max: 65535 },
  { game: 'convert', key: 'bits', label: 'binary bits', min: 1, max: 16 },
  { game: 'xor', key: 'xorMax', label: 'max operand', min: 1, max: 65535 },
  { game: 'portKnock', key: 'knockPorts', label: 'ports', min: 1, max: 8 },
  { game: 'portKnock', key: 'knockOffset', label: 'dial offset', min: 0, max: 5000 },
  { game: 'gitReparent', key: 'commits', label: 'commits', min: 2, max: 30 },
  { game: 'gitReparent', key: 'prefix', label: 'SHA prefix', min: 1, max: 10 },
  { game: 'packetSniffer', key: 'choices', label: 'packets', min: 2, max: 6 },
  { game: 'accessControl', key: 'choices', label: 'policies', min: 2, max: 6 },
  { game: 'hashHunt', key: 'choices', label: 'digests', min: 2, max: 6 },
  { game: 'hashHunt', key: 'hashPrefix', label: 'digest prefix', min: 1, max: 32 },
];

const presetPlaceholder = (key, effectiveDifficulty) => {
  const defaults = PRESET_DEFAULTS[effectiveDifficulty];
  if (!defaults) return '';
  const v = defaults[key] ?? defaults.reparent?.[key];
  return v != null ? String(v) : '';
};

const NORMIE_GAMES = new Set(['fastType', 'phishHunter', 'accessControl']);

export default function Lobby({ room, you, isHost, types, conversionTypes, difficulties, messages, onChat }) {
  const [target, setTarget] = useState(room.config?.targetScore || 5);
  const [concurrent, setConcurrent] = useState(room.config?.concurrent || 3);
  const [difficulty, setDifficulty] = useState(room.config?.difficulty || 'normal');
  const [gameDifficulties, setGameDifficulties] = useState(room.config?.gameDifficulties || {});
  const [difficultySettings, setDifficultySettings] = useState(room.config?.difficultySettings || {});
  const [selected, setSelected] = useState(
    () =>
      new Set((room.config?.types || types).filter((t) => !disabledByDefault.has(t)))
  );
  const [selectedConversions, setSelectedConversions] = useState(
    () => new Set(room.config?.conversionTypes || conversionTypes)
  );
  const [expanded, setExpanded] = useState(new Set());
  const [leaving, setLeaving] = useState(new Set());
  const [gameProfile, setGameProfile] = useState('custom');
  const [presetName, setPresetName] = useState('');
  const [savedPresets, setSavedPresets] = useState(() => {
    try { return JSON.parse(localStorage.getItem('uberhacker.lobby-presets') || '[]'); } catch { return []; }
  });

  const persistPresets = (next) => {
    setSavedPresets(next);
    localStorage.setItem('uberhacker.lobby-presets', JSON.stringify(next));
  };

  const activate = (t) => {
    setSelected((prev) => new Set(prev).add(t));
    setExpanded((prev) => new Set(prev).add(t));
  };

  const deactivate = (t) => {
    setLeaving((prev) => new Set(prev).add(t));
    setExpanded((prev) => { const next = new Set(prev); next.delete(t); return next; });
    setTimeout(() => {
      setSelected((prev) => { const next = new Set(prev); next.delete(t); return next; });
      setLeaving((prev) => { const next = new Set(prev); next.delete(t); return next; });
    }, 280);
  };

  const setRotation = (nextTypes) => {
    const next = new Set(nextTypes);
    types.forEach((type) => {
      if (next.has(type) && !selected.has(type)) activate(type);
      if (!next.has(type) && selected.has(type)) deactivate(type);
    });
  };

  const applyDifficultyPreset = (preset) => {
    setDifficulty(preset);
    setGameDifficulties(Object.fromEntries(types.map((type) => [type, preset])));
    setDifficultySettings({});
  };

  const toggle = (t) => {
    setGameProfile('custom');
    if (selected.has(t)) deactivate(t);
    else activate(t);
  };

  const toggleConversion = (t) => {
    setSelectedConversions((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      setSelected((games) => {
        const nextGames = new Set(games);
        if (next.size) nextGames.add('convert');
        else nextGames.delete('convert');
        return nextGames;
      });
      return next;
    });
  };

  const start = () => {
    const chosen = [...selected];
    socket.emit('start', {
      targetScore: target,
      concurrent,
      difficulty,
      difficultySettings,
      gameDifficulties,
      types: chosen.length ? chosen : types,
      conversionTypes: [...selectedConversions],
    });
  };

  const isOver = room.state === 'over';
  const activeTypes = types.filter((t) => selected.has(t) || leaving.has(t));
  const inactiveTypes = types.filter((t) => !selected.has(t) && !leaving.has(t));

  const savePreset = () => {
    const name = presetName.trim().slice(0, 40);
    if (!name) return;
    const data = {
      name, target, concurrent, difficulty, gameDifficulties, difficultySettings,
      types: [...selected], conversionTypes: [...selectedConversions],
    };
    persistPresets([...savedPresets.filter((preset) => preset.name !== name), data]);
    setPresetName('');
  };

  const loadPreset = (preset) => {
    setTarget(preset.target || 5); setConcurrent(preset.concurrent || 3);
    setDifficulty(preset.difficulty || 'normal'); setGameDifficulties(preset.gameDifficulties || {});
    setDifficultySettings(preset.difficultySettings || {}); setSelected(new Set(preset.types || []));
    setSelectedConversions(new Set(preset.conversionTypes || conversionTypes)); setExpanded(new Set()); setGameProfile('custom');
  };

  const renderGame = (t) => (
    <div key={t} className={`game-option on ${leaving.has(t) ? 'leaving' : ''}`}>
      <div className="game-option-head">
        <span>{typeLabel(t)}</span>
        <span className="game-option-actions">
          <button className="chip" onClick={() => setExpanded((prev) => { const next = new Set(prev); next.has(t) ? next.delete(t) : next.add(t); return next; })} type="button">
            {expanded.has(t) ? 'hide settings' : 'settings'}
          </button>
          <button className="chip" onClick={() => { setGameProfile('custom'); deactivate(t); }} type="button">disable</button>
        </span>
      </div>
      {expanded.has(t) && (
        <div className="game-subsettings">
          <span>difficulty preset</span>
          <div className="typegrid">
            {difficulties.map((preset) => <button key={preset} className={`chip ${(gameDifficulties[t] || difficulty) === preset ? 'on' : ''}`} onClick={() => { setGameDifficulties((prev) => ({ ...prev, [t]: preset })); setDifficultySettings((prev) => ({ ...prev, [t]: {} })); }} type="button">{preset}</button>)}
          </div>
          {t === 'convert' && <><span>enabled directions</span><div className="typegrid">{conversionTypes.map((conversion) => <button key={conversion} className={`chip ${selectedConversions.has(conversion) ? 'on' : ''}`} onClick={() => toggleConversion(conversion)} type="button">{typeLabel(conversion)}</button>)}</div></>}
          {DIFFICULTY_SETTINGS.filter((setting) => setting.game === t).map((setting) => { const eff = gameDifficulties[t] || difficulty; return <label key={setting.key} className="difficulty-input"><span>{setting.label}</span>{setting.type === 'text' ? <input type="text" value={difficultySettings[t]?.[setting.key] ?? ''} placeholder={presetPlaceholder(setting.key, eff)} onChange={(e) => setDifficultySettings((prev) => ({ ...prev, [t]: { ...prev[t], [setting.key]: e.target.value } }))} /> : <Slider min={setting.min} max={setting.max} value={difficultySettings[t]?.[setting.key] ?? ''} placeholder={presetPlaceholder(setting.key, eff)} onChange={(e) => setDifficultySettings((prev) => ({ ...prev, [t]: { ...prev[t], [setting.key]: e.target.value } }))} />}</label>; })}
        </div>
      )}
    </div>
  );

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

              <div className="setting-label">games in rotation</div>
              <div className="recommended-presets">
                <div>
                  <span>recommended difficulty</span>
                  <div className="typegrid">
                    {difficulties.map((preset) => <button key={preset} className={`chip ${difficulty === preset ? 'on' : ''}`} onClick={() => applyDifficultyPreset(preset)} type="button">{preset}</button>)}
                  </div>
                </div>
                <div>
                  <span>game profile</span>
                  <div className="typegrid">
                    <button className={`chip ${gameProfile === 'normie' ? 'on' : ''}`} onClick={() => { setRotation(types.filter((type) => NORMIE_GAMES.has(type))); setGameProfile('normie'); }} type="button">normie</button>
                    <button className={`chip ${gameProfile === 'hacker' ? 'on' : ''}`} onClick={() => { setRotation(types); setGameProfile('hacker'); }} type="button">hacker</button>
                  </div>
                </div>
                <div className="preset-action">
                  <button className="chip" onClick={() => setExpanded(new Set())} disabled={expanded.size === 0} type="button">collapse all settings</button>
                </div>
              </div>
              <div className="active-game-list">{activeTypes.map(renderGame)}</div>
              <div className="setting-label">available games</div>
              <div className="inactive-game-collection">
                {inactiveTypes.map((t) => <button key={t} className="chip" onClick={() => activate(t)} type="button">+ {typeLabel(t)}</button>)}
              </div>

              <div className="setting-label">saved lobby settings</div>
              <div className="preset-controls"><input value={presetName} onChange={(e) => setPresetName(e.target.value)} placeholder="preset name" /><button className="chip" onClick={savePreset} type="button">save</button></div>
              {savedPresets.length > 0 && <div className="preset-list">{savedPresets.map((preset) => <span key={preset.name}><button className="chip" onClick={() => loadPreset(preset)} type="button">{preset.name}</button><button className="chip" onClick={() => persistPresets(savedPresets.filter((item) => item.name !== preset.name))} type="button">×</button></span>)}</div>}

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

          <Practice types={types} difficulties={difficulties} defaultDifficulty={difficulty} />
        </main>

        <aside>
          <Scoreboard players={room.players} you={you} target={room.config?.targetScore} />
          <Chat mode="lobby" messages={messages} onSend={onChat} you={you} />
        </aside>
      </div>
    </div>
  );
}
