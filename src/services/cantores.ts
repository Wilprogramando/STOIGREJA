/**
 * CANTORES
 *
 * Lista de cantores cadastrada nas Configurações e usada nos campos "Cantor"
 * do cadastro de hinos. Fica no localStorage, igual aos menus: nenhuma tabela
 * nova precisa ser criada no Supabase.
 */

import { getAllHinos } from './db';

const CHAVE = 'repertorio:cantores';

/** Cantores que já vêm cadastrados na primeira vez que a tela abre. */
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

export function lerCantores(): string[] {
  try {
    const bruto = localStorage.getItem(CHAVE);
    if (!bruto) return ordenar(CANTORES_PADRAO);
    const lista = JSON.parse(bruto);
    return Array.isArray(lista) ? ordenar(semRepetidos(lista)) : ordenar(CANTORES_PADRAO);
  } catch {
    return ordenar(CANTORES_PADRAO);
  }
}

export function salvarCantores(lista: string[]): string[] {
  const limpa = ordenar(semRepetidos(lista));
  try {
    localStorage.setItem(CHAVE, JSON.stringify(limpa));
  } catch (erro) {
    console.error('Não foi possível salvar os cantores:', erro);
  }
  return limpa;
}

/** Adiciona um cantor. Se já existir (mesmo nome), a lista volta sem mudança. */
export function adicionarCantor(nome: string): string[] {
  return salvarCantores([...lerCantores(), nome]);
}

export function removerCantor(nome: string): string[] {
  const chave = (nome || '').trim().toLocaleLowerCase('pt-BR');
  return salvarCantores(lerCantores().filter(c => c.toLocaleLowerCase('pt-BR') !== chave));
}

export function renomearCantor(antigo: string, novo: string): string[] {
  const chave = (antigo || '').trim().toLocaleLowerCase('pt-BR');
  return salvarCantores(
    lerCantores().map(c => (c.toLocaleLowerCase('pt-BR') === chave ? novo : c))
  );
}

/** Junta nomes novos aos já cadastrados, sem apagar nada. */
export function registrarCantores(nomes: string[]): string[] {
  return salvarCantores([...lerCantores(), ...nomes]);
}

/**
 * Traz para a lista os cantores que já estão gravados nos hinos cadastrados,
 * para quem já usa o sistema não precisar recadastrar ninguém.
 */
export async function sincronizarCantoresDosHinos(): Promise<string[]> {
  try {
    const hinos = await getAllHinos();
    return registrarCantores(hinos.map(h => h.cantor));
  } catch (erro) {
    console.error('Não foi possível ler os cantores dos hinos:', erro);
    return lerCantores();
  }
}
