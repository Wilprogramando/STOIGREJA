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
    // Serve de último recurso no servidor (embed do Genius).
    gid: musica.id || '',
  });

  return {
    nome: dados.nome || musica.nome,
    cantor: dados.cantor || musica.cantor,
    letra: dados.letra || '',
    fonte: dados.fonte || musica.link,
  };
}

/** Tira acento e pontuacao para comparar titulos e nomes de cantor. */
function normalizar(texto: string): string {
  return (texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Limpa o nome que vem do catálogo da Apple.
 *
 * Lá a faixa é cadastrada com um monte de aviso junto do título -
 * "Oceanos (Onde Meus Pés Podem Falhar) [Ao Vivo]", "Tua Graça Me Basta
 * (feat. Preto no Branco)". Os sites de letra guardam só "Oceanos" e
 * "Tua Graça Me Basta", por isso a busca com o nome inteiro não achava nada.
 */
export function tituloLimpo(nome: string): string {
  return String(nome || '')
    .replace(/[\(\[][^\)\]]*[\)\]]/g, ' ')
    .replace(/\b(feat|ft|com)\.?\s.*$/i, ' ')
    .replace(/\s*[-–]\s*(ao vivo|acustico|acústico|playback|cover).*$/i, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** O cantor pedido está dentro do cantor achado (ou o contrário)? */
function mesmoCantor(a: string, b: string): boolean {
  const um = normalizar(a);
  const outro = normalizar(b);
  if (!um || !outro) return false;
  return um === outro || um.includes(outro) || outro.includes(um);
}

/**
 * Procura a letra de uma música pelo nome e pelo cantor.
 *
 * Usa a busca completa de /api/buscar-musica (Letras.mus.br + Genius, com
 * os planos B de cada um) em vez do /api/buscar-letra, que só olha o índice
 * de títulos do Letras e desistia sempre que o título vinha com "(Ao Vivo)".
 *
 * A ordem das tentativas evita trazer a letra errada: primeiro o título com
 * o cantor, depois só o título. Em todas elas o título precisa bater - sem
 * isso a busca por "Ousado Amor" devolvia a letra de "Ousados Proclamai".
 */
export async function buscarLetraPorNome(
  nome: string,
  cantor: string
): Promise<LetraDaMusica | null> {
  const limpo = tituloLimpo(nome) || String(nome || '').trim();
  if (!limpo) return null;

  const alvo = normalizar(limpo);
  const termos = [`${limpo} ${cantor || ''}`.trim(), limpo].filter(
    (t, i, lista) => t && lista.indexOf(t) === i
  );

  for (const termo of termos) {
    let achados: MusicaEncontrada[] = [];
    try {
      achados = (await buscarMusicas(termo)).resultados;
    } catch {
      continue;
    }

    // Só quem tem o mesmo título entra; o do cantor pedido vai na frente.
    const candidatas = achados
      .filter(m => {
        const titulo = normalizar(tituloLimpo(m.nome));
        return titulo === alvo || titulo.includes(alvo) || alvo.includes(titulo);
      })
      .sort((a, b) => {
        const pesoA = mesmoCantor(a.cantor, cantor) ? 1 : 0;
        const pesoB = mesmoCantor(b.cantor, cantor) ? 1 : 0;
        return pesoB - pesoA;
      })
      .slice(0, 4);

    for (const candidata of candidatas) {
      try {
        const letra = await obterLetra(candidata);
        if (letra.letra) return letra;
      } catch {
        // Essa página não abriu: tenta a próxima candidata.
      }
    }
  }

  return null;
}
