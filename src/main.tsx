import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { sincronizarPendentes } from './services/db'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Guarda o app no navegador para funcionar sem internet.
// Só no site publicado (em https), pois o navegador não permite em http comum.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then(() => console.log('✅ Modo offline ativado'))
      .catch(err => console.warn('⚠️ Não foi possível ativar o modo offline:', err))
  })
}

// Ao abrir, envia o que ficou pendente do último culto sem internet.
sincronizarPendentes()
