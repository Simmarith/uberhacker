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
  const [messages, setMessages] = useState([]); // chat log, survives lobby<->game
  const [publicRooms, setPublicRooms] = useState([]); // public lobbies for the join page

  const zRef = useRef(10);
  const openCountRef = useRef(0);

  const nextPos = () => {
    // Spawn at a random spot, clamped so the whole window stays on screen.
    openCountRef.current++;
    const WIN_W = 340; // .hackwindow width
    const WIN_H = 260; // generous height estimate (content varies)
    const TASKBAR = 48; // reserve footer height at the bottom
    const maxX = Math.max(0, window.innerWidth - WIN_W);
    const maxY = Math.max(0, window.innerHeight - WIN_H - TASKBAR);
    return {
      x: Math.round(Math.random() * maxX),
      y: Math.round(Math.random() * maxY),
    };
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
    const onChatHistory = (log) => setMessages(Array.isArray(log) ? log : []);
    const onChatMessage = (m) =>
      setMessages((ms) => (ms.some((x) => x.id === m.id) ? ms : [...ms, m]));
    const onPublicRooms = (list) => setPublicRooms(Array.isArray(list) ? list : []);

    socket.on('roomState', onRoomState);
    socket.on('challengeOpen', onChallengeOpen);
    socket.on('roundResult', onRoundResult);
    socket.on('gameOver', onGameOver);
    socket.on('chatHistory', onChatHistory);
    socket.on('chatMessage', onChatMessage);
    socket.on('publicRooms', onPublicRooms);
    return () => {
      socket.off('roomState', onRoomState);
      socket.off('challengeOpen', onChallengeOpen);
      socket.off('roundResult', onRoundResult);
      socket.off('gameOver', onGameOver);
      socket.off('chatHistory', onChatHistory);
      socket.off('chatMessage', onChatMessage);
      socket.off('publicRooms', onPublicRooms);
    };
  }, []);

  const sendChat = useCallback((text) => {
    socket.emit('chat', { text });
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
    return <Join onJoin={join} publicRooms={publicRooms} />;
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
        messages={messages}
        onChat={sendChat}
      />
    );
  }

  // lobby or over
  return (
    <Lobby
      room={room}
      you={you}
      isHost={isHost}
      types={types}
      difficulties={difficulties}
      messages={messages}
      onChat={sendChat}
    />
  );
}
