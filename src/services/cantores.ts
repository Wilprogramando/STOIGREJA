/**
 * CANTORES
 *
 * Lista de cantores cadastrada nas Configurações e usada nos campos "Cantor"
 * do cadastro de hinos. Fica na tabela "cantores" do Supabase, então é a mesma
 * em todos os aparelhos. Uma cópia local mantém a lista funcionando offline.
 */

import { getAllHinos, getAllCantores, addCantor, deleteCantor } from './db';

const CHAVE_LOCAL = 'repertorio:cantores';

/** Cantores que já vêm cadastrados quando a lista ainda está vazia. */
export const CANTORES_PADRAO = ['Lili', 'Marcos'];

const ordenar = (lista: string[]) =>
  [...lista].sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));

/** Remove repetidos ignorando maiúsculas/minúsculas, mantendo a primeira grafia. */
const semRepetidos = (lista: string[]) => {
  const vistos = new Map<string, string>();
  lista
    .map(nome => (nome || '').trim())
    .filter(Boolean)
    .forEach(nome => {
      const chave = nome.toLocaleLowerCase('pt-BR');
      if (!vistos.has(chave)) vistos.set(chave, nome);
    });
  return Array.from(vistos.values());
};

const arrumar = (lista: string[]) => ordenar(semRepetidos(lista));

const mesmoNome = (a: string, b: string) =>
  (a || '').trim().toLocaleLowerCase('pt-BR') === (b || '').trim().toLocaleLowerCase('pt-BR');

function guardarLocal(lista: string[]): string[] {
  try {
    localStorage.setItem(CHAVE_LOCAL, JSON.stringify(lista));
  } catch (erro) {
    console.error('Não foi possível guardar os cantores no aparelho:', erro);
  }
  return lista;
}

/**
 * Última lista conhecida, sem ir na internet. Serve para a tela já abrir
 * preenchida enquanto a lista de verdade chega do Supabase.
 */
export function lerCantores(): string[] {
  try {
    const bruto = localStorage.getItem(CHAVE_LOCAL);
    if (!bruto) return arrumar(CANTORES_PADRAO);
    const lista = JSON.parse(bruto);
    return Array.isArray(lista) ? arrumar(lista) : arrumar(CANTORES_PADRAO);
  } catch {
    return arrumar(CANTORES_PADRAO);
  }
}

/** Busca a lista no Supabase. */
export async function carregarCantores(): Promise<string[]> {
  try {
    const lista = arrumar(await getAllCantores());
    return guardarLocal(lista);
  } catch (erro) {
    console.error('Não foi possível carregar os cantores:', erro);
    return lerCantores();
  }
}

export async function adicionarCantor(nome: string): Promise<string[]> {
  const limpo = (nome || '').trim();
  if (!limpo) return lerCantores();

  const atual = await carregarCantores();
  if (atual.some(c => mesmoNome(c, limpo))) return atual;

  const nova = arrumar([...atual, limpo]);
  guardarLocal(nova);
  await addCantor(limpo, nova);
  return nova;
}

export async function removerCantor(nome: string): Promise<string[]> {
  const atual = await carregarCantores();
  const nova = atual.filter(c => !mesmoNome(c, nome));
  guardarLocal(nova);
  await deleteCantor(nome.trim(), nova);
  return nova;
}

export async function renomearCantor(antigo: string, novo: string): Promise<string[]> {
  const limpo = (novo || '').trim();
  if (!limpo || mesmoNome(antigo, limpo)) return carregarCantores();

  await removerCantor(antigo);
  return adicionarCantor(limpo);
}

/** Junta nomes novos aos já cadastrados, sem apagar nada. */
export async function registrarCantores(nomes: string[]): Promise<string[]> {
  const atual = await carregarCantores();
  const novos = semRepetidos(nomes).filter(
    nome => !atual.some(c => mesmoNome(c, nome))
  );

  if (novos.length === 0) return atual;

  let lista = atual;
  for (const nome of novos) {
    lista = arrumar([...lista, nome]);
    guardarLocal(lista);
    await addCantor(nome, lista);
  }
  return lista;
}

/**
 * Deixa a lista completa: os dois cantores padrão (quando ainda não há nenhum)
 * e todos os que já estão gravados nos hinos cadastrados, para ninguém
 * precisar ser recadastrado à mão.
 */
export async function sincronizarCantoresDosHinos(): Promise<string[]> {
  try {
    const atual = await carregarCantores();
    const hinos = await getAllHinos();
    const dosHinos = hinos.map(h => h.cantor);
    const padrao = atual.length === 0 ? CANTORES_PADRAO : [];
    return registrarCantores([...padrao, ...dosHinos]);
  } catch (erro) {
    console.error('Não foi possível ler os cantores dos hinos:', erro);
    return lerCantores();
  }
}
