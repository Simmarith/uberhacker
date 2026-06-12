import React, { useEffect, useState, useCallback, useRef } from 'react';
import { socket } from './socket';
import Join from './components/Join.jsx';
import Lobby from './components/Lobby.jsx';
import Desktop from './components/Desktop.jsx';

// How long a solved window stays on screen (flashing the winner) before it
// disappears. Keep in rough sync with the server's REFILL_DELAY_MS.
const CLOSE_AFTER_MS = 1400;

export default function App() {
  const [joined, setJoined] = useState(false);
  const [you, setYou] = useState(null);
  const [types, setTypes] = useState([]);
  const [difficulties, setDifficulties] = useState(['easy', 'normal', 'hard']);
  const [room, setRoom] = useState(null);
  const [windows, setWindows] = useState([]); // [{ id, challenge, pos, z, solved }]

  const zRef = useRef(10);
  const openCountRef = useRef(0);

  const nextPos = () => {
    // Cascade windows diagonally, wrapping so they stay on screen.
    const n = openCountRef.current++;
    const col = n % 5;
    const row = Math.floor(n / 5) % 3;
    return { x: 60 + col * 70 + row * 24, y: 50 + col * 40 + row * 90 };
  };

  const focusWindow = useCallback((id) => {
    setWindows((ws) => ws.map((w) => (w.id === id ? { ...w, z: ++zRef.current } : w)));
  }, []);

  useEffect(() => {
    const onRoomState = (state) => {
      setRoom(state);
      if (state.state !== 'playing') {
        setWindows([]);
        openCountRef.current = 0;
      }
    };
    const onChallengeOpen = (c) => {
      setWindows((ws) => {
        if (ws.some((w) => w.id === c.id)) return ws;
        return [...ws, { id: c.id, challenge: c, pos: nextPos(), z: ++zRef.current, solved: null }];
      });
    };
    const onRoundResult = (r) => {
      setWindows((ws) =>
        ws.map((w) =>
          w.id === r.challengeId
            ? { ...w, solved: { winnerName: r.winnerName, youWon: r.winnerId === socket.id, answer: r.answer } }
            : w
        )
      );
      setTimeout(() => {
        setWindows((ws) => ws.filter((w) => w.id !== r.challengeId));
      }, CLOSE_AFTER_MS);
    };
    const onGameOver = () => {
      setWindows([]);
      openCountRef.current = 0;
    };

    socket.on('roomState', onRoomState);
    socket.on('challengeOpen', onChallengeOpen);
    socket.on('roundResult', onRoundResult);
    socket.on('gameOver', onGameOver);
    return () => {
      socket.off('roomState', onRoomState);
      socket.off('challengeOpen', onChallengeOpen);
      socket.off('roundResult', onRoundResult);
      socket.off('gameOver', onGameOver);
    };
  }, []);

  const join = useCallback((room, username) => {
    socket.emit('join', { room, username }, (res) => {
      if (res && res.ok) {
        setJoined(true);
        setYou(res.you);
        if (res.types) setTypes(res.types);
        if (res.difficulties) setDifficulties(res.difficulties);
      } else {
        alert((res && res.error) || 'Could not join.');
      }
    });
  }, []);

  if (!joined || !room) {
    return <Join onJoin={join} />;
  }

  const isHost = room.hostId === you;

  if (room.state === 'playing') {
    return (
      <Desktop
        room={room}
        you={you}
        isHost={isHost}
        windows={windows}
        onFocus={focusWindow}
      />
    );
  }

  // lobby or over
  return <Lobby room={room} you={you} isHost={isHost} types={types} difficulties={difficulties} />;
}
