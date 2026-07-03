import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;

export default defineConfig({
  plugins: [react()],
  server: {
    port: env?.PORT ? Number(env.PORT) : 5173,
    open: true,
  },
});
