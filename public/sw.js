/**
 * Service Worker - faz o sistema abrir mesmo sem internet.
 *
 * Guarda o app (HTML, JS, CSS, fontes, imagens) no navegador na primeira visita.
 * Depois disso, se a internet cair na igreja, a página continua abrindo normalmente.
 */

const CACHE = 'repertorio-igreja-v2';
const ESSENCIAIS = ['/', '/index.html', '/manifest.webmanifest', '/favicon.svg', '/padrao-musical.svg'];

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
  if (new URL(req.url).origin !== self.location.origin) return;

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
