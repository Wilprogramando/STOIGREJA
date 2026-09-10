/**
 * Service Worker - faz o sistema abrir mesmo sem internet.
 *
 * Guarda o app (HTML, JS, CSS, fontes, imagens) no navegador na primeira visita.
 * Depois disso, se a internet cair na igreja, a página continua abrindo normalmente.
 *
 * O que NÃO fica guardado: as chamadas de /api/ (busca de letras). Elas são
 * respostas que mudam - guardá-las fazia o aparelho continuar mostrando uma
 * letra antiga, ou errada, mesmo depois do servidor já ter sido corrigido.
 */

const CACHE = 'repertorio-igreja-v3';
const ESSENCIAIS = ['/', '/index.html', '/manifest.webmanifest', '/favicon.svg'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then(cache => cache.addAll(ESSENCIAIS))
      .catch(() => undefined)
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(nomes => Promise.all(nomes.filter(nome => nome !== CACHE).map(nome => caches.delete(nome))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;

  // Só cuidamos de leituras do próprio site. Chamadas ao Supabase passam direto.
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Busca de letras e demais rotas do servidor: sempre da internet, nunca do
  // cache. Sem internet a chamada falha, e a tela avisa - melhor do que
  // mostrar uma letra guardada de outra busca.
  if (url.pathname.startsWith('/api/')) return;

  // Navegação (abrir/atualizar a página): tenta a rede, cai para a cópia salva.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(resposta => {
          const copia = resposta.clone();
          caches.open(CACHE).then(cache => cache.put('/index.html', copia));
          return resposta;
        })
        .catch(() => caches.match('/index.html').then(r => r || caches.match('/')))
    );
    return;
  }

  // Arquivos do app: usa a cópia salva na hora e atualiza em segundo plano.
  // Cada versão publicada tem nomes de arquivo próprios (index-AbC123.js),
  // então a cópia salva nunca é de uma versão diferente da que o HTML pediu.
  event.respondWith(
    caches.match(req).then(cacheado => {
      const daRede = fetch(req)
        .then(resposta => {
          if (resposta && resposta.status === 200 && resposta.type === 'basic') {
            const copia = resposta.clone();
            caches.open(CACHE).then(cache => cache.put(req, copia));
          }
          return resposta;
        })
        .catch(() => cacheado);

      return cacheado || daRede;
    })
  );
});
