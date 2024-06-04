import path from 'path'
import { defineConfig } from 'vite'
import solidPlugin from 'vite-plugin-solid'

export default defineConfig({
  plugins: [solidPlugin()],
  server: {
    port: 6969,
  },
  build: {
    target: 'esnext',
    outDir: './build',
  },
  base: './',
  resolve: {
    alias: {
      '@vscode/codicon': path.resolve(__dirname, 'node_modules/@vscode/codicon'),
    },
  },
})
