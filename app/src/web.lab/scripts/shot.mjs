#!/usr/bin/env node
// 三档宽度截图，用于设计探索的证据留存。
//
// 用法：
//   node app/src/web.lab/scripts/shot.mjs --login     # 打开可见窗口，手动登录一次（cookie 留在 lab profile）
//   node app/src/web.lab/scripts/shot.mjs             # 截 /lab
//   node app/src/web.lab/scripts/shot.mjs --path /project/projects --name projects
//   node app/src/web.lab/scripts/shot.mjs --path "/project/projects?v=flat" --name projects-flat
//
// 输出：docs/lab/evidence/<name>-<width>.png
//
// 走 CDP 而不是 `--screenshot`：登录页有持续网络请求，headless 的 load 事件
// 会一直不触发，`--screenshot` 会挂住。CDP 是"等固定毫秒后直接抓帧"。

import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(here, '../../../..')

const CHROME_CANDIDATES = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
]

const WIDTHS = [
  { width: 1280, height: 900 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
]

const PORT = 9333
const PROFILE_DIR = resolve(repoRoot, '.cache/lab/chrome-profile')
const OUT_DIR = resolve(repoRoot, 'docs/lab/evidence')

function parseArgs(argv) {
  const args = { path: '/lab', name: 'lab', login: false, url: null, settle: 4000 }
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--login') args.login = true
    else if (arg === '--path') args.path = argv[++i]
    else if (arg === '--name') args.name = argv[++i]
    else if (arg === '--url') args.url = argv[++i]
    else if (arg === '--settle') args.settle = Number(argv[++i])
  }
  return args
}

function findChrome() {
  const found = CHROME_CANDIDATES.find((candidate) => existsSync(candidate))
  if (!found) throw new Error(`没找到 Chrome。已尝试：\n${CHROME_CANDIDATES.join('\n')}`)
  return found
}

const launchArgs = [
  '--headless=new',
  '--no-sandbox',
  '--disable-gpu',
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-crash-reporter',
  '--disable-breakpad',
  '--hide-scrollbars',
  `--user-data-dir=${PROFILE_DIR}`,
  `--remote-debugging-port=${PORT}`,
]

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function waitForEndpoint(url, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url)
      if (res.ok) return await res.json()
    } catch {
      // 还没起来
    }
    await sleep(250)
  }
  throw new Error(`等待 ${url} 超时`)
}

/** 极简 CDP 客户端：发命令、按 id 收结果。 */
function createCdp(socketUrl) {
  const ws = new WebSocket(socketUrl)
  let nextId = 1
  const pending = new Map()

  ws.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data)
    if (msg.id && pending.has(msg.id)) {
      const { resolve: ok, reject } = pending.get(msg.id)
      pending.delete(msg.id)
      msg.error ? reject(new Error(msg.error.message)) : ok(msg.result)
    }
  })

  const ready = new Promise((ok, fail) => {
    ws.addEventListener('open', () => ok())
    ws.addEventListener('error', () => fail(new Error('CDP 连接失败')))
  })

  return {
    ready,
    close: () => ws.close(),
    send(method, params = {}) {
      const id = nextId++
      return new Promise((ok, fail) => {
        pending.set(id, { resolve: ok, reject: fail })
        ws.send(JSON.stringify({ id, method, params }))
      })
    },
  }
}

const args = parseArgs(process.argv.slice(2))
const chrome = findChrome()
const targetUrl = args.url ?? `http://127.0.0.1:7088${args.path}`

mkdirSync(PROFILE_DIR, { recursive: true })
mkdirSync(OUT_DIR, { recursive: true })

for (const lock of ['SingletonLock', 'SingletonSocket', 'SingletonCookie']) {
  rmSync(resolve(PROFILE_DIR, lock), { force: true })
}

if (args.login) {
  console.log(`打开可见窗口用于登录，登录完成后关闭窗口即可。\n  ${targetUrl}`)
  const child = spawn(chrome, ['--no-sandbox', `--user-data-dir=${PROFILE_DIR}`, targetUrl], {
    stdio: 'inherit',
  })
  child.on('exit', () => process.exit(0))
  await new Promise(() => {})
}

const chromeProc = spawn(chrome, launchArgs, { stdio: 'ignore' })

try {
  await waitForEndpoint(`http://127.0.0.1:${PORT}/json/version`)

  for (const { width, height } of WIDTHS) {
    const target = await (
      await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent('about:blank')}`, {
        method: 'PUT',
      })
    ).json()

    const cdp = createCdp(target.webSocketDebuggerUrl)
    await cdp.ready
    await cdp.send('Page.enable')
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: false,
    })
    await cdp.send('Page.navigate', { url: targetUrl })
    await sleep(args.settle)
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' })
    const out = resolve(OUT_DIR, `${args.name}-${width}.png`)
    writeFileSync(out, Buffer.from(data, 'base64'))
    console.log(`✓ ${out}`)
    cdp.close()
    await fetch(`http://127.0.0.1:${PORT}/json/close/${target.id}`).catch(() => {})
  }
} finally {
  chromeProc.kill('SIGKILL')
}

console.log('\n截图完成。若截到登录页，先跑一次：node app/src/web.lab/scripts/shot.mjs --login')
