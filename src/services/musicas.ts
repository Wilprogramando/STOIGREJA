/**
 * BUSCA DE MÚSICAS NA INTERNET
 *
 * Fala com /api/buscar-musica, que procura em dois lugares ao mesmo tempo:
 * Letras.mus.br (pelo nome) e Genius (pelo trecho da letra). A consulta
 * precisa passar pelo servidor porque esses sites não liberam CORS.
 */

export interface MusicaEncontrada {
  id: string;
  nome: string;
  cantor: string;
  /** Pedaço da letra que combinou com a busca (quando o site devolve). */
  trecho: string;
  origem: 'letras' | 'genius';
  dns?: string;
  url?: string;
  path?: string;
  /** Página da música no site de origem. */
  link: string;
}

export interface LetraDaMusica {
  nome: string;
  cantor: string;
  letra: string;
  fonte?: string;
}

async function chamar(parametros: Record<string, string>): Promise<any> {
  const query = new URLSearchParams(parametros).toString();
  const resposta = await fetch(`/api/buscar-musica?${query}`);
  const dados = await resposta.json().catch(() => null);

  if (!resposta.ok) {
    throw new Error((dados && dados.erro) || 'Não foi possível buscar agora');
  }
  return dados;
}

/** Procura músicas por um trecho da letra ou pelo nome. */
export async function buscarMusicas(
  texto: string
): Promise<{ resultados: MusicaEncontrada[]; aviso?: string }> {
  const dados = await chamar({ q: texto.trim() });
  return { resultados: dados.resultados || [], aviso: dados.aviso };
}

/** Traz a letra completa de uma música da lista. */
export async function obterLetra(musica: MusicaEncontrada): Promise<LetraDaMusica> {
  const dados = await chamar({
    letra: '1',
    dns: musica.dns || '',
    url: musica.url || '',
    path: musica.path || '',
    nome: musica.nome || '',
    cantor: musica.cantor || '',
  });

  return {
    nome: dados.nome || musica.nome,
    cantor: dados.cantor || musica.cantor,
    letra: dados.letra || '',
    fonte: dados.fonte || musica.link,
  };
}
