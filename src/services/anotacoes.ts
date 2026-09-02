/**
 * ANOTAÇÕES DE SUGESTÕES DE HINOS
 *
 * Ficam no Supabase (tabela anotacoes_hinos), com cópia local para
 * continuar funcionando sem internet, igual ao resto do sistema.
 */

import { Anotacao } from '../types';
import { getAllAnotacoes, saveAnotacao, deleteAnotacao } from './db';

export type { Anotacao };

export function listarAnotacoes(): Promise<Anotacao[]> {
  return getAllAnotacoes();
}

export function salvarAnotacao(dados: Partial<Anotacao>): Promise<Anotacao> {
  const anotacao: Anotacao = {
    id: dados.id || `anotacao_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    hino: dados.hino || '',
    cantor: dados.cantor || '',
    tom: dados.tom || '',
    observacoes: dados.observacoes || '',
    criadoEm: dados.criadoEm || new Date().toISOString()
  };

  return saveAnotacao(anotacao);
}

export function excluirAnotacao(id: string): Promise<void> {
  return deleteAnotacao(id);
}
