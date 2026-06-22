import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';
import { copyFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, resolve } from 'path';

function copyWasmPlugin() {
  const wasmSource = resolve(__dirname, 'node_modules/sql.js/dist/sql-wasm.wasm');
  const wasmTarget = resolve(__dirname, 'public/sql-wasm.wasm');

  return {
    name: 'copy-wasm',
    buildStart() {
      const dir = dirname(wasmTarget);
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      copyFileSync(wasmSource, wasmTarget);
    },
  };
}

export default defineConfig({
  plugins: [solidPlugin(), copyWasmPlugin()],
  base: './',
  clearScreen: false,
  server: {
    open: false,
    strictPort: true,
  },
  build: {
    target: 'esnext',
    sourcemap: false,
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.jsx', '.js', '.json'],
  },
});
