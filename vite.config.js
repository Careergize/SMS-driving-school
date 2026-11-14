import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { handlePublicApi } from './public-api.mjs'
import { copyFile, mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'

const localApi = {
  name: 'sms-local-api',
  configureServer(server) {
    server.middlewares.use(async (request, response, next) => {
      if (!(await handlePublicApi(request, response))) next()
    })
  },
}

const publicPages = {
  name: 'sms-public-pages',
  apply: 'build',
  async writeBundle({ dir }) {
    await Promise.all(['about', 'blog', 'blog/instagram'].map(async route => {
      const directory = resolve(dir, route)
      await mkdir(directory, { recursive: true })
      await copyFile(resolve(dir, 'index.html'), resolve(directory, 'index.html'))
    }))
  },
}

export default defineConfig({ plugins: [react(), tailwindcss(), localApi, publicPages] })
