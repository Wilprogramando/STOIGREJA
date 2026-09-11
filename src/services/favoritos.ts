/**
 * MÚSICAS FAVORITAS
 *
 * Guardadas no próprio aparelho (localStorage), porque favorito é gosto de
 * cada um: o que o baixista marca não precisa aparecer para a cantora.
 *
 * Dois tipos convivem na mesma lista:
 *   - "cadastrada": uma música de "Minhas músicas" (guarda só o código dela)
 *   - "internet": uma música achada na busca, guardada com o que precisa para
 *     tocar a prévia e abrir no YouTube depois.
 */

const CHAVE = 'repertorio:musicas-favoritas';

export interface Favorita {
  id: string;
  tipo: 'cadastrada' | 'internet';
  nome: string;
  cantor: string;
  /** Só para as da internet. */
  capa?: string;
  previa?: string;
  youtube?: string;
  criadoEm: string;
}

export function lerFavoritas(): Favorita[] {
  try {
    const bruto = localStorage.getItem(CHAVE);
    const lista = bruto ? JSON.parse(bruto) : [];
    return Array.isArray(lista) ? lista : [];
  } catch {
    return [];
  }
}

function gravar(lista: Favorita[]): void {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(lista));
  } catch (erro) {
    console.error('Não foi possível guardar os favoritos:', erro);
  }
}

export function ehFavorita(id: string): boolean {
  return lerFavoritas().some(f => f.id === id);
}

/** Marca ou desmarca; devolve a lista já atualizada. */
export function alternarFavorita(dados: Omit<Favorita, 'criadoEm'>): Favorita[] {
  const lista = lerFavoritas();
  const jaTem = lista.some(f => f.id === dados.id);

  const nova = jaTem
    ? lista.filter(f => f.id !== dados.id)
    : [...lista, { ...dados, criadoEm: new Date().toISOString() }];

  gravar(nova);
  return nova;
}

export function removerFavorita(id: string): Favorita[] {
  const nova = lerFavoritas().filter(f => f.id !== id);
  gravar(nova);
  return nova;
}
