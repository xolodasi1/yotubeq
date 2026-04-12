import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
        manifest: {
          name: 'IceTube',
          short_name: 'IceTube',
          description: 'Лучший видеохостинг для тебя',
          theme_color: '#ffffff',
          background_color: '#ffffff',
          display: 'standalone',
          icons: [
            {
              src: 'https://firebasestorage.googleapis.com/v0/b/file-extract.appspot.com/o/60824637609258679%2F1744458896027_logo.jpg?alt=media&token=7e3d6e1b-6b8e-4b7e-9b7e-9b7e9b7e9b7e',
              sizes: '192x192',
              type: 'image/jpeg'
            },
            {
              src: 'https://firebasestorage.googleapis.com/v0/b/file-extract.appspot.com/o/60824637609258679%2F1744458896027_logo.jpg?alt=media&token=7e3d6e1b-6b8e-4b7e-9b7e-9b7e9b7e9b7e',
              sizes: '512x512',
              type: 'image/jpeg'
            },
            {
              src: 'https://firebasestorage.googleapis.com/v0/b/file-extract.appspot.com/o/60824637609258679%2F1744458896027_logo.jpg?alt=media&token=7e3d6e1b-6b8e-4b7e-9b7e-9b7e9b7e9b7e',
              sizes: '512x512',
              type: 'image/jpeg',
              purpose: 'any maskable'
            }
          ]
        }
      })
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
