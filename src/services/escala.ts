/**
 * ESCALA DOS CONJUNTOS
 *
 * A igreja tem mais de um conjunto, e cada um toca em certos dias da semana.
 * Aqui ficam os dois cadastros:
 *   - CONJUNTOS: o nome de cada grupo e a cor dele no calendário
 *   - ESCALA: os dias marcados para cada conjunto tocar
 *
 * Tudo vai para o Supabase (ver supabase_escala.sql), então a escala marcada
 * em um celular aparece nos outros aparelhos da equipe. Uma cópia local
 * mantém o calendário aberto e funcionando quando a internet cai.
 */

import { Conjunto, DiaDaEscala } from '../types';
import {
  lerConjuntosSupabase,
  salvarConjuntoSupabase,
  removerConjuntoSupabase,
  lerEscalaSupabase,
  salvarDiaEscalaSupabase,
  removerDiaEscalaSupabase,
  ouvirEscalaSupabase,
} from './supabase';

export type { Conjunto, DiaDaEscala };
export { ouvirEscalaSupabase as ouvirEscala };

const CHAVE_CONJUNTOS = 'repertorio:conjuntos';
const CHAVE_ESCALA = 'repertorio:escala';

/** Cores que o conjunto pode usar no calendário. */
export interface CorConjunto {
  id: string;
  nome: string;
  /** Fundo cheio: a bolinha do dia e a etiqueta. */
  forte: string;
  /** Fundo fraco e texto, para cartões e listas. */
  fraco: string;
  texto: string;
  borda: string;
}

export const CORES: CorConjunto[] = [
  { id: 'indigo', nome: 'Azul',     forte: 'bg-indigo-600',  fraco: 'bg-indigo-50',  texto: 'text-indigo-700',  borda: 'border-indigo-200' },
  { id: 'rose',   nome: 'Vermelho', forte: 'bg-rose-600',    fraco: 'bg-rose-50',    texto: 'text-rose-700',    borda: 'border-rose-200' },
  { id: 'emerald',nome: 'Verde',    forte: 'bg-emerald-600', fraco: 'bg-emerald-50', texto: 'text-emerald-700', borda: 'border-emerald-200' },
  { id: 'amber',  nome: 'Amarelo',  forte: 'bg-amber-500',   fraco: 'bg-amber-50',   texto: 'text-amber-700',   borda: 'border-amber-200' },
  { id: 'violet', nome: 'Roxo',     forte: 'bg-violet-600',  fraco: 'bg-violet-50',  texto: 'text-violet-700',  borda: 'border-violet-200' },
  { id: 'cyan',   nome: 'Ciano',    forte: 'bg-cyan-600',    fraco: 'bg-cyan-50',    texto: 'text-cyan-700',    borda: 'border-cyan-200' },
];

export function corDoConjunto(conjunto?: Conjunto | null): CorConjunto {
  return CORES.find(c => c.id === conjunto?.cor) || CORES[0];
}

/** Cor ainda não usada por ninguém, para o conjunto novo já sair diferente. */
export function corLivre(conjuntos: Conjunto[]): string {
  const usadas = new Set(conjuntos.map(c => c.cor));
  return (CORES.find(c => !usadas.has(c.id)) || CORES[0]).id;
}

function guardar<T>(chave: string, dados: T): T {
  try {
    localStorage.setItem(chave, JSON.stringify(dados));
  } catch (erro) {
    console.error('Não foi possível guardar a escala no aparelho:', erro);
  }
  return dados;
}

function lerLocal<T>(chave: string): T[] {
  try {
    const bruto = localStorage.getItem(chave);
    const lista = bruto ? JSON.parse(bruto) : [];
    return Array.isArray(lista) ? lista : [];
  } catch {
    return [];
  }
}

const novoId = (prefixo: string) =>
  `${prefixo}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

// ==================== CONJUNTOS ====================

/** Última lista conhecida, sem ir na internet: a tela já abre preenchida. */
export const lerConjuntos = (): Conjunto[] => lerLocal<Conjunto>(CHAVE_CONJUNTOS);

export async function carregarConjuntos(): Promise<Conjunto[]> {
  const doServidor = await lerConjuntosSupabase();
  if (doServidor === null) return lerConjuntos(); // sem internet: fica a cópia local
  return guardar(CHAVE_CONJUNTOS, doServidor as Conjunto[]);
}

export async function salvarConjunto(dados: Partial<Conjunto>): Promise<Conjunto[]> {
  const nome = (dados.nome || '').trim();
  if (!nome) return lerConjuntos();

  const atuais = lerConjuntos();
  const antigo = atuais.find(c => c.id === dados.id);

  const conjunto: Conjunto = {
    id: dados.id || novoId('conjunto'),
    nome,
    cor: dados.cor || antigo?.cor || corLivre(atuais),
    criadoEm: antigo?.criadoEm || new Date().toISOString(),
  };

  const lista = antigo
    ? atuais.map(c => (c.id === conjunto.id ? conjunto : c))
    : [...atuais, conjunto];

  guardar(CHAVE_CONJUNTOS, lista);
  await salvarConjuntoSupabase(conjunto);
  return lista;
}

/** Tira o conjunto e, junto com ele, todos os dias marcados para ele. */
export async function excluirConjunto(id: string): Promise<Conjunto[]> {
  const lista = lerConjuntos().filter(c => c.id !== id);
  guardar(CHAVE_CONJUNTOS, lista);
  guardar(CHAVE_ESCALA, lerEscala().filter(d => d.conjuntoId !== id));

  await removerConjuntoSupabase(id);
  return lista;
}

// ==================== DIAS DA ESCALA ====================

const porData = (lista: DiaDaEscala[]) =>
  [...lista].sort((a, b) => a.data.localeCompare(b.data) || a.horario.localeCompare(b.horario));

export const lerEscala = (): DiaDaEscala[] => porData(lerLocal<DiaDaEscala>(CHAVE_ESCALA));

export async function carregarEscala(): Promise<DiaDaEscala[]> {
  const doServidor = await lerEscalaSupabase();
  if (doServidor === null) return lerEscala();
  return guardar(CHAVE_ESCALA, porData(doServidor as DiaDaEscala[]));
}

export async function salvarDia(dados: Partial<DiaDaEscala>): Promise<DiaDaEscala[]> {
  if (!dados.conjuntoId || !dados.data) return lerEscala();

  const atuais = lerEscala();
  const antigo = atuais.find(d => d.id === dados.id);

  const dia: DiaDaEscala = {
    id: dados.id || novoId('escala'),
    conjuntoId: dados.conjuntoId,
    data: dados.data,
    horario: dados.horario || '',
    observacoes: dados.observacoes || '',
    criadoEm: antigo?.criadoEm || new Date().toISOString(),
  };

  const lista = porData(
    antigo ? atuais.map(d => (d.id === dia.id ? dia : d)) : [...atuais, dia]
  );

  guardar(CHAVE_ESCALA, lista);
  await salvarDiaEscalaSupabase(dia);
  return lista;
}

export async function excluirDia(id: string): Promise<DiaDaEscala[]> {
  const lista = lerEscala().filter(d => d.id !== id);
  guardar(CHAVE_ESCALA, lista);

  await removerDiaEscalaSupabase(id);
  return lista;
}

/**
 * Marca vários dias de uma vez — usado pelo "repetir toda semana", que
 * agenda o mesmo conjunto no mesmo dia da semana por algumas semanas.
 */
export async function salvarDias(dias: Partial<DiaDaEscala>[]): Promise<DiaDaEscala[]> {
  let lista = lerEscala();
  for (const dia of dias) {
    lista = await salvarDia(dia);
  }
  return lista;
}

// ==================== AJUDA COM DATAS ====================

/** Data de hoje (ou de qualquer Date) em AAAA-MM-DD, no fuso do aparelho. */
export function emTexto(data: Date): string {
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${data.getFullYear()}-${mes}-${dia}`;
}

/** AAAA-MM-DD virando Date local (sem o pulo de fuso do new Date("...")). */
export function emData(texto: string): Date {
  const [ano, mes, dia] = (texto || '').split('-').map(Number);
  return new Date(ano || 1970, (mes || 1) - 1, dia || 1);
}

export const hoje = () => emTexto(new Date());

export const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export const MESES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

/**
 * As 42 casas do calendário do mês (6 semanas), começando no domingo.
 * Os dias de fora do mês vêm marcados, para aparecerem apagados na tela.
 */
export function diasDoCalendario(ano: number, mes: number) {
  const primeiro = new Date(ano, mes, 1);
  const inicio = new Date(ano, mes, 1 - primeiro.getDay());

  return Array.from({ length: 42 }, (_, i) => {
    const data = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + i);
    return {
      data: emTexto(data),
      dia: data.getDate(),
      doMes: data.getMonth() === mes,
      ehHoje: emTexto(data) === hoje(),
    };
  });
}

/** Dia 15/03/2026 escrito como "domingo, 15 de março". */
export function porExtenso(texto: string): string {
  const data = emData(texto);
  const semana = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
  return `${semana[data.getDay()]}, ${data.getDate()} de ${MESES[data.getMonth()].toLowerCase()}`;
}
