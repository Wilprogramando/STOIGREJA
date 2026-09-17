import { defineConfig, Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'

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

/**
 * Escreve dentro do dist/sw.js a lista de arquivos desta publicacao.
 *
 * E o que garante o modo offline de verdade: o service worker baixa todos eles
 * de uma vez na instalacao, em vez de contar com o usuario ter aberto cada
 * tela com internet. A versao muda a cada publicacao - e e isso que faz o
 * navegador reinstalar o service worker e guardar os arquivos novos.
 */
function swOffline(): Plugin {
  return {
    name: 'sw-offline',
    apply: 'build',
    closeBundle() {
      const caminhoSw = path.resolve('dist/sw.js')
      if (!fs.existsSync(caminhoSw)) return

      const arquivos: string[] = []

      const varrer = (pasta: string, prefixo: string) => {
        for (const item of fs.readdirSync(pasta, { withFileTypes: true })) {
          const dentro = path.join(pasta, item.name)
          if (item.isDirectory()) {
            varrer(dentro, prefixo + '/' + item.name)
          } else if (item.name !== 'sw.js' && item.name !== 'index.html') {
            arquivos.push(prefixo + '/' + item.name)
          }
        }
      }

      varrer(path.resolve('dist'), '')

      const versao = createHash('sha1').update(arquivos.join('|')).digest('hex').slice(0, 10)

      const texto = fs
        .readFileSync(caminhoSw, 'utf8')
        .replace("const VERSAO = 'dev'; /*__VERSAO__*/", "const VERSAO = '" + versao + "';")
        .replace(
          'const ARQUIVOS_DO_APP = []; /*__ARQUIVOS__*/',
          'const ARQUIVOS_DO_APP = ' + JSON.stringify(arquivos) + ';'
        )

      fs.writeFileSync(caminhoSw, texto)
      console.log('Modo offline: ' + arquivos.length + ' arquivos guardados, versao ' + versao)
    }
  }
}

export default defineConfig({
  plugins: [react(), apiDev(), swOffline()],
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
