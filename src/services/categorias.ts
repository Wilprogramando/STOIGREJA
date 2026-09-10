/**
 * CATEGORIAS DOS HINOS
 *
 * Lista usada nos campos "Categoria" do cadastro de hinos (Manancial, Alfa...).
 * Fica guardada no aparelho (localStorage), igual à ordem do menu: assim não
 * precisa de coluna nova no Supabase.
 */

const CHAVE = 'repertorio:categorias';

/** Categorias que já vêm prontas quando a lista ainda está vazia. */
export const CATEGORIAS_PADRAO = ['Alfa', 'Manancial', 'Louvor', 'Consagração', 'Outro'];

const mesmoNome = (a: string, b: string) =>
  (a || '').trim().toLocaleLowerCase('pt-BR') === (b || '').trim().toLocaleLowerCase('pt-BR');

/** Tira repetidas e vazias, mantendo a ordem em que foram cadastradas. */
const arrumar = (lista: string[]): string[] => {
  const vistas = new Map<string, string>();

  (lista || [])
    .map(nome => (nome || '').trim())
    .filter(Boolean)
    .forEach(nome => {
      const chave = nome.toLocaleLowerCase('pt-BR');
      if (!vistas.has(chave)) vistas.set(chave, nome);
    });

  return Array.from(vistas.values());
};

function guardar(lista: string[]): string[] {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(lista));
  } catch (erro) {
    console.error('Não foi possível guardar as categorias:', erro);
  }
  return lista;
}

export function lerCategorias(): string[] {
  try {
    const bruto = localStorage.getItem(CHAVE);
    if (!bruto) return [...CATEGORIAS_PADRAO];

    const lista = arrumar(JSON.parse(bruto));
    return lista.length ? lista : [...CATEGORIAS_PADRAO];
  } catch {
    return [...CATEGORIAS_PADRAO];
  }
}

export function adicionarCategoria(nome: string): string[] {
  const limpo = (nome || '').trim();
  if (!limpo) return lerCategorias();

  const atual = lerCategorias();
  if (atual.some(c => mesmoNome(c, limpo))) return atual;

  return guardar([...atual, limpo]);
}

export function removerCategoria(nome: string): string[] {
  const atual = lerCategorias();
  const nova = atual.filter(c => !mesmoNome(c, nome));

  // Sem nenhuma categoria os formulários ficariam travados.
  if (nova.length === 0) return atual;

  return guardar(nova);
}

export function renomearCategoria(antiga: string, nova: string): string[] {
  const limpa = (nova || '').trim();
  if (!limpa) return lerCategorias();

  const atual = lerCategorias();
  if (atual.some(c => mesmoNome(c, limpa) && !mesmoNome(c, antiga))) return atual;

  return guardar(atual.map(c => (mesmoNome(c, antiga) ? limpa : c)));
}

/** Muda uma categoria de lugar na lista (as telas mostram nesta ordem). */
export function moverCategoria(nome: string, passo: number): string[] {
  const atual = lerCategorias();
  const de = atual.findIndex(c => mesmoNome(c, nome));
  const para = de + passo;
  if (de === -1 || para < 0 || para >= atual.length) return atual;

  const nova = [...atual];
  const [movida] = nova.splice(de, 1);
  nova.splice(para, 0, movida);

  return guardar(nova);
}

export function restaurarCategorias(): string[] {
  return guardar([...CATEGORIAS_PADRAO]);
}

/**
 * Junta à lista as categorias que já estão gravadas nos hinos, para nenhuma
 * sumir dos formulários depois que o usuário editar a lista.
 */
export function registrarCategorias(nomes: string[]): string[] {
  const atual = lerCategorias();
  const novas = arrumar(nomes).filter(nome => !atual.some(c => mesmoNome(c, nome)));

  if (novas.length === 0) return atual;
  return guardar([...atual, ...novas]);
}
