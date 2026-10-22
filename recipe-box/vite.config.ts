import type { IncomingMessage, ServerResponse } from 'node:http'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

/** Serves /api/* in `npm run dev` with the same handler Vercel runs in production. */
function apiDev(): Plugin {
  return {
    name: 'recipe-box-api-dev',
    configureServer(server) {
      // .env.local etc. -> process.env so the server code sees ANTHROPIC_API_KEY, RECIPE_IMPORT_PASSCODE
      for (const [k, v] of Object.entries(loadEnv(server.config.mode, server.config.envDir, ''))) {
        process.env[k] ??= v
      }
      server.middlewares.use('/api', async (req: IncomingMessage, res: ServerResponse) => {
        try {
          const name = /^\/([a-z-]+)(?:\?|$)/.exec(req.url ?? '')?.[1]
          if (!name) {
            res.statusCode = 404
            return res.end('Not found')
          }
          const chunks: Buffer[] = []
          for await (const c of req) chunks.push(c as Buffer)
          const headers = new Headers()
          for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string') headers.set(k, v)
          const request = new Request(`http://localhost/api/${name}`, {
            method: req.method,
            headers,
            body: req.method === 'GET' || req.method === 'HEAD' ? undefined : Buffer.concat(chunks),
          })
          const mod = await server.ssrLoadModule(`/api/${name}.ts`)
          const response: Response = await mod.default.fetch(request)
          res.statusCode = response.status
          response.headers.forEach((v, k) => res.setHeader(k, v))
          res.end(Buffer.from(await response.arrayBuffer()))
        } catch (e) {
          res.statusCode = 500
          res.end(String(e))
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), apiDev()],
})
