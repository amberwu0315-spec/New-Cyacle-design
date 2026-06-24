import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

import { devtools } from '@tanstack/devtools-vite'
import { defineConfig } from 'vite'

import tailwindcss from '@tailwindcss/vite'
import viteReact from '@vitejs/plugin-react'

const DEFAULT_VRPC_CLIENT_VERSION = '0.0.0-dev'
const skeledMetaPubEntry = fileURLToPath(
  new URL('../../../domain/meta/pub/skeled/typescript/index.ts', import.meta.url),
)
const skeledPcfFactorApiPubEntry = fileURLToPath(
  new URL('../../../domain/pcf.factor.api/pub/skeled/typescript/index.ts', import.meta.url),
)
const skeledRecordPubEntry = fileURLToPath(
  new URL('../../../domain/record/pub/skeled/typescript/index.ts', import.meta.url),
)
const webRecordPubEntry = fileURLToPath(
  new URL('../../../domain/record/src/web/src/pub/index.ts', import.meta.url),
)
const webUicPubEntry = fileURLToPath(
  new URL('../../../domain/uic/src/web/src/pub/index.ts', import.meta.url),
)
const webUicEntry = fileURLToPath(
  new URL('../../../domain/uic/src/web/src/index.ts', import.meta.url),
)

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
  resolve: {
    alias: [
      {
        find: /^@carbonnt-cyacle\/skeled-metapub$/,
        replacement: skeledMetaPubEntry,
      },
      {
        find: /^@carbonnt-cyacle\/skeled-pcf-factor-apipub$/,
        replacement: skeledPcfFactorApiPubEntry,
      },
      {
        find: /^@carbonnt-cyacle\/skeled-recordpub$/,
        replacement: skeledRecordPubEntry,
      },
      {
        find: /^@carbonnt-cyacle\/web-record\/pub$/,
        replacement: webRecordPubEntry,
      },
      {
        find: /^@carbonnt-cyacle\/web-uic\/pub$/,
        replacement: webUicPubEntry,
      },
      {
        find: /^@carbonnt-cyacle\/web-uic$/,
        replacement: webUicEntry,
      },
    ],
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
