import { defineConfig, loadEnv } from 'vite'
import laravel from 'laravel-vite-plugin'
import solid from 'vite-plugin-solid'
import fs from 'fs'
import { resolve } from 'path'

const resolveHost = appUrl => {
  if (!appUrl) {
    return '127.0.0.1'
  }

  try {
    return new URL(appUrl).hostname
  } catch {
    return appUrl.replace(/https?:\/\//, '').replace(/\/.*$/, '').split(':')[0]
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const host = resolveHost(env.APP_URL ?? process.env.APP_URL)
  const homesteadKeyPath = `/home/vagrant/${host}.key`
  const homesteadCertPath = `/home/vagrant/${host}.crt`
  const useHomesteadHttps =
    process.env.NODE_ENV !== 'production' &&
    fs.existsSync(homesteadKeyPath) &&
    fs.existsSync(homesteadCertPath)

  return {
    server: {
      host: host,
      hmr: {
        host: host,
      },
      ...(useHomesteadHttps
        ? {
            https: {
              key: fs.readFileSync(homesteadKeyPath),
              cert: fs.readFileSync(homesteadCertPath),
            },
          }
        : {}),
      watch: {
        usePolling: true,
        ignored: ['**/vendor/**', '**/postfix/**', '**/storage/**'],
      },
    },
    plugins: [
      solid(),
      laravel({
        input: [
          'resources/css/app.css',
          'resources/js/app.tsx',
          'resources/js/webauthn/authenticate.js',
          'resources/js/webauthn/register.js',
        ],
      }),
    ],
    base: '',
    resolve: {
      alias: {
        'ziggy-js': resolve('vendor/tightenco/ziggy'),
      },
    },
  }
})
