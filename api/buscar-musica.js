/**
 * BUSCAR MUSICA POR TRECHO DA LETRA OU POR NOME
 *
 * Roda no servidor (Vercel) porque os sites de letra nao liberam CORS.
 *
 * Duas fontes trabalham juntas:
 *   - Letras.mus.br  -> busca por NOME (indice de titulos) e traz a letra completa.
 *   - Genius         -> busca por TRECHO DA LETRA (indice do texto das musicas).
 *
 * Rotas:
 *   GET /api/buscar-musica?q=um pedaco da letra   -> lista de musicas encontradas
 *   GET /api/buscar-musica?letra=1&dns=..&url=..  -> letra completa (Letras.mus.br)
 *   GET /api/buscar-musica?letra=1&path=/Xis-lyrics&nome=..&cantor=..  -> letra (Genius)
 */

const CABECALHOS = {
  'user-agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
  'accept-language': 'pt-BR,pt;q=0.9',
};

/** Tira acento e pontuacao para comparar textos. */
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
  const acentos = {
    acute: '\u0301', grave: '\u0300', circ: '\u0302',
    tilde: '\u0303', uml: '\u0308', cedil: '\u0327',
  };

  return (texto || '')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (inteiro, nome) => {
      const chave = nome.toLowerCase();
      if (nomeadas[chave]) return nomeadas[chave];
      const m = /^([a-z])(acute|grave|circ|tilde|uml|cedil)$/i.exec(nome);
      if (m) return (m[1] + acentos[m[2].toLowerCase()]).normalize('NFC');
      return inteiro;
    });
}

/** Transforma um pedaco de HTML em texto de letra, com as quebras certas. */
function htmlParaLetra(html) {
  return decodificar(
    (html || '')
      .replace(/<\/p\s*>/gi, '\n\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
  )
    .replace(/\r/g, '')
    .split('\n')
    .map((linha) => linha.trim())
    // Marcacoes do Genius ([Refrao], [Verso 1]) nao servem para o repertorio.
    .filter((linha) => !/^\[[^\]]*\]$/.test(linha))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Devolve o conteudo de uma <div> contando abre/fecha, porque no Genius
 * a letra vem dentro de divs aninhadas.
 */
function conteudoDaDiv(html, posicaoDaDiv) {
  const fimDaTag = html.indexOf('>', posicaoDaDiv);
  if (fimDaTag < 0) return { texto: '', fim: posicaoDaDiv + 1 };

  const marcas = /<div\b|<\/div\s*>/gi;
  marcas.lastIndex = fimDaTag + 1;

  let profundidade = 1;
  let achado;

  while ((achado = marcas.exec(html))) {
    profundidade += achado[0][1] === '/' ? -1 : 1;
    if (profundidade === 0) {
      return { texto: html.slice(fimDaTag + 1, achado.index), fim: marcas.lastIndex };
    }
  }

  return { texto: html.slice(fimDaTag + 1), fim: html.length };
}

/** Tira do HTML os blocos marcados com um atributo (cabecalhos do Genius). */
function removerBlocos(html, atributo) {
  let saida = html;
  let posicao = saida.indexOf(atributo);

  while (posicao >= 0) {
    const inicio = saida.lastIndexOf('<div', posicao);
    if (inicio < 0) break;
    const { fim } = conteudoDaDiv(saida, inicio);
    saida = saida.slice(0, inicio) + saida.slice(fim);
    posicao = saida.indexOf(atributo);
  }

  return saida;
}

// ---------------------------------------------------------------- Letras.mus.br

/** Busca no indice de titulos do Letras.mus.br. */
async function buscarNoLetras(termo) {
  // O "m2" e mais exigente que o "m1": junto, um cobre o erro do outro.
  const cores = ['m2', 'm1'];
  const encontrados = new Map();

  for (const core of cores) {
    try {
      const alvo = `https://solr.sscdn.co/letras/${core}/?q=${encodeURIComponent(termo)}&wt=json`;
      const resposta = await fetch(alvo, { headers: CABECALHOS });
      const bruto = await resposta.text();

      const inicio = bruto.indexOf('{');
      const fim = bruto.lastIndexOf('}');
      if (inicio < 0 || fim < 0) continue;

      const dados = JSON.parse(bruto.slice(inicio, fim + 1));
      const docs = (dados.response && dados.response.docs) || [];

      docs
        // t === '2' sao musicas; o resto e artista/album.
        .filter((d) => d.txt && d.dns && d.url && String(d.t) === '2')
        .slice(0, 12)
        .forEach((d, posicao) => {
          const chave = `${normalizar(d.txt)}|${normalizar(d.art)}`;
          if (encontrados.has(chave)) return;

          encontrados.set(chave, {
            id: `letras:${d.dns}:${d.url}`,
            nome: d.txt,
            cantor: d.art || '',
            trecho: '',
            origem: 'letras',
            dns: d.dns,
            url: String(d.url),
            link: `https://www.letras.mus.br/${d.dns}/${d.url}/`,
            // Titulo igual ao digitado vem na frente de tudo.
            peso: (normalizar(d.txt) === normalizar(termo) ? 1000 : 600) - posicao,
          });
        });
    } catch {
      // Uma fonte fora do ar nao pode derrubar a busca inteira.
    }
  }

  return Array.from(encontrados.values());
}

/**
 * Acha o bloco da letra na pagina do Letras.mus.br.
 *
 * O site ja trocou o nome dessa div algumas vezes e as vezes coloca outras
 * divs dentro dela - por isso a procura passa por varios nomes e conta
 * abre/fecha, em vez de parar no primeiro </div> que aparecer.
 */
function extrairLetraDoLetras(html) {
  const marcadores = [
    /<div[^>]*class="[^"]*lyric-original[^"]*"[^>]*>/i,
    /<div[^>]*class="[^"]*cnt-letra[^"]*"[^>]*>/i,
    /<div[^>]*class="[^"]*letra-l[^"]*"[^>]*>/i,
    /<div[^>]*id="[^"]*lyric[^"]*"[^>]*>/i,
    /<div[^>]*class="[^"]*lyric[^"]*"[^>]*>/i,
  ];

  for (const marcador of marcadores) {
    const achado = marcador.exec(html);
    if (!achado) continue;

    const { texto } = conteudoDaDiv(html, achado.index);
    const letra = htmlParaLetra(texto);
    // Bloco curto demais costuma ser aviso ou propaganda, e nao a letra.
    if (letra && letra.length > 40) return letra;
  }

  return '';
}

/** Abre a pagina do Letras.mus.br e extrai a letra. */
async function letraDoLetras(dns, url) {
  const pagina = `https://www.letras.mus.br/${encodeURIComponent(dns)}/${encodeURIComponent(url)}/`;

  let resposta;
  try {
    resposta = await fetch(pagina, { headers: CABECALHOS });
  } catch {
    return null;
  }
  if (!resposta.ok) return null;

  const html = await resposta.text();

  const letra = extrairLetraDoLetras(html);
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

// ---------------------------------------------------------------------- Genius

/** Busca no indice do TEXTO das musicas (e o que acha pelo trecho da letra). */
async function buscarNoGenius(termo) {
  try {
    const alvo = `https://genius.com/api/search/multi?q=${encodeURIComponent(termo)}`;
    const resposta = await fetch(alvo, { headers: CABECALHOS });
    if (!resposta.ok) return [];

    const dados = await resposta.json();
    const secoes = (dados.response && dados.response.sections) || [];
    const encontrados = new Map();

    secoes.forEach((secao) => {
      if (!['top_hit', 'song', 'lyric'].includes(secao.type)) return;

      (secao.hits || []).slice(0, 10).forEach((hit, posicao) => {
        const musica = hit.result;
        if (!musica || musica._type !== 'song' || !musica.path) return;

        const chave = `${normalizar(musica.title)}|${normalizar(musica.artist_names)}`;
        const trecho = ((hit.highlights || [])[0] || {}).value || '';

        // Ja registrada: aproveita para guardar o trecho, se ainda faltava.
        if (encontrados.has(chave)) {
          const anterior = encontrados.get(chave);
          if (!anterior.trecho && trecho) anterior.trecho = trecho;
          return;
        }

        encontrados.set(chave, {
          id: `genius:${musica.id}`,
          nome: musica.title || '',
          cantor: musica.artist_names || '',
          trecho,
          origem: 'genius',
          path: musica.path,
          link: musica.url || `https://genius.com${musica.path}`,
          peso:
            (normalizar(musica.title) === normalizar(termo) ? 1000 : trecho ? 700 : 400) -
            posicao,
        });
      });
    });

    return Array.from(encontrados.values());
  } catch {
    return [];
  }
}

/**
 * Tira as primeiras linhas de cabecalho que o Genius mistura com a letra
 * ("Letra de ... com Fulano", "12 Contributors", "... Lyrics").
 */
function limparCabecalhoGenius(letra) {
  const linhas = letra.split('\n');

  const ehCabecalho = (linha) =>
    /^letra de\b/i.test(linha) ||
    /^\d+\s+contributors?\b/i.test(linha) ||
    /\blyrics$/i.test(linha);

  while (linhas.length && ehCabecalho(linhas[0].trim())) {
    linhas.shift();
    while (linhas.length && !linhas[0].trim()) linhas.shift();
  }

  return linhas.join('\n').trim();
}

/** Abre a pagina do Genius e extrai a letra. */
async function letraDoGenius(caminho) {
  const pagina = caminho.startsWith('http') ? caminho : `https://genius.com${caminho}`;
  const resposta = await fetch(pagina, { headers: CABECALHOS });
  if (!resposta.ok) return null;

  const html = await resposta.text();
  const partes = [];

  let posicao = html.indexOf('data-lyrics-container');
  while (posicao >= 0) {
    const inicio = html.lastIndexOf('<div', posicao);
    if (inicio < 0) break;

    const { texto, fim } = conteudoDaDiv(html, inicio);
    // Dentro da letra vem um cabecalho com creditos: fora dele.
    partes.push(htmlParaLetra(removerBlocos(texto, 'data-exclude-from-selection')));
    posicao = html.indexOf('data-lyrics-container', fim);
  }

  const letra = limparCabecalhoGenius(
    partes.filter(Boolean).join('\n\n').replace(/\n{3,}/g, '\n\n').trim()
  );
  if (!letra) return null;

  const titulo = /<title>([\s\S]*?)<\/title>/i.exec(html);
  const cabecalho = titulo ? decodificar(titulo[1]).replace(/\s*\|.*$/, '').trim() : '';
  const separado = /^(.*?)\s+[–-]\s+(.*?)\s+Lyrics$/i.exec(cabecalho);

  return {
    nome: separado ? separado[2] : '',
    cantor: separado ? separado[1] : '',
    letra,
    fonte: pagina,
  };
}

/**
 * Plano B do Genius: o "embed" da musica traz a letra dentro de um
 * document.write(...). Serve quando a pagina normal responde bloqueada.
 */
async function letraDoGeniusEmbed(id) {
  if (!id) return null;

  let resposta;
  try {
    resposta = await fetch(`https://genius.com/songs/${encodeURIComponent(id)}/embed.js`, {
      headers: CABECALHOS,
    });
  } catch {
    return null;
  }
  if (!resposta.ok) return null;

  const script = await resposta.text();

  // O trecho util e um document.write(JSON.parse('...')): o HTML vem escapado
  // duas vezes, uma para a string do JavaScript e outra para o JSON.
  const bloco = /document\.write\(\s*JSON\.parse\(\s*'([\s\S]*?)'\s*\)\s*\)/.exec(script);
  if (!bloco) return null;

  let html;
  try {
    html = JSON.parse(bloco[1].replace(/\\(.)/g, '$1'));
  } catch {
    return null;
  }

  const corpo = /<div[^>]*class="[^"]*rg_embed_body[^"]*"[^>]*>/i.exec(html);
  if (!corpo) return null;

  // No embed cada verso vem com <br> E com quebra de linha do proprio HTML;
  // sem tirar uma delas a letra sai com uma linha em branco entre cada verso.
  const bruto = conteudoDaDiv(html, corpo.index).texto.replace(/\s*\n\s*/g, ' ');

  const letra = limparCabecalhoGenius(htmlParaLetra(bruto));
  if (!letra || letra.length < 40) return null;

  // O rodape do embed traz o nome da musica e o do artista.
  const titulo = /<div[^>]*class="[^"]*song_title[^"]*"[^>]*>([\s\S]*?)<\/div>([\s\S]*?)<\/a>/i.exec(html);

  return {
    nome: titulo ? decodificar(titulo[1].replace(/<[^>]+>/g, '').trim()) : '',
    cantor: titulo ? decodificar(titulo[2].replace(/<[^>]+>/g, '').trim()) : '',
    letra,
    fonte: `https://genius.com/songs/${id}`,
  };
}

// ----------------------------------------------------------------------- rotas

/**
 * Junta as duas fontes numa lista so, sem repetir a mesma musica.
 * Quando as duas acharam, fica a do Letras (tem a letra em portugues)
 * mas aproveitando o trecho destacado pelo Genius.
 */
function juntarResultados(doLetras, doGenius) {
  const juntos = new Map();

  [...doLetras, ...doGenius].forEach((item) => {
    const chave = `${normalizar(item.nome)}|${normalizar(item.cantor)}`;
    const anterior = juntos.get(chave);

    if (!anterior) {
      juntos.set(chave, item);
      return;
    }

    const preferido = anterior.origem === 'letras' ? anterior : item;
    const outro = preferido === anterior ? item : anterior;

    preferido.trecho = preferido.trecho || outro.trecho;
    preferido.peso = Math.max(anterior.peso, item.peso);
    juntos.set(chave, preferido);
  });

  return Array.from(juntos.values())
    .sort((a, b) => b.peso - a.peso)
    .slice(0, 20)
    .map(({ peso, ...resto }) => resto);
}

/** Procura no Letras.mus.br uma musica com o mesmo nome, para pegar a letra em portugues. */
async function tentarNoLetras(nome, cantor) {
  if (!nome) return null;

  // Primeiro com o cantor junto (mais preciso); depois so pelo nome, porque
  // o mesmo hino aparece gravado por varios cantores.
  const termos = [`${nome} ${cantor || ''}`.trim(), nome];

  for (const termo of termos) {
    const opcoes = await buscarNoLetras(termo);
    const iguais = opcoes.filter((o) => normalizar(o.nome) === normalizar(nome));

    for (const opcao of iguais.slice(0, 3)) {
      const achado = await letraDoLetras(opcao.dns, opcao.url);
      if (achado) return achado;
    }
  }

  return null;
}

/** Procura a mesma musica no Genius, quando o Letras.mus.br nao abriu. */
async function tentarNoGenius(nome, cantor) {
  if (!nome) return null;

  const opcoes = await buscarNoGenius(`${nome} ${cantor || ''}`.trim());
  const iguais = opcoes.filter((o) => normalizar(o.nome) === normalizar(nome));
  const candidatas = (iguais.length ? iguais : opcoes).slice(0, 3);

  for (const opcao of candidatas) {
    const achado = await letraDoGenius(opcao.path);
    if (achado) return achado;

    const porEmbed = await letraDoGeniusEmbed(String(opcao.id).replace('genius:', ''));
    if (porEmbed) return porEmbed;
  }

  return null;
}

export default async function handler(req, res) {
  const {
    q = '', letra = '', dns = '', url = '', path = '', nome = '', cantor = '', gid = '',
  } = req.query || {};

  res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate');

  try {
    // ---- Letra completa de uma musica ja escolhida na lista.
    //
    // As tentativas sao encadeadas: se a fonte de origem nao abrir, o servidor
    // procura a mesma musica na outra fonte antes de desistir. Assim uma pagina
    // fora do ar (ou com o desenho trocado) nao deixa o hino sem letra.
    if (letra) {
      const responder = (achado) =>
        res.status(200).json({
          ...achado,
          nome: achado.nome || nome,
          cantor: achado.cantor || cantor,
        });

      const idGenius = String(gid || '').replace('genius:', '');

      const tentativas = [
        // 1. A pagina exata que veio da busca.
        () => (dns && url ? letraDoLetras(dns, url) : null),
        () => (path ? letraDoGenius(path) : null),
        // 2. A mesma musica procurada de novo, pelo nome, nas duas fontes.
        () => tentarNoLetras(nome, cantor),
        () => tentarNoGenius(nome, cantor),
        // 3. Ultimo recurso: o embed do Genius, que costuma passar quando a
        //    pagina normal e bloqueada.
        () => letraDoGeniusEmbed(idGenius),
      ];

      for (const tentar of tentativas) {
        try {
          const achado = await tentar();
          if (achado && achado.letra) return responder(achado);
        } catch (erro) {
          console.warn('Tentativa de letra falhou:', erro && erro.message);
        }
      }

      return res.status(404).json({
        erro: 'Nao foi possivel abrir a letra desta musica. Tente outra opcao da lista.',
      });
    }

    // ---- Busca por trecho da letra ou por nome.
    const termo = String(q).trim();
    if (termo.length < 3) {
      return res.status(400).json({ erro: 'Digite pelo menos 3 letras', resultados: [] });
    }

    const [doLetras, doGenius] = await Promise.all([
      buscarNoLetras(termo),
      buscarNoGenius(termo),
    ]);

    const resultados = juntarResultados(doLetras, doGenius);

    if (resultados.length === 0) {
      return res.status(200).json({
        resultados: [],
        aviso: 'Nenhuma musica encontrada. Tente outro trecho da letra.',
      });
    }

    return res.status(200).json({ resultados });
  } catch (erro) {
    console.error('Erro ao buscar musica:', erro);
    return res.status(500).json({ erro: 'Falha ao consultar os sites de letras' });
  }
}
