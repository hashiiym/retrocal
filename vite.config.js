import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  if (env.GROQ_API_KEY && !process.env.GROQ_API_KEY) {
    process.env.GROQ_API_KEY = env.GROQ_API_KEY
  }

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'vite-plugin-api-chat-dev',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.url && req.url.split('?')[0] === '/api/chat') {
              try {
                const { default: handler } = await import('./api/chat.js')
                let body = ''
                req.on('data', chunk => { body += chunk })
                req.on('end', async () => {
                  try {
                    req.body = body ? JSON.parse(body) : {}
                  } catch {
                    req.body = body
                  }
                  res.status = (code) => {
                    res.statusCode = code
                    return res
                  }
                  res.json = (data) => {
                    res.setHeader('Content-Type', 'application/json')
                    res.end(JSON.stringify(data))
                    return res
                  }
                  await handler(req, res)
                })
              } catch (err) {
                res.statusCode = 500
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: err.message }))
              }
            } else {
              next()
            }
          })
        }
      }
    ],
  }
})


