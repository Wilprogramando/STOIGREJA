/**
 * Service Worker - faz o sistema abrir mesmo sem internet.
 *
 * Guarda o app (HTML, JS, CSS, fontes, imagens) no navegador na primeira visita.
 * Depois disso, se a internet cair na igreja, a página continua abrindo normalmente.
 *
 * O que NÃO fica guardado: as chamadas de /api/ (busca de letras). Elas são
 * respostas que mudam - guardá-las fazia o aparelho continuar mostrando uma
 * letra antiga, ou errada, mesmo depois do servidor já ter sido corrigido.
 *
 * Cuidado especial com wi-fi "sem internet" (o da mesa de som, por exemplo):
 * esse tipo de rede responde qualquer endereço com a própria página de login.
 * Se essa página fosse guardada no lugar do app, o sistema deixava de abrir.
 * Por isso só guardamos resposta que realmente veio do nosso site.
 */

const CACHE = 'repertorio-igreja-v4';
const ESSENCIAIS = ['/', '/index.html', '/manifest.webmanifest', '/favicon.svg'];

/** Espera no máximo esse tempo pela rede antes de usar a cópia salva (ms). */
const PRAZO_REDE = 4000;

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

/**
 * A resposta veio mesmo do nosso site?
 *
 * Em rede com portal de login a resposta chega com desvio (redirected) ou de
 * outra origem (type diferente de "basic"). Nesses casos não guardamos nada.
 */
function respostaConfiavel(resposta) {
  return !!resposta && resposta.status === 200 && resposta.type === 'basic' && !resposta.redirected;
}

/** fetch que desiste depois de PRAZO_REDE, para a tela nunca ficar pendurada. */
function buscarComPrazo(req) {
  return new Promise((resolve, reject) => {
    const relogio = setTimeout(() => reject(new Error('tempo esgotado')), PRAZO_REDE);
    fetch(req).then(
      resposta => {
        clearTimeout(relogio);
        resolve(resposta);
      },
      erro => {
        clearTimeout(relogio);
        reject(erro);
      }
    );
  });
}

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

  // Navegação (abrir/atualizar a página): abre na hora com a cópia salva e
  // busca a versão nova em segundo plano. Assim o app abre sempre, mesmo em
  // rede ruim ou com portal de login no caminho.
  if (req.mode === 'navigate') {
    event.respondWith(
      caches.match('/index.html').then(salvo => {
        const daRede = buscarComPrazo(req)
          .then(resposta => {
            if (respostaConfiavel(resposta)) {
              const copia = resposta.clone();
              caches.open(CACHE).then(cache => cache.put('/index.html', copia));
              return resposta;
            }
            // Página de portal de login (ou erro): não guarda e não mostra.
            if (salvo) return salvo;
            return resposta;
          })
          .catch(() => salvo);

        if (salvo) {
          event.waitUntil(daRede);
          return salvo;
        }
        return daRede;
      })
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
          if (respostaConfiavel(resposta)) {
            const copia = resposta.clone();
            caches.open(CACHE).then(cache => cache.put(req, copia));
            return resposta;
          }
          return cacheado || resposta;
        })
        .catch(() => cacheado);

      if (cacheado) {
        event.waitUntil(daRede.catch(() => undefined));
        return cacheado;
      }
      return daRede;
    })
  );
});
