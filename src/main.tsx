import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import './tema.css'
import { sincronizarPendentes } from './services/db'
import { aplicarTema, acompanharAparelho } from './services/tema'
import { garantirSaidaDaAbertura } from './services/abertura'

// A aparencia escolhida entra antes de desenhar a tela, para nao piscar branco.
aplicarTema()
acompanharAparelho()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Quem tira a abertura do ar é o Dashboard, quando termina de carregar
// (ver services/abertura.ts). Aqui fica só o limite de segurança.
garantirSaidaDaAbertura()

// Guarda o app no navegador para funcionar sem internet.
// Só no site publicado (em https), pois o navegador não permite em http comum.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      // updateViaCache 'none': o navegador tem de baixar o sw.js do servidor,
      // nunca da própria cópia guardada. Sem isso ele podia continuar lendo o
      // arquivo antigo e o app ficava parado numa versão velha.
      .register('/sw.js', { updateViaCache: 'none' })
      .then(registro => {
        console.log('✅ Modo offline ativado')

        // Procura versão nova ao abrir e toda vez que o app volta para a
        // frente (trocou de aba, destravou o celular). É o que faz a
        // publicação chegar sozinha, sem precisar do botão de atualizar.
        const procurarVersaoNova = () => {
          if (document.visibilityState === 'visible') registro.update().catch(() => undefined)
        }

        procurarVersaoNova()
        document.addEventListener('visibilitychange', procurarVersaoNova)
      })
      .catch(err => console.warn('⚠️ Não foi possível ativar o modo offline:', err))
  })

  // Entrou uma versão nova: recarrega uma única vez, para a tela não continuar
  // pedindo arquivos da versão antiga que acabou de ser substituída.
  // Na primeira visita o app ainda não tinha versão nenhuma: nada a recarregar.
  const tinhaVersaoAntiga = !!navigator.serviceWorker.controller
  let jaRecarregou = false

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (jaRecarregou || !tinhaVersaoAntiga) return
    jaRecarregou = true
    window.location.reload()
  })
}

// Ao abrir, envia o que ficou pendente do último culto sem internet.
sincronizarPendentes()
