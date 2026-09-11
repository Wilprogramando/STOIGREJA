/**
 * MÚSICAS FAVORITAS
 *
 * Ficam no Supabase (tabela favoritos_musicas), com cópia local para
 * continuar funcionando sem internet - igual ao resto do sistema. Assim a
 * música marcada em um celular aparece nos outros aparelhos da equipe.
 *
 * Dois tipos convivem na mesma lista:
 *   - "cadastrada": uma música de "Minhas músicas" (guarda só o código dela)
 *   - "internet": uma música achada na busca, guardada com o que precisa para
 *     tocar a prévia e abrir no YouTube depois.
 */

import { Favorita } from '../types';
import { getAllFavoritas, saveFavorita, deleteFavorita } from './db';

export type { Favorita };

export function listarFavoritas(): Promise<Favorita[]> {
  return getAllFavoritas();
}

/**
 * Marca ou desmarca a música e devolve a lista já atualizada.
 *
 * A lista atual vem por parâmetro para a tela responder na hora, sem esperar
 * a ida à nuvem (que acontece em seguida, e entra na fila se estiver offline).
 */
export async function alternarFavorita(
  atuais: Favorita[],
  dados: Omit<Favorita, 'criadoEm'>
): Promise<Favorita[]> {
  const jaTem = atuais.some(f => f.id === dados.id);

  if (jaTem) {
    await deleteFavorita(dados.id);
    return atuais.filter(f => f.id !== dados.id);
  }

  const nova: Favorita = { ...dados, criadoEm: new Date().toISOString() };
  await saveFavorita(nova);
  return [...atuais, nova];
}

export async function removerFavorita(
  atuais: Favorita[],
  id: string
): Promise<Favorita[]> {
  await deleteFavorita(id);
  return atuais.filter(f => f.id !== id);
}
