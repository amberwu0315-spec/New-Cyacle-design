import { defineConfig } from 'vitest/config'

function localPackageEntry(path: string) {
  return new URL(path, import.meta.url).pathname
}

/**
 * 本地 profile 把 `@cew-lib/file-viewer-*` link 到仓库外的 file-viewer 源码时，
 * 这些包会带着自己那份 react/react-dom 解析进来，导致 React 出现两份实例。
 * 这里统一把 react 相关入口固定到本包的依赖，保证单实例。
 */
export default defineConfig({
  define: {
    __YORUN_VRPC_CLIENT_VERSION__: JSON.stringify('test'),
  },
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: [
      {
        find: '@base-ui/react',
        replacement: localPackageEntry('./node_modules/@base-ui/react'),
      },
      {
        find: /^react$/,
        replacement: localPackageEntry('./node_modules/react/index.js'),
      },
      {
        find: /^react\/jsx-runtime$/,
        replacement: localPackageEntry('./node_modules/react/jsx-runtime.js'),
      },
      {
        find: /^react\/jsx-dev-runtime$/,
        replacement: localPackageEntry(
          './node_modules/react/jsx-dev-runtime.js',
        ),
      },
      {
        find: /^react-dom$/,
        replacement: localPackageEntry('./node_modules/react-dom/index.js'),
      },
      {
        find: /^react-dom\/client$/,
        replacement: localPackageEntry('./node_modules/react-dom/client.js'),
      },
    ],
  },
})
