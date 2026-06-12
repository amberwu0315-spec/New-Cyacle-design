import { parseArgs } from 'node:util'
import { fileURLToPath } from 'node:url'

import { devtools } from '@tanstack/devtools-vite'
import { defineConfig } from 'vite'

import tailwindcss from '@tailwindcss/vite'
import viteReact from '@vitejs/plugin-react'

const DEFAULT_VRPC_CLIENT_VERSION = '0.0.0-dev'

function readVrpcClientVersion() {
  const { values } = parseArgs({
    args: process.argv.slice(2).filter((arg) => arg !== '--'),
    options: {
      vrpcClientVersion: {
        type: 'string',
      },
    },
    strict: false,
    allowPositionals: true,
  })

  const version = values.vrpcClientVersion

  return typeof version === 'string' && version
    ? version
    : DEFAULT_VRPC_CLIENT_VERSION
}

const config = defineConfig({
  define: {
    __YORUN_VRPC_CLIENT_VERSION__: JSON.stringify(readVrpcClientVersion()),
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:7088',
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      '@carbonnt-cyacle/skeled-uicpub': fileURLToPath(new URL('../../../domain/uic/pub/skeled/typescript/index.ts', import.meta.url)),
    },
    dedupe: ['react', 'react-dom'],
    tsconfigPaths: true,
  },
  plugins: [
    devtools(),
    tailwindcss(),
    viteReact(),
  ],
})

export default config
