import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react()
  ],
  build: {
    sourcemap: false,
    minify: 'esbuild'
  },
  esbuild: {
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : []
  },
  resolve: {
    alias: {
      'react-native': 'react-native-web'
    }
  },
  server: {
    port: 5173
  }
});
