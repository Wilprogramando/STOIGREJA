/**
 * CAMADA OFFLINE
 *
 * Guarda uma cópia local (localStorage) de tudo que vem do Supabase e
 * enfileira as gravações feitas sem internet para enviar quando a conexão voltar.
 *
 * Assim o sistema continua abrindo e funcionando na igreja mesmo com a internet caindo.
 */

const CACHE_PREFIX = 'repertorio_igreja_cache_';
const FILA_CHAVE = 'repertorio_igreja_fila_sync';

export const CACHE_HINOS = 'hinos';
export const CACHE_REPERTORIOS = 'repertorios';
export const CACHE_CONFIG = 'configuracoes';
export const CACHE_HARPA = 'harpa';
export const CACHE_ANOTACOES = 'anotacoes';

export interface OperacaoPendente {
  id: string;
  tipo: string;
  dados: any;
  criadoEm: string;
}

// ==================== CACHE LOCAL ====================

export function cacheSalvar(chave: string, dados: any): void {
  try {
    localStorage.setItem(CACHE_PREFIX + chave, JSON.stringify(dados));
  } catch (error) {
    // Cota do navegador estourada (logos em base64, por exemplo)
    console.warn('⚠️ Não foi possível guardar o cache local de', chave, error);
  }
}

export function cacheLer<T>(chave: string): T | null {
  try {
    const dados = localStorage.getItem(CACHE_PREFIX + chave);
    return dados ? (JSON.parse(dados) as T) : null;
  } catch (error) {
    console.warn('⚠️ Cache local inválido em', chave, error);
    return null;
  }
}

export function cacheLimpar(): void {
  const chaves: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const chave = localStorage.key(i);
    if (chave && chave.startsWith(CACHE_PREFIX)) chaves.push(chave);
  }
  chaves.forEach(chave => localStorage.removeItem(chave));
}

// ==================== ESTADO DA CONEXÃO ====================

export function estaOnline(): boolean {
  return typeof navigator === 'undefined' || navigator.onLine !== false;
}

// ==================== FILA DE SINCRONIZAÇÃO ====================

export function filaLer(): OperacaoPendente[] {
  try {
    const dados = localStorage.getItem(FILA_CHAVE);
    const fila = dados ? JSON.parse(dados) : [];
    return Array.isArray(fila) ? fila : [];
  } catch {
    return [];
  }
}

function filaGravar(fila: OperacaoPendente[]): void {
  try {
    localStorage.setItem(FILA_CHAVE, JSON.stringify(fila));
  } catch (error) {
    console.warn('⚠️ Não foi possível guardar a fila de sincronização', error);
  }
}

export function filaAdicionar(tipo: string, dados: any): void {
  const fila = filaLer();
  fila.push({
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    tipo,
    dados,
    criadoEm: new Date().toISOString()
  });
  filaGravar(fila);
  console.log(`📴 Sem conexão: "${tipo}" guardado para enviar depois (${fila.length} na fila)`);
  avisarMudanca();
}

export function filaTamanho(): number {
  return filaLer().length;
}

/**
 * Reenvia as operações pendentes na ordem em que foram feitas.
 * Para na primeira que falhar, para não perder a ordem das alterações.
 */
export async function filaProcessar(
  executar: (op: OperacaoPendente) => Promise<void>
): Promise<number> {
  if (!estaOnline()) return 0;

  let fila = filaLer();
  if (fila.length === 0) return 0;

  console.log(`🔄 Sincronizando ${fila.length} alteração(ões) feita(s) offline...`);
  let enviadas = 0;

  while (fila.length > 0) {
    const operacao = fila[0];
    try {
      await executar(operacao);
      fila = fila.slice(1);
      filaGravar(fila);
      enviadas++;
    } catch (error) {
      console.warn('⚠️ Sincronização interrompida em', operacao.tipo, error);
      break;
    }
  }

  if (enviadas > 0) {
    console.log(`✅ ${enviadas} alteração(ões) sincronizada(s) com o Supabase`);
    avisarMudanca();
  }
  return enviadas;
}

// ==================== AVISO PARA A INTERFACE ====================

function avisarMudanca(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('repertorio-sync-mudou', { detail: filaTamanho() }));
  }
}
