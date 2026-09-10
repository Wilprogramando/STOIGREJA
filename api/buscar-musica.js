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
  // Só nomes que o site usa para a letra da PROPRIA pagina. Um marcador
  // generico (qualquer classe com "lyric") pegava tambem os blocos de
  // "mais tocadas" da barra lateral, que sao de outras musicas.
  const marcadores = [
    /<div[^>]*class="[^"]*lyric-original[^"]*"[^>]*>/i,
    /<div[^>]*class="[^"]*cnt-letra[^"]*"[^>]*>/i,
    /<div[^>]*class="[^"]*letra-l[^"]*"[^>]*>/i,
    /<div[^>]*id="[^"]*lyric-original[^"]*"[^>]*>/i,
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

  const { nome, cantor } = identificarPaginaDoLetras(html);

  return { nome, cantor, letra, fonte: pagina };
}

/**
 * De quem e a pagina que acabou de ser aberta?
 *
 * Sem isso nao da para conferir se a letra e mesmo da musica pedida. O <h2>
 * do cantor nem sempre vem no formato esperado, entao o <title> - que e
 * sempre "Musica - Cantor - LETRAS.MUS.BR" - serve de garantia.
 */
function identificarPaginaDoLetras(html) {
  const limpar = (t) => decodificar(String(t || '').replace(/<[^>]+>/g, '')).trim();

  const tituloTag = /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html);
  const cantorTag = /<h2[^>]*>[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i.exec(html);

  let nome = tituloTag ? limpar(tituloTag[1]) : '';
  let cantor = cantorTag ? limpar(cantorTag[1]) : '';

  if (!nome || !cantor) {
    const titulo = /<title>([\s\S]*?)<\/title>/i.exec(html);
    const partes = titulo
      ? limpar(titulo[1])
          .replace(/\s*-\s*LETRAS\.MUS\.BR\s*$/i, '')
          .split(' - ')
      : [];

    if (partes.length >= 2) {
      if (!nome) nome = partes.slice(0, -1).join(' - ').trim();
      if (!cantor) cantor = partes[partes.length - 1].trim();
    }
  }

  return { nome, cantor };
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

/** Tira o que vem entre parenteses ("Ao Vivo", "2020") antes de comparar titulos. */
function tituloBase(texto) {
  return normalizar(String(texto || '').replace(/\([^)]*\)/g, ' '));
}

/** "Thalles Roberto" e "Thalles Roberto e Banda" sao o mesmo cantor. */
function mesmoCantor(a, b) {
  const um = normalizar(a);
  const outro = normalizar(b);
  if (!um || !outro) return false;
  return um === outro || um.includes(outro) || outro.includes(um);
}

/**
 * CONFERENCIA FINAL, antes de devolver a letra.
 *
 * A pagina de letra diz o nome da musica e o do cantor. Se qualquer um dos
 * dois nao bater com o que foi pedido, a letra e de outra musica e nao pode
 * ser devolvida - o servidor segue para a proxima tentativa.
 *
 * exigirIdentificacao: quando a letra veio de uma procura por nome (e nao da
 * pagina exata que o usuario escolheu), a pagina precisa se identificar; sem
 * nome nem cantor nao da para ter certeza de que e a musica certa.
 */
function letraConfere(achado, nome, cantor, exigirIdentificacao) {
  if (!achado || !achado.letra) return false;

  const temNome = Boolean(achado.nome);
  const temCantor = Boolean(achado.cantor);

  if (exigirIdentificacao && !temNome && !temCantor) return false;

  if (nome && temNome && tituloBase(achado.nome) !== tituloBase(nome)) return false;
  if (cantor && temCantor && !mesmoCantor(achado.cantor, cantor)) return false;

  return true;
}

/**
 * O candidato e mesmo a musica pedida?
 *
 * O titulo tem de bater E, quando o cantor foi informado, o cantor tambem -
 * varios hinos diferentes tem o mesmo nome ("Deus da Minha Vida" do Thalles
 * e da Dalvinha sao letras diferentes). Sem essa conferencia o resgate
 * devolvia a letra de outro cantor como se fosse a pedida.
 */
function ehAMesmaMusica(candidato, nome, cantor) {
  if (tituloBase(candidato.nome) !== tituloBase(nome)) return false;
  if (!cantor || !String(cantor).trim()) return true;

  const pedido = normalizar(cantor);
  const achado = normalizar(candidato.cantor);
  if (!achado) return false;

  // "Thalles Roberto" casa com "Thalles Roberto e Banda".
  return achado === pedido || achado.includes(pedido) || pedido.includes(achado);
}

/** Procura no Letras.mus.br a mesma musica, para pegar a letra em portugues. */
async function tentarNoLetras(nome, cantor) {
  if (!nome) return null;

  // Do mais preciso para o mais aberto. O titulo sem os parenteses entra
  // porque o indice do Letras nao acha "Deus da Minha Vida (Ao Vivo)" - la
  // a musica esta cadastrada so como "Deus da Minha Vida".
  const semParenteses = String(nome).replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();

  const termos = [
    `${nome} ${cantor || ''}`.trim(),
    `${semParenteses} ${cantor || ''}`.trim(),
    nome,
    semParenteses,
  ].filter((termo, posicao, lista) => termo && lista.indexOf(termo) === posicao);

  for (const termo of termos) {
    const opcoes = await buscarNoLetras(termo);

    for (const opcao of opcoes.filter((o) => ehAMesmaMusica(o, nome, cantor)).slice(0, 3)) {
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
  // Sem candidata confiavel e melhor nao devolver nada do que devolver a
  // letra de outra musica.
  const candidatas = opcoes.filter((o) => ehAMesmaMusica(o, nome, cantor)).slice(0, 3);

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

      // "exata" = a pagina que o usuario escolheu na lista; as outras sao
      // procuras por nome, que precisam se identificar (ver letraConfere).
      const tentativas = [
        // 1. A pagina exata do Letras.mus.br, quando a escolha veio de la.
        { exata: true, buscar: () => (dns && url ? letraDoLetras(dns, url) : null) },
        // 2. O Letras.mus.br pelo nome. Vem antes da pagina do Genius de
        //    proposito: no Genius as versoes "Ao Vivo" trazem a fala de palco
        //    misturada com a letra ("batam palma comigo"), e o que serve para
        //    o repertorio e a letra limpa.
        { exata: false, buscar: () => tentarNoLetras(nome, cantor) },
        // 3. O Genius, quando a musica so existe la.
        { exata: true, buscar: () => (path ? letraDoGenius(path) : null) },
        { exata: false, buscar: () => tentarNoGenius(nome, cantor) },
        // 4. Ultimo recurso: o embed do Genius, que costuma passar quando a
        //    pagina normal e bloqueada. O id e o da musica escolhida.
        { exata: true, buscar: () => letraDoGeniusEmbed(idGenius) },
      ];

      for (const { exata, buscar } of tentativas) {
        try {
          const achado = await buscar();
          if (!achado || !achado.letra) continue;

          if (!letraConfere(achado, nome, cantor, !exata)) {
            console.warn(
              `Letra descartada: pedi "${nome}" - "${cantor}", ` +
                `a pagina e de "${achado.nome}" - "${achado.cantor}" (${achado.fonte})`
            );
            continue;
          }

          return responder(achado);
        } catch (erro) {
          console.warn('Tentativa de letra falhou:', erro && erro.message);
        }
      }

      return res.status(404).json({
        erro:
          'Nao encontrei a letra desta musica com o mesmo cantor. ' +
          'Tente outra opcao da lista.',
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
