/**
 * Teste do service worker sem navegador: simula cache, rede e as situações
 * reais da igreja (publicação nova, wi-fi da mesa de som, sem internet).
 */
const fs = require('fs');
const vm = require('vm');

function criarAmbiente(servidor) {
  const armazens = new Map();

  class Resposta {
    constructor(corpo, opcoes = {}) {
      this.corpo = corpo;
      this.status = opcoes.status ?? 200;
      this.type = opcoes.type ?? 'basic';
      this.redirected = opcoes.redirected ?? false;
    }
    clone() {
      return new Resposta(this.corpo, { status: this.status, type: this.type, redirected: this.redirected });
    }
    async text() {
      return this.corpo;
    }
  }

  const caches = {
    async open(nome) {
      if (!armazens.has(nome)) armazens.set(nome, new Map());
      const mapa = armazens.get(nome);
      const chave = u => new URL(u && u.url ? u.url : String(u), 'https://app.igreja').href;
      return {
        async match(url) {
          return mapa.get(chave(url)) || undefined;
        },
        async put(url, resp) {
          mapa.set(chave(url), resp);
        },
        async add(url) {
          const r = await ambiente.fetch(url);
          if (r.status !== 200) throw new Error('falhou');
          mapa.set(chave(url), r);
        }
      };
    },
    async match(url) {
      for (const mapa of armazens.values()) { const k = new URL(url && url.url ? url.url : String(url), 'https://app.igreja').href; if (mapa.has(k)) return mapa.get(k); }
      return undefined;
    },
    async keys() {
      return [...armazens.keys()];
    },
    async delete(nome) {
      return armazens.delete(nome);
    }
  };

  const ouvintes = {};
  const ambiente = {
    console,
    setTimeout,
    clearTimeout,
    Promise,
    Set,
    URL,
    Response: Resposta,
    caches,
    armazens,
    fetch: url => servidor(String(url), Resposta),
    self: {
      location: { origin: 'https://app.igreja' },
      addEventListener: (nome, fn) => (ouvintes[nome] = fn),
      skipWaiting: async () => undefined,
      clients: { claim: async () => undefined }
    },
    ouvintes
  };

  ambiente.self.caches = caches;
  vm.createContext(ambiente);
  vm.runInContext(fs.readFileSync('dist/sw.js', 'utf8'), ambiente);
  return ambiente;
}

/** Dispara install/activate e espera o waitUntil. */
async function disparar(amb, nome, extra = {}) {
  const esperas = [];
  const evento = {
    ...extra,
    esperas,
    waitUntil: p => {
      esperas.push(p);
    },
    respondWith: p => {
      evento.resposta = p;
    }
  };
  amb.ouvintes[nome](evento);
  await Promise.all(esperas.map(p => p.catch(() => undefined)));
  return evento;
}

/** Servidor falso com os arquivos da "versão publicada". */
function servidorDoApp(versao, { portal = false, caiu = false } = {}) {
  const index = `<!doctype html><html><body><div id="root"></div><script type="module" src="/assets/index-${versao}.js"></script><link href="/assets/index-${versao}.css"></body></html>`;

  return (url, Resposta) => {
    if (caiu) return Promise.reject(new Error('sem internet'));
    if (portal) return Promise.resolve(new Resposta('<html>Faça login no wi-fi</html>', { type: 'opaqueredirect', redirected: true }));

    const caminho = url.replace('https://app.igreja', '');
    if (caminho === '/' || caminho === '/index.html') return Promise.resolve(new Resposta(index));
    if (caminho.includes(versao) || ['/manifest.webmanifest', '/favicon.svg', '/icone.svg'].includes(caminho))
      return Promise.resolve(new Resposta('conteudo ' + caminho));
    return Promise.resolve(new Resposta('nao existe', { status: 404 }));
  };
}

async function navegar(amb) {
  const evento = await disparar(amb, 'fetch', {
    request: { method: 'GET', url: 'https://app.igreja/', mode: 'navigate' }
  });
  const resposta = await evento.resposta;
  const texto = resposta ? await resposta.text() : null;
  for (let i = 0; i < 5; i++) await Promise.all(evento.esperas.map(p => p.catch(() => undefined)));
  return texto;
}

async function pedirArquivo(amb, url) {
  const evento = await disparar(amb, 'fetch', {
    request: { method: 'GET', url, mode: 'cors' }
  });
  const resposta = await evento.resposta;
  return resposta ? resposta.status : null;
}

function ok(condicao, texto) {
  console.log((condicao ? 'PASSOU ' : 'FALHOU ') + texto);
  if (!condicao) process.exitCode = 1;
}

(async () => {
  // A lista gravada no build é da versão real do dist; para o teste usamos a
  // leitura do proprio index, entao apontamos o servidor para os mesmos nomes.
  const arquivos = JSON.parse(
    fs.readFileSync('dist/sw.js', 'utf8').match(/const ARQUIVOS_DO_APP = (\[.*?\]);/)[1]
  );
  const servidorReal = (url, Resposta) => {
    const caminho = url.replace('https://app.igreja', '');
    if (caminho === '/' || caminho === '/index.html')
      return Promise.resolve(
        new Resposta(fs.readFileSync('dist/index.html', 'utf8'))
      );
    if (arquivos.includes(caminho)) return Promise.resolve(new Resposta('conteudo ' + caminho));
    return Promise.resolve(new Resposta('nao existe', { status: 404 }));
  };

  // 1) Instalação com internet: tudo do app tem de ficar guardado.
  let estaOffline = false;
  const amb = criarAmbiente((url, R) => (estaOffline ? Promise.reject(new Error('sem internet')) : servidorReal(url, R)));
  await disparar(amb, 'install');
  await disparar(amb, 'activate');

  const guardados = [...amb.armazens.values()][0];
  ok(guardados.has('https://app.igreja/index.html'), 'index.html guardado na instalacao');
  ok(arquivos.every(a => guardados.has('https://app.igreja'+a)), `todos os ${arquivos.length} arquivos da versao guardados (${arquivos.filter(a => !guardados.has('https://app.igreja'+a)).join(', ') || 'nenhum faltando'})`);

  // 2) Sem internet: a página tem de abrir e os arquivos vir do aparelho.
  estaOffline = true;
  const html = await navegar(amb);
  ok(!!html && html.includes('id="root"'), 'app abre offline');
  const status = await pedirArquivo(amb, 'https://app.igreja' + arquivos[0]);
  ok(status === 200, 'arquivo do app servido offline (' + arquivos[0] + ')');

  // 3) Wi-fi da mesa de som (portal de login): não pode substituir o app.
  const amb2 = criarAmbiente(servidorDoApp('v1'));
  await disparar(amb2, 'install');
  await disparar(amb2, 'activate');
  amb2.fetch = url => servidorDoApp('v1', { portal: true })(url, amb2.Response);
  const htmlPortal = await navegar(amb2);
  ok(!!htmlPortal && htmlPortal.includes('id="root"'), 'portal de login nao substitui o app');
  const cachePortal = [...amb2.armazens.values()][0];
  ok(!(await cachePortal.get('https://app.igreja/index.html')).corpo.includes('login'), 'index.html do portal nao foi guardado');

  // 4) Publiquei versão nova enquanto ele usava o app: o index novo só vale
  //    depois que os arquivos novos estiverem guardados (era o bug da tela branca).
  const amb3 = criarAmbiente((url, R) => servidorDoApp('v1')(url, R));
  await disparar(amb3, 'install');
  await disparar(amb3, 'activate');

  // Servidor passa a entregar a versao 2, mas os arquivos novos falham (rede ruim).
  amb3.fetch = url => {
    const caminho = String(url).replace('https://app.igreja', '');
    if (caminho === '/' || caminho === '/index.html')
      return Promise.resolve(
        new amb3.Response(
          '<!doctype html><html><body><div id="root"></div><script src="/assets/index-v2.js"></script></body></html>'
        )
      );
    return Promise.reject(new Error('arquivo novo nao veio'));
  };

  await navegar(amb3);
  const cache3 = [...amb3.armazens.values()][0];
  ok(
    (await cache3.get('https://app.igreja/index.html')).corpo.includes('index-v1.js'),
    'versao nova incompleta nao substitui a que abre offline'
  );

  // 5) Agora com a rede boa: a versao 2 entra inteira.
  amb3.fetch = url => servidorDoApp('v2')(String(url), amb3.Response);
  await navegar(amb3);
  const cache3b = [...amb3.armazens.values()][0];
  ok((await cache3b.get('https://app.igreja/index.html')).corpo.includes('index-v2.js'), 'versao nova completa e guardada');
  ok(cache3b.has('https://app.igreja/assets/index-v2.js'), 'arquivos da versao nova guardados junto');
})();
