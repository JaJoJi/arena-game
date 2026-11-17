import { defineConfig } from 'vite';

export default defineConfig({
  root: 'src/client',
  server: {
    port: 5173,
    // note the trailing slash: '/api' alone would also capture the client's own /api.ts module
    proxy: { '/api/': 'http://localhost:8787' },
  },
  build: {
    outDir: '../../dist',
    emptyOutDir: true,
  },
});
