import { defineConfig } from 'vite';
import path from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import electron from 'vite-plugin-electron/simple';

export default defineConfig({
  root: path.resolve(__dirname, 'src/renderer'),
  plugins: [
    react(),
    tailwindcss(),
    electron({
      main: {
        entry: path.resolve(__dirname, 'src/main/index.ts'),
        vite: {
          build: {
            outDir: path.resolve(__dirname, 'dist/main'),
            rollupOptions: {
              external: [
              'better-sqlite3',
              '@powersync/node',
              '@powersync/common',
              '@supabase/supabase-js',
              '@huggingface/transformers',
              'onnxruntime-node',
              'sharp', // optional dep of transformers.js
            ],
            },
          },
          resolve: {
            alias: {
              '@shared': path.resolve(__dirname, 'src/shared'),
            },
          },
        },
      },
      preload: {
        input: path.resolve(__dirname, 'src/preload/index.ts'),
        vite: {
          build: {
            outDir: path.resolve(__dirname, 'dist/preload'),
          },
        },
      },
    }),
  ],
  build: {
    outDir: path.resolve(__dirname, 'dist/renderer'),
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-tiptap': [
            '@tiptap/react',
            '@tiptap/starter-kit',
            '@tiptap/extension-link',
            '@tiptap/extension-placeholder',
            '@tiptap/extension-task-list',
            '@tiptap/extension-task-item',
            'tiptap-markdown',
          ],
          'vendor-ui': [
            '@radix-ui/react-popover',
            'radix-ui',
            'lucide-react',
          ],
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@main': path.resolve(__dirname, 'src/main'),
      '@renderer': path.resolve(__dirname, 'src/renderer'),
      '@shared': path.resolve(__dirname, 'src/shared'),
    },
  },
});
