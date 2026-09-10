#!/usr/bin/env node
/**
 * Builds the static files that go inside the Android app, then syncs them into
 * the Capacitor project.
 *
 * A Next.js static export cannot contain a request-driven route handler, so
 * app/api is moved aside for the build and put back afterwards, including when
 * the build fails or the run is interrupted.
 */
import { execSync } from 'node:child_process'
import { cpSync, existsSync, renameSync, rmSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const apiDir = resolve(root, 'app/api')
const parked = resolve(root, 'app/.api-parked')

/** The India-hosted backend the packaged app sends every weather request to. */
const HOSTED_API = process.env.WEATHER_API_BASE ?? 'https://weatherskyapp.vercel.app'

let moved = false

function restore() {
  if (moved && existsSync(parked)) {
    renameSync(parked, apiDir)
    moved = false
  }
}

// Put the route back on any exit path, including Ctrl-C.
process.on('exit', restore)
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => { restore(); process.exit(1) })
}

try {
  if (existsSync(parked)) throw new Error(`${parked} already exists; a previous run left it behind`)
  if (existsSync(apiDir)) {
    renameSync(apiDir, parked)
    moved = true
  }

  rmSync(resolve(root, 'out'), { recursive: true, force: true })

  execSync('npx next build', {
    cwd: root,
    stdio: 'inherit',
    env: {
      ...process.env,
      BUILD_TARGET: 'static',
      NEXT_PUBLIC_WEATHER_API_BASE: HOSTED_API,
    },
  })
} finally {
  restore()
}

/*
 * The build uses its own distDir so it cannot disturb the .next folder a running
 * dev server holds open. With a custom distDir the export lands there rather than
 * in out/, so it is copied across to the path Capacitor is pointed at.
 */
const exported = resolve(root, '.next-static')
const webDir = resolve(root, 'out')
if (!existsSync(resolve(exported, 'index.html'))) {
  throw new Error(`No index.html in ${exported}; the export did not produce a site`)
}
cpSync(exported, webDir, { recursive: true })

execSync('npx cap sync android', { cwd: resolve(root, 'android-shell'), stdio: 'inherit' })
console.log('\nStatic app bundled and synced. Build the APK with:')
console.log('  cd android-shell/android && ./gradlew assembleDebug')
