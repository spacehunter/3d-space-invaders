import { defineConfig, loadEnv } from 'vite';
import { readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
  base: './',  // Relative paths for web deployment
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version)
  },
  build: {
    outDir: 'dist'
  },
  server: {
    // allow access from other machines on the LAN (e.g. Joe's Mac)
    allowedHosts: true,
    // JEV BRAIN cloud engine: forwards the browser's calls to the TypeSafe
    // API with the key added server-side (never exposed to the browser).
    // Without TYPESAFE_API_KEY in .env this proxies with no auth header and
    // the game's feature-detection demotes to the local heuristic engine.
    proxy: {
      '/jev-api': {
        target: 'https://api.typesafe.ai',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/jev-api/, ''),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            if (env.TYPESAFE_API_KEY) {
              proxyReq.setHeader('Authorization', `Bearer ${env.TYPESAFE_API_KEY}`);
            }
          });
        },
      },
    }
  }
  };
});
