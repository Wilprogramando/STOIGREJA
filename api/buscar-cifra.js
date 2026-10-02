/**
 * BUSCAR CIFRA NO CIFRA CLUB
 *
 * Roda no servidor (Vercel) porque o site do Cifra Club nao libera CORS: o
 * navegador nao consegue chamar direto. O front manda o nome da musica (ou um
 * pedaco da letra) e recebe de volta nome, artista, tom e a cifra pronta.
 *
 *   GET /api/buscar-cifra?q=poderoso+deus              -> lista de resultados
 *   GET /api/buscar-cifra?dns=fernandinho&url=1234     -> cifra completa
 *
 * O conteudo e do Cifra Club e dos autores das musicas: isto aqui so traz para
 * dentro do app o que a pagina deles mostra, para uso no culto.
 */

// O site devolve 403 para quem nao parece um navegador de verdade, por isso o
// cabecalho vai completo, do jeito que o Chrome manda.
const CABECALHOS = {
  'user-agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'accept-language': 'pt-BR,pt;q=0.9,en;q=0.8',
  'sec-ch-ua': '"Chromium";v="131", "Not_A Brand";v="24"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"Windows"',
  'sec-fetch-dest': 'document',
  'sec-fetch-mode': 'navigate',
  'sec-fetch-site': 'same-origin',
  'upgrade-insecure-requests': '1',
};

/** Tira acento e pontuacao para comparar nomes de musica. */
function normalizar(texto) {
  return (texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Converte entidades HTML (&aacute;, &#39;, ...) em texto normal. */
function decodificar(texto) {
  const nomeadas = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

  return texto
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (inteiro, nome) => {
      const chave = nome.toLowerCase();
      if (nomeadas[chave]) return nomeadas[chave];

      const acentos = {
        acute: '\u0301', grave: '\u0300', circ: '\u0302', tilde: '\u0303',
        uml: '\u0308', cedil: '\u0327',
      };
      const m = /^([a-z])(acute|grave|circ|tilde|uml|cedil)$/i.exec(nome);
      if (m) return (m[1] + acentos[m[2].toLowerCase()]).normalize('NFC');

      return inteiro;
    });
}

/**
 * Busca no autocomplete do Cifra Club (mesmo servidor de busca do Letras,
 * noutra pasta: /cc/ em vez de /letras/).
 */
async function buscarPorNome(termo) {
  const alvo = `https://solr.sscdn.co/cc/h2/?q=${encodeURIComponent(termo)}&wt=json`;

  const resposta = await fetch(alvo, { headers: CABECALHOS });
  const bruto = await resposta.text();

  // A resposta vem embrulhada numa chamada de funcao: CifraClubSug({...}).
  const inicio = bruto.indexOf('{');
  const fim = bruto.lastIndexOf('}');
  if (inicio < 0 || fim < 0) return [];

  let dados;
  try {
    dados = JSON.parse(bruto.slice(inicio, fim + 1));
  } catch {
    return [];
  }

  const docs = (dados.response && dados.response.docs) || [];

  // Os campos vem abreviados: m = musica, a = artista, d = pasta do artista,
  // u = pasta da musica. Juntos formam cifraclub.com.br/<d>/<u>/.
  return docs
    // t === '2' sao musicas; o resto e artista/album.
    .filter((d) => d.m && d.d && d.u && String(d.t) === '2')
    .slice(0, 12)
    .map((d) => ({
      nome: d.m,
      artista: d.a || '',
      dns: d.d,
      url: String(d.u),
    }));
}

/**
 * Procura pela letra, e nao pelo nome: usa a busca do proprio site, que acha
 * musica por um trecho do refrao. E o caminho de quando a pessoa sabe cantar
 * o pedaco mas nao lembra o nome.
 */
async function buscarPorLetra(termo) {
  const pagina = `https://www.cifraclub.com.br/?q=${encodeURIComponent(termo)}`;
  const html = await abrirPagina(pagina);
  if (!html) return [];

  const achados = [];
  const vistos = new Set();

  // Os resultados sao links /artista/musica/ dentro da lista de busca.
  const padrao = /<a[^>]+href="\/([a-z0-9-]+)\/([a-z0-9-]+)\/"[^>]*>([\s\S]*?)<\/a>/gi;
  let item;

  while ((item = padrao.exec(html)) !== null && achados.length < 12) {
    const [, dns, url, dentro] = item;
    const texto = decodificar(dentro.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

    // Links de menu e rodape nao tem titulo de musica dentro.
    if (!texto || texto.length > 90) continue;

    const chave = `${dns}/${url}`;
    if (vistos.has(chave)) continue;
    vistos.add(chave);

    achados.push({ nome: texto, artista: dns.replace(/-/g, ' '), dns, url });
  }

  return achados;
}

/**
 * Abre uma pagina e devolve o HTML.
 *
 * O Cifra Club recusa parte dos acessos que vem do servidor da Vercel, por
 * causa do endereco de onde partem - cabecalho de navegador nao resolve.
 * Quando isso acontece, a mesma pagina e aberta atraves de um leitor publico,
 * que devolve o HTML igualzinho. Mesma solucao do api/buscar-letra.js.
 */
async function abrirPagina(pagina) {
  try {
    const direta = await fetch(pagina, { headers: CABECALHOS });
    if (direta.ok) return await direta.text();
  } catch {
    // Segue para o plano B.
  }

  try {
    const pelaLeitura = await fetch(`https://r.jina.ai/${pagina}`, {
      headers: { ...CABECALHOS, 'x-return-format': 'html' },
    });
    if (!pelaLeitura.ok) return null;
    return await pelaLeitura.text();
  } catch {
    return null;
  }
}

/**
 * Transforma o <pre> da pagina em texto puro, mantendo os acordes na linha de
 * cima e a letra embaixo - que e justamente o formato do Cifra Club.
 *
 * Os acordes vem marcados em <b> dentro do <pre>; o alinhamento e feito por
 * espacos, entao e so tirar as tags sem mexer em mais nada.
 */
function limparCifra(pre) {
  return decodificar(
    pre
      .replace(/<br\s*\/?>/gi, '\n')
      // Nao se inventa quebra no fim das <div>: cada linha ja vem com a sua,
      // e acrescentar outra deixava uma linha vazia entre acorde e letra.
      .replace(/<[^>]+>/g, '')
  )
    .replace(/\r/g, '')
    .replace(/\t/g, '    ')
    .split('\n')
    // Tira espaco so do fim: o do comeco e o que alinha o acorde com a silaba.
    .map((linha) => linha.replace(/\s+$/, ''))
    .join('\n')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
}

/**
 * Nome do artista da pagina.
 *
 * A pagina tem varios <h2> ("Menu principal", "Todos artistas"...) e a posicao
 * do artista nao e garantida. Entao a pasta do artista no endereco
 * (david-quinlan) e usada como gabarito: vale o <h2> que, sem acento nem
 * pontuacao, der no mesmo nome. Assim sai "Antonio Cirilo" escrito certinho,
 * "Antonio Cirilo", e nunca um pedaco do menu. Nao achando, usa a propria
 * pasta com as iniciais em maiusculo.
 */
function acharArtista(html, dns) {
  const gabarito = normalizar(dns.replace(/-/g, ' '));

  for (const achado of html.matchAll(/<h2[^>]*>([\s\S]{1,120}?)<\/h2>/gi)) {
    const texto = decodificar(achado[1].replace(/<[^>]+>/g, '').trim());
    if (texto && normalizar(texto) === gabarito) return texto;
  }

  return dns
    .split('-')
    .map((parte) => parte.charAt(0).toUpperCase() + parte.slice(1))
    .join(' ');
}

/** Abre a pagina da musica e extrai cifra, tom e afinacao. */
async function buscarCifra(dns, url) {
  const pagina = `https://www.cifraclub.com.br/${encodeURIComponent(dns)}/${encodeURIComponent(url)}/`;
  const html = await abrirPagina(pagina);
  if (!html) return null;

  // A cifra inteira mora num <pre> (acordes em <b>, letra em texto solto).
  const bloco = /<pre[^>]*>([\s\S]*?)<\/pre>/i.exec(html);
  if (!bloco) return null;

  const cifra = limparCifra(bloco[1]);
  if (!cifra) return null;

  const tituloTag = /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html);

  /*
   * O tom nao vem escrito na pagina (a versao atual do site monta isso no
   * navegador). O que da para saber com seguranca e o primeiro acorde, que
   * nas musicas de louvor e o tom em quase todos os casos - e cada acorde vem
   * marcado em data-chord-name, sem depender do alinhamento do texto.
   *
   * Nao e chute as cegas: quem for tocar ve o tom na tela e corrige em um
   * toque se estiver errado.
   */
  const primeiroAcorde = /<b[^>]*data-chord-name="([^"]+)"/i.exec(bloco[1]);
  const tomTag = primeiroAcorde || /data-tom="([A-G][#b]?m?)"/i.exec(html);

  const afinacaoTag = /afina[^<]{0,20}<\/[^>]+>\s*([^<]{1,30})</i.exec(html);

  return {
    nome: tituloTag ? decodificar(tituloTag[1].replace(/<[^>]+>/g, '').trim()) : '',
    artista: acharArtista(html, dns),
    tom: tomTag ? tomTag[1] : '',
    afinacao: afinacaoTag ? afinacaoTag[1].trim() : '',
    cifra,
    fonte: pagina,
  };
}

export default async function handler(req, res) {
  const { q = '', dns = '', url = '' } = req.query || {};

  // Só o que deu certo fica guardado: uma resposta de erro em cache prenderia
  // o problema por uma hora, mesmo depois de arrumado.
  res.setHeader('Cache-Control', 'no-store');
  const guardar = () =>
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');

  try {
    // Modo 2: ja sei qual musica quero, so trago a cifra.
    if (dns && url) {
      const achado = await buscarCifra(dns, url);
      if (!achado) return res.status(404).json({ erro: 'Cifra nao encontrada' });

      guardar();
      return res.status(200).json(achado);
    }

    const termo = String(q).trim();
    if (!termo) return res.status(400).json({ erro: 'Informe o nome da musica ou um trecho da letra' });

    // Primeiro pelo nome (busca rapida); nao achando, procura pela letra.
    let resultados = await buscarPorNome(termo);
    if (resultados.length === 0) resultados = await buscarPorLetra(termo);

    if (resultados.length === 0) {
      return res.status(404).json({ erro: 'Nenhuma cifra encontrada', resultados: [] });
    }

    // Nome exato: ja devolve a cifra pronta, poupando um clique.
    const primeiro = resultados[0];
    if (normalizar(primeiro.nome) === normalizar(termo)) {
      const achado = await buscarCifra(primeiro.dns, primeiro.url);
      if (achado) {
        guardar();
        return res.status(200).json({
          ...achado,
          nome: achado.nome || primeiro.nome,
          artista: achado.artista || primeiro.artista,
          resultados,
        });
      }
    }

    guardar();
    return res.status(200).json({ resultados });
  } catch (erro) {
    console.error('Erro ao buscar cifra:', erro);
    return res.status(500).json({ erro: 'Nao foi possivel buscar a cifra agora' });
  }
}
