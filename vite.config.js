import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { handlePublicApi } from './public-api.mjs'

const localApi = {
  name: 'sms-local-api',
  configureServer(server) {
    server.middlewares.use(async (request, response, next) => {
      if (!(await handlePublicApi(request, response))) next()
    })
  },
}

export default defineConfig({ plugins: [react(), tailwindcss(), localApi] })
