import { io } from 'socket.io-client';

// Same-origin in prod (server serves dist); in dev Vite proxies /socket.io
// to the Node server. So a plain io() works in both cases.
export const socket = io({ autoConnect: true });
