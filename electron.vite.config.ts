import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@shared': resolve(__dirname, 'src/shared'),
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          'main-preload': resolve(__dirname, 'src/main/preload/main-preload.ts'),
          'note-preload': resolve(__dirname, 'src/main/preload/note-preload.ts'),
          'photo-preload': resolve(__dirname, 'src/main/preload/photo-preload.ts'),
        },
      },
    },
  },
  renderer: {
    root: resolve(__dirname, 'src/renderer'),
    plugins: [react()],
    resolve: {
      alias: {
        '@shared': resolve(__dirname, 'src/shared'),
      },
    },
    build: {
      outDir: resolve(__dirname, 'out/renderer'),
    },
  },
})
