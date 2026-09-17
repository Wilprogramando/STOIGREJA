/**
 * Service Worker - faz o sistema abrir mesmo sem internet.
 *
 * Guarda o app inteiro (HTML, JS, CSS, imagens) no aparelho. Depois disso, se
 * a internet cair na igreja - ou se o celular estiver naquele wi-fi da mesa de
 * som, que conecta mas não navega -, a página continua abrindo normalmente.
 *
 * O que NÃO fica guardado: as chamadas de /api/ (busca de letras na internet).
 * Elas são respostas que mudam - guardá-las fazia o aparelho continuar
 * mostrando uma letra antiga mesmo depois do servidor já ter sido corrigido.
 * As letras dos hinos cadastrados não passam por aqui: ficam salvas no próprio
 * aparelho e abrem offline.
 *
 * ---------------------------------------------------------------------------
 * POR QUE O APP DEIXAVA DE ABRIR OFFLINE
 *
 * Cada publicação gera arquivos com nome novo (index-AbC123.js). A versão
 * anterior guardava o index.html novo em segundo plano, mas NÃO guardava os
 * arquivos novos que ele pede - eles só seriam baixados na próxima vez que a
 * página abrisse com internet. Quem abrisse offline antes disso recebia um
 * index.html pedindo arquivos que não existiam no aparelho: tela branca.
 *
 * Agora a lista de arquivos da versão publicada é gravada aqui dentro na hora
 * do build (ARQUIVOS_DO_APP) e todos eles são baixados juntos na instalação.
 * E o index.html novo só substitui o antigo depois que os arquivos que ele
 * pede já estiverem guardados.
 * ---------------------------------------------------------------------------
 *
 * Cuidado especial com wi-fi "sem internet": esse tipo de rede responde
 * qualquer endereço com a própria página de login. Se ela fosse guardada no
 * lugar do app, o sistema deixava de abrir. Por isso só guardamos resposta que
 * realmente veio do nosso site e que se parece com o nosso index.html.
 */

// Trocados na publicação pelo vite.config.ts. Em desenvolvimento ficam assim.
const VERSAO = 'dev'; /*__VERSAO__*/
const ARQUIVOS_DO_APP = []; /*__ARQUIVOS__*/

const CACHE = `repertorio-igreja-${VERSAO}`;
const ESSENCIAIS = ['/', '/index.html', '/manifest.webmanifest', '/favicon.svg'];

/** Espera no máximo esse tempo pela rede antes de usar a cópia salva (ms). */
const PRAZO_REDE = 4000;

/**
 * A resposta veio mesmo do nosso site?
 *
 * Em rede com portal de login a resposta chega com desvio (redirected) ou de
 * outra origem (type diferente de "basic"). Nesses casos não guardamos nada.
 */
function respostaConfiavel(resposta) {
  return !!resposta && resposta.status === 200 && resposta.type === 'basic' && !resposta.redirected;
}

/** É mesmo a página do sistema, e não a tela de login de um wi-fi? */
function pareceNossoIndex(html) {
  return html.includes('id="root"') && html.includes('src=');
}

/** Endereços do nosso site que o index.html manda carregar. */
function arquivosCitados(html) {
  const encontrados = new Set();
  const regex = /(?:src|href)="(\/[^"]+)"/g;
  let achado;

  while ((achado = regex.exec(html)) !== null) {
    encontrados.add(achado[1]);
  }

  return [...encontrados];
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

/**
 * Guarda a página nova - mas só junto com os arquivos que ela precisa.
 *
 * Se algum deles não vier (internet ruim, portal de login no caminho), nada é
 * trocado: continua valendo a versão anterior, que abre offline inteira.
 */
async function guardarAppCompleto(respostaIndex) {
  if (!respostaConfiavel(respostaIndex)) return false;

  const html = await respostaIndex.clone().text();
  if (!pareceNossoIndex(html)) return false;

  const cache = await caches.open(CACHE);

  /** Baixa e guarda; devolve false se não deu. */
  const guardar = async url => {
    try {
      // Já está guardado desta versão? Não precisa baixar de novo.
      if (await cache.match(url)) return true;

      const resposta = await fetch(url, { cache: 'reload' });
      if (!respostaConfiavel(resposta)) return false;

      await cache.put(url, resposta);
      return true;
    } catch {
      return false;
    }
  };

  // Obrigatórios: sem eles a página não abre. Se um só falhar, desistimos da
  // troca e continuamos com a versão anterior, que abre offline inteira.
  const obrigatorios = arquivosCitados(html);
  const resultados = await Promise.all(obrigatorios.map(guardar));
  if (resultados.some(deu => !deu)) return false;

  await cache.put('/index.html', respostaIndex.clone());

  // Desejáveis: arquivos que só são baixados quando o usuário entra numa tela
  // específica (gerar PDF, por exemplo). Faltar um deles não impede o app de
  // abrir, então não seguram a atualização.
  const desejaveis = ARQUIVOS_DO_APP.filter(url => !obrigatorios.includes(url));
  await Promise.all(desejaveis.map(guardar));

  return true;
}

self.addEventListener('install', event => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);

      // Arquivos soltos (ícone, manifesto): falta de um não pode travar nada.
      await Promise.all(ESSENCIAIS.map(url => cache.add(url).catch(() => undefined)));

      // O app em si: página + todos os arquivos da versão publicada.
      try {
        const index = await fetch('/index.html', { cache: 'reload' });
        await guardarAppCompleto(index);
      } catch {
        // Instalando sem internet: fica com o que já havia sido guardado antes.
      }

      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(nomes =>
        Promise.all(nomes.filter(nome => nome !== CACHE).map(nome => caches.delete(nome)))
      )
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

  // Navegação (abrir/atualizar a página): abre na hora com a cópia salva e
  // procura a versão nova em segundo plano. Assim o app abre sempre, mesmo em
  // rede ruim ou com portal de login no caminho.
  if (req.mode === 'navigate') {
    event.respondWith(
      caches.match('/index.html').then(salvo => {
        const daRede = buscarComPrazo('/index.html')
          .then(async resposta => {
            const guardou = await guardarAppCompleto(resposta);
            if (guardou) return resposta;

            // Portal de login, erro ou versão incompleta: nada é trocado.
            if (salvo) return salvo;
            return resposta;
          })
          .catch(() => salvo);

        if (salvo) {
          event.waitUntil(daRede.catch(() => undefined));
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
      if (cacheado) {
        return cacheado;
      }

      return fetch(req)
        .then(resposta => {
          if (respostaConfiavel(resposta)) {
            const copia = resposta.clone();
            caches.open(CACHE).then(cache => cache.put(req, copia));
            return resposta;
          }

          // Resposta de portal de login no lugar de um arquivo do app: melhor
          // falhar do que entregar uma página de login como se fosse o sistema.
          if (respostaConfiavel(resposta) === false && resposta.redirected) {
            return new Response('', { status: 504, statusText: 'rede sem internet' });
          }

          return resposta;
        })
        .catch(() => new Response('', { status: 504, statusText: 'sem internet' }));
    })
  );
});
