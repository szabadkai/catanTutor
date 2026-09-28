import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  // Relative assets support GitHub Pages project paths and local previews.
  base: './',
  plugins: [react()],
  server: { host: '127.0.0.1' },
});
