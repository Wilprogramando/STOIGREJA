/**
 * BUSCAR LETRA NO LETRAS.MUS.BR
 *
 * Roda no servidor (Vercel) porque o site do Letras nao libera CORS: o
 * navegador nao consegue chamar direto. O front manda o nome do hino e
 * recebe de volta nome, cantor e letra ja prontos para o cadastro.
 *
 *   GET /api/buscar-letra?q=poderoso+deus            -> lista de resultados
 *   GET /api/buscar-letra?dns=david-quinlan&url=318735 -> letra completa
 */

const CABECALHOS = {
  'user-agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
  'accept-language': 'pt-BR,pt;q=0.9',
};

/** Tira acento e pontuacao para comparar nomes de hino. */
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
  const nomeadas = {
    amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  };
  return texto
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (inteiro, nome) => {
      const chave = nome.toLowerCase();
      if (nomeadas[chave]) return nomeadas[chave];
      // Acentos no formato &eacute; / &ccedil; / &atilde;
      const acentos = {
        acute: '\u0301', grave: '\u0300', circ: '\u0302', tilde: '\u0303',
        uml: '\u0308', cedil: '\u0327',
      };
      const m = /^([a-z])(acute|grave|circ|tilde|uml|cedil)$/i.exec(nome);
      if (m) return (m[1] + acentos[m[2].toLowerCase()]).normalize('NFC');
      return inteiro;
    });
}

/** Busca sugestoes no autocomplete do Letras. */
async function buscarSugestoes(termo) {
  const alvo = `https://solr.sscdn.co/letras/m1/?q=${encodeURIComponent(termo)}&wt=json`;
  const resposta = await fetch(alvo, { headers: CABECALHOS });
  const bruto = await resposta.text();

  // A resposta vem embrulhada em LetrasSug({...})
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
  return docs
    // t === '2' sao musicas; o resto e artista/album.
    .filter((d) => d.txt && d.dns && d.url && String(d.t) === '2')
    .slice(0, 12)
    .map((d) => ({
      nome: d.txt,
      cantor: d.art || '',
      dns: d.dns,
      url: String(d.url),
    }));
}

/** Abre a pagina da musica e extrai a letra. */
async function buscarLetra(dns, url) {
  const pagina = `https://www.letras.mus.br/${encodeURIComponent(dns)}/${encodeURIComponent(url)}/`;
  const resposta = await fetch(pagina, { headers: CABECALHOS });
  if (!resposta.ok) return null;

  const html = await resposta.text();

  const bloco = /<div[^>]*class="[^"]*lyric-original[^"]*"[^>]*>([\s\S]*?)<\/div>/i.exec(html);
  if (!bloco) return null;

  const letra = decodificar(
    bloco[1]
      .replace(/<\/p\s*>/gi, '\n\n')     // paragrafo = estrofe
      .replace(/<br\s*\/?>/gi, '\n')     // quebra de verso
      .replace(/<[^>]+>/g, '')           // tira o resto das tags
  )
    .replace(/\r/g, '')
    .split('\n')
    .map((linha) => linha.trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (!letra) return null;

  const tituloTag = /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html);
  const cantorTag = /<h2[^>]*>[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i.exec(html);

  return {
    nome: tituloTag ? decodificar(tituloTag[1].replace(/<[^>]+>/g, '').trim()) : '',
    cantor: cantorTag ? decodificar(cantorTag[1].replace(/<[^>]+>/g, '').trim()) : '',
    letra,
    fonte: pagina,
  };
}

export default async function handler(req, res) {
  const { q = '', dns = '', url = '' } = req.query || {};

  res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate');

  try {
    // Modo 2: ja sei qual musica quero, so trago a letra.
    if (dns && url) {
      const achado = await buscarLetra(dns, url);
      if (!achado) return res.status(404).json({ erro: 'Letra nao encontrada' });
      return res.status(200).json(achado);
    }

    const termo = String(q).trim();
    if (!termo) return res.status(400).json({ erro: 'Informe o nome do hino' });

    const sugestoes = await buscarSugestoes(termo);
    if (sugestoes.length === 0) {
      return res.status(404).json({ erro: 'Nenhum hino encontrado', resultados: [] });
    }

    // Se o primeiro resultado bate exatamente com o que foi digitado, ja
    // devolve a letra pronta - evita um clique a mais no caso comum.
    const primeiro = sugestoes[0];
    if (normalizar(primeiro.nome) === normalizar(termo)) {
      const achado = await buscarLetra(primeiro.dns, primeiro.url);
      if (achado) {
        return res.status(200).json({
          ...achado,
          nome: achado.nome || primeiro.nome,
          cantor: achado.cantor || primeiro.cantor,
          resultados: sugestoes,
        });
      }
    }

    return res.status(200).json({ resultados: sugestoes });
  } catch (erro) {
    console.error('Erro ao buscar letra:', erro);
    return res.status(500).json({ erro: 'Falha ao consultar o Letras.mus.br' });
  }
}
