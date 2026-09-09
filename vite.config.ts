import { defineConfig, Plugin } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Faz a pasta /api funcionar no `npm run dev`.
 * Em producao quem cuida disso e a Vercel; aqui o Vite chama o mesmo arquivo.
 */
function apiDev(): Plugin {
  return {
    name: 'api-dev',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) return next()

        const url = new URL(req.url, 'http://localhost')
        const rota = url.pathname.replace('/api/', '')

        try {
          const modulo = await server.ssrLoadModule(`/api/${rota}.js`)
          const requisicao = {
            ...req,
            query: Object.fromEntries(url.searchParams),
            headers: req.headers
          }
          const resposta = {
            setHeader: (nome: string, valor: string) => res.setHeader(nome, valor),
            status(codigo: number) {
              res.statusCode = codigo
              return this
            },
            json(dados: unknown) {
              res.setHeader('content-type', 'application/json')
              res.end(JSON.stringify(dados))
            }
          }
          await modulo.default(requisicao, resposta)
        } catch (erro) {
          console.error('Erro na rota /api:', erro)
          res.statusCode = 500
          res.end(JSON.stringify({ erro: 'Erro interno' }))
        }
      })
    }
  }
}

export default defineConfig({
  plugins: [react(), apiDev()],
  resolve: {
    extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json']
  },
  server: {
    port: 5173,
    open: true
  },
  build: {
    chunkSizeWarningLimit: 1500,
    sourcemap: false,
    minify: 'terser'
  }
})
