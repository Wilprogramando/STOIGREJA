/**
 * ANOTAÇÕES DE SUGESTÕES DE HINOS
 *
 * Guardadas no próprio aparelho (localStorage), então funcionam sempre,
 * inclusive sem internet no meio do ensaio.
 */

export interface Anotacao {
  id: string;
  hino: string;
  cantor: string;
  tom: string;
  observacoes: string;
  criadoEm: string;
}

const CHAVE = 'repertorio_igreja_anotacoes';

export function listarAnotacoes(): Anotacao[] {
  try {
    const dados = localStorage.getItem(CHAVE);
    const lista = dados ? JSON.parse(dados) : [];
    if (!Array.isArray(lista)) return [];
    // Mais recentes primeiro.
    return lista.sort((a: Anotacao, b: Anotacao) => b.criadoEm.localeCompare(a.criadoEm));
  } catch (error) {
    console.error('Erro ao ler anotações:', error);
    return [];
  }
}

function gravar(lista: Anotacao[]): void {
  localStorage.setItem(CHAVE, JSON.stringify(lista));
}

export function salvarAnotacao(anotacao: Omit<Anotacao, 'id' | 'criadoEm'> & Partial<Anotacao>): Anotacao {
  const lista = listarAnotacoes();

  if (anotacao.id) {
    const atualizada = { ...(anotacao as Anotacao) };
    gravar(lista.map(a => (a.id === atualizada.id ? atualizada : a)));
    return atualizada;
  }

  const nova: Anotacao = {
    id: `anotacao_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    hino: anotacao.hino,
    cantor: anotacao.cantor,
    tom: anotacao.tom,
    observacoes: anotacao.observacoes,
    criadoEm: new Date().toISOString()
  };

  gravar([nova, ...lista]);
  return nova;
}

export function excluirAnotacao(id: string): void {
  gravar(listarAnotacoes().filter(a => a.id !== id));
}
