/**
 * BUSCA DE LETRAS
 *
 * Fala com /api/buscar-letra, que por sua vez consulta o Letras.mus.br.
 * A consulta precisa passar pelo servidor porque o site nao libera CORS.
 */

export interface SugestaoLetra {
  nome: string;
  cantor: string;
  dns: string;
  url: string;
}

export interface LetraEncontrada {
  nome: string;
  cantor: string;
  letra: string;
  fonte?: string;
}

export interface ResultadoBusca {
  /** Preenchido quando o hino foi identificado direto. */
  letra?: LetraEncontrada;
  /** Opcoes para o usuario escolher quando ha mais de um hino parecido. */
  resultados: SugestaoLetra[];
}

async function chamar(parametros: Record<string, string>): Promise<any> {
  const query = new URLSearchParams(parametros).toString();
  const resposta = await fetch(`/api/buscar-letra?${query}`);
  const dados = await resposta.json().catch(() => null);

  if (!resposta.ok) {
    throw new Error((dados && dados.erro) || 'Nao foi possivel buscar a letra');
  }
  return dados;
}

/** Procura o hino pelo nome. Pode voltar a letra pronta ou uma lista de opcoes. */
export async function procurarHino(nome: string): Promise<ResultadoBusca> {
  const dados = await chamar({ q: nome.trim() });

  if (typeof dados.letra === 'string' && dados.letra) {
    return {
      letra: { nome: dados.nome, cantor: dados.cantor, letra: dados.letra, fonte: dados.fonte },
      resultados: dados.resultados || [],
    };
  }

  return { resultados: dados.resultados || [] };
}

/** Traz a letra de uma opcao escolhida na lista. */
export async function buscarLetraDaSugestao(
  sugestao: SugestaoLetra
): Promise<LetraEncontrada> {
  const dados = await chamar({ dns: sugestao.dns, url: sugestao.url });
  return {
    nome: dados.nome || sugestao.nome,
    cantor: dados.cantor || sugestao.cantor,
    letra: dados.letra,
    fonte: dados.fonte,
  };
}
