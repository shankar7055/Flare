import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/auth': {
        target: 'http://localhost:8000',
        changeOrigin: true
      },
      '/tasks': {
        target: 'http://localhost:8000',
        changeOrigin: true
      },
      '/agent': {
        target: 'http://localhost:8000',
        changeOrigin: true
      },
      '/calendar': {
        target: 'http://localhost:8000',
        changeOrigin: true
      },
      '/notifications': {
        target: 'http://localhost:8000',
        changeOrigin: true
      }
    }
  }
});
