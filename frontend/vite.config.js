import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';

export default defineConfig({
  plugins: [react(), { name: 'internms-static-brand-assets', generateBundle() { for (const name of ['internms-logo.svg']) this.emitFile({ type: 'asset', fileName: name, source: readFileSync(new URL(name, import.meta.url)) }); } }],
  server: { port: 5173 },
  build: { target: 'es2020' }
});
