/**
 * OUVIR MÚSICA
 *
 * Procura a música para escutar, de dois jeitos:
 *   - Pelo NOME: direto no catálogo da Apple (iTunes Search), que é público,
 *     não precisa de cadastro e libera CORS.
 *   - Por um TRECHO DA LETRA: primeiro descobre o nome da música em
 *     /api/buscar-musica (Genius) e depois procura esse nome no catálogo.
 *
 * O que toca aqui é a prévia oficial de 30 segundos que a Apple disponibiliza.
 * Música inteira só nos aplicativos (YouTube, Spotify, Deezer), por isso cada
 * resultado também traz o link para abrir no YouTube.
 */

import { buscarMusicas } from './musicas';

export interface MusicaParaOuvir {
  id: string;
  nome: string;
  cantor: string;
  album: string;
  /** Capa do disco (100x100 aumentada para 300x300). */
  capa: string;
  /** Prévia de 30 segundos; vazio quando a Apple não libera a faixa. */
  previa: string;
  /** Busca pronta no YouTube, para ouvir a música completa. */
  youtube: string;
}

/** Tira acento e pontuação para comparar textos. */
function normalizar(texto: string): string {
  return (texto || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function linkYoutube(nome: string, cantor: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(
    `${nome} ${cantor}`.trim()
  )}`;
}

/** Chama o catálogo da Apple com prazo, para a tela não ficar pendurada. */
async function buscarNoCatalogo(termo: string, limite = 20): Promise<MusicaParaOuvir[]> {
  const url =
    'https://itunes.apple.com/search?media=music&entity=song&country=BR' +
    `&limit=${limite}&term=${encodeURIComponent(termo)}`;

  const controlador = new AbortController();
  const relogio = setTimeout(() => controlador.abort(), 8000);

  try {
    const resposta = await fetch(url, { signal: controlador.signal });
    if (!resposta.ok) return [];

    const dados = await resposta.json();
    return (dados.results || []).map((faixa: any) => ({
      id: String(faixa.trackId || `${faixa.trackName}-${faixa.artistName}`),
      nome: faixa.trackName || '',
      cantor: faixa.artistName || '',
      album: faixa.collectionName || '',
      capa: (faixa.artworkUrl100 || '').replace('100x100', '300x300'),
      previa: faixa.previewUrl || '',
      youtube: linkYoutube(faixa.trackName || '', faixa.artistName || ''),
    }));
  } catch {
    return [];
  } finally {
    clearTimeout(relogio);
  }
}

/**
 * Descobre o endereço do vídeo em si (em vez da lista de resultados).
 *
 * Devolve vazio quando o servidor não achou nada - aí o sistema abre a busca
 * normal do YouTube, como antes.
 */
export async function acharVideoNoYoutube(
  nome: string,
  cantor: string
): Promise<{ id: string; url: string } | null> {
  const termo = `${nome} ${cantor}`.trim();
  if (!termo) return null;

  const controlador = new AbortController();
  const relogio = setTimeout(() => controlador.abort(), 7000);

  try {
    const resposta = await fetch(`/api/youtube?q=${encodeURIComponent(termo)}`, {
      signal: controlador.signal,
    });
    if (!resposta.ok) return null;

    const dados = await resposta.json();
    return dados?.id ? { id: dados.id, url: dados.url } : null;
  } catch {
    return null;
  } finally {
    clearTimeout(relogio);
  }
}

/** Tira repetidos (a mesma música costuma vir em vários álbuns). */
function semRepetidos(lista: MusicaParaOuvir[]): MusicaParaOuvir[] {
  const vistos = new Set<string>();
  return lista.filter(m => {
    const chave = `${normalizar(m.nome)}|${normalizar(m.cantor)}`;
    if (vistos.has(chave)) return false;
    vistos.add(chave);
    return true;
  });
}

/**
 * Procura músicas para ouvir a partir do nome ou de um trecho da letra.
 *
 * Devolve também um aviso quando nada foi encontrado pelo caminho principal.
 */
export async function procurarParaOuvir(
  texto: string
): Promise<{ resultados: MusicaParaOuvir[]; aviso?: string }> {
  const termo = (texto || '').trim();
  if (termo.length < 3) {
    return { resultados: [], aviso: 'Digite pelo menos 3 letras.' };
  }

  // 1) Pelo nome, direto no catálogo.
  const porNome = await buscarNoCatalogo(termo);
  const palavras = termo.split(/\s+/).length;

  // Texto curto que já achou bastante coisa: é o nome da música mesmo.
  if (porNome.length >= 3 && palavras <= 5) {
    return { resultados: semRepetidos(porNome) };
  }

  // 2) Trecho de letra: descobre o nome da música e procura esse nome.
  let porLetra: MusicaParaOuvir[] = [];
  try {
    const { resultados } = await buscarMusicas(termo);
    const candidatas = resultados.slice(0, 5);

    const achados = await Promise.all(
      candidatas.map(c => buscarNoCatalogo(`${c.nome} ${c.cantor}`, 3))
    );

    porLetra = achados.flat();

    // Nada no catálogo? Ainda assim mostramos a música achada pela letra,
    // com o link do YouTube (sem prévia para tocar aqui dentro).
    if (porLetra.length === 0) {
      porLetra = candidatas.map(c => ({
        id: c.id,
        nome: c.nome,
        cantor: c.cantor,
        album: '',
        capa: '',
        previa: '',
        youtube: linkYoutube(c.nome, c.cantor),
      }));
    }
  } catch {
    /* sem internet ou servidor fora: fica só o que veio pelo nome */
  }

  const juntos = semRepetidos([...porLetra, ...porNome]);

  if (juntos.length === 0) {
    return {
      resultados: [],
      aviso: 'Nenhuma música encontrada. Tente o nome da música ou outro trecho da letra.',
    };
  }

  return { resultados: juntos };
}
