import React, { useRef, useCallback, useEffect, useState } from 'react';

export default function Slider({ min, max, step = 1, value: controlledValue, onChange, placeholder }) {
  const trackRef = useRef(null);
  const [internalValue, setInternalValue] = useState(
    controlledValue === '' || controlledValue == null
      ? (placeholder != null ? Number(placeholder) : Number(min))
      : Number(controlledValue)
  );

  const displayValue = (() => {
    if (controlledValue === '' || controlledValue == null) {
      return placeholder != null ? Number(placeholder) : Number(min);
    }
    return Number(controlledValue);
  })();

  const fraction = max === min ? 0 : (displayValue - min) / (max - min);
  const fillPercent = Math.max(0, Math.min(100, fraction * 100));

  const update = useCallback((clientX) => {
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const raw = (clientX - rect.left) / rect.width;
    const clamped = Math.max(0, Math.min(1, raw));
    const stepped = Math.round((min + clamped * (max - min)) / step) * step;
    const next = Math.max(min, Math.min(max, stepped));
    if (onChange) {
      onChange({ target: { value: String(next) } });
    }
  }, [min, max, step, onChange]);

  const onPointerDown = useCallback((e) => {
    e.preventDefault();
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const raw = (e.clientX - rect.left) / rect.width;
    const clamped = Math.max(0, Math.min(1, raw));
    const stepped = Math.round((min + clamped * (max - min)) / step) * step;
    const next = Math.max(min, Math.min(max, stepped));
    if (onChange) {
      onChange({ target: { value: String(next) } });
    }
    const onMove = (ev) => {
      const r = track.getBoundingClientRect();
      const rw = (ev.clientX - r.left) / r.width;
      const rc = Math.max(0, Math.min(1, rw));
      const rs = Math.round((min + rc * (max - min)) / step) * step;
      const rn = Math.max(min, Math.min(max, rs));
      if (onChange) {
        onChange({ target: { value: String(rn) } });
      }
    };
    const onUp = () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
    };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  }, [min, max, step, onChange]);

  return (
    <div className="slider-row">
      <div className="slider-track" ref={trackRef} onPointerDown={onPointerDown}>
        <div className="slider-fill" style={{ width: `${fillPercent}%` }} />
        <div className="slider-thumb" style={{ left: `${fillPercent}%` }} />
      </div>
      <input
        type="number"
        className="slider-input"
        min={min}
        max={max}
        value={controlledValue || ''}
        placeholder={placeholder}
        onChange={onChange}
      />
    </div>
  );
}