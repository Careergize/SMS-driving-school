import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { handlePublicApi } from './public-api.mjs'
import { handleThemeSite } from './theme-site.mjs'
import { copyFile, mkdir, cp, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { registrationPage } from './registration-page.mjs'

const localApi = {
  name: 'sms-local-api',
  configureServer(server) {
    server.middlewares.use(async (request, response, next) => {
      if (await handlePublicApi(request, response)) return
      if (['/register', '/register/'].includes(new URL(request.url, 'http://localhost').pathname)) {
        const html = await server.transformIndexHtml('/register/', await registrationPage('<script type="module" src="/src/main.jsx"></script>'))
        response.setHeader('Content-Type', 'text/html; charset=utf-8')
        response.end(html)
        return
      }
      if (await handleThemeSite(request, response, { assets: false })) return
      next()
    })
  },
}

const publicPages = {
  name: 'sms-public-pages',
  apply: 'build',
  async writeBundle({ dir }) {
    await Promise.all(['about', 'blog', 'blog/instagram', 'register'].map(async route => {
      const directory = resolve(dir, route)
      await mkdir(directory, { recursive: true })
      await copyFile(resolve(dir, 'index.html'), resolve(directory, 'index.html'))
      if (route === 'register') {
        const path = resolve(directory, 'index.html')
        const html = await readFile(path, 'utf8')
        await writeFile(path, await registrationPage(html))
      }
    }))
    await cp(resolve('theme/pages'), resolve(dir), { recursive: true })
  },
}

export default defineConfig({ plugins: [react(), tailwindcss(), localApi, publicPages] })
