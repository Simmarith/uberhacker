import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In dev, the Vite server runs on 5173 and proxies socket.io to the
// Node server on 3000. In prod, the Node server serves the built dist
// and socket.io lives on the same origin.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true,
      },
    },
  },
});
