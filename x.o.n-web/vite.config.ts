import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const INSTANCE_IP = env.VITE_INSTANCE_IP;
  const STREAM_PORT = env.VITE_STREAM_PORT || '8080';
  const APPNAME = env.VITE_STREAM_APPNAME || 'webrtc';

  // Build proxy target only if instance ip is provided
  const target = INSTANCE_IP ? `http://${INSTANCE_IP}:${STREAM_PORT}` : undefined;
  const proxy = target ? {
    [`/${APPNAME}/signalling`]: {
      target,
      changeOrigin: true,
      ws: true,
      secure: false,
      rewrite: (path: string) => path,
    },
    '/ws': {
      target,
      changeOrigin: true,
      ws: true,
      secure: false,
      rewrite: (path: string) => path,
    },
  } : undefined;

  return {
    plugins: [
      react({
        babel: { plugins: [["babel-plugin-react-compiler", {}]] },
      }),
    ],
    define: {},
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('.', import.meta.url)),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: { vendor: ['react', 'react-dom'] },
        },
      },
    },
    server: {
      port: 3000,
      open: true,
      proxy,
    },
  };
});

