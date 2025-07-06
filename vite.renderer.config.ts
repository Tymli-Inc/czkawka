import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {patchCssModules} from "vite-css-modules";

// https://vitejs.dev/config
export default defineConfig({
  plugins: [
      react(),
      patchCssModules({
        generateSourceTypes: true,
      })
  ],
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src/ui'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
    // Optimize dependencies for smaller bundle
    commonjsOptions: {
      exclude: ['react-icons'],
    },
  },
});
