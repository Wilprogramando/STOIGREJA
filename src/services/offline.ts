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
export const CACHE_CANTORES = 'cantores';
export const CACHE_MUSICAS_AUDIO = 'musicas_audio';
export const CACHE_FAVORITAS = 'favoritas_musicas';

export interface OperacaoPendente {
  id: string;
  tipo: string;
  dados: any;
  criadoEm: string;
}

// ==================== CACHE LOCAL ====================

/**
 * Ordem de sacrifício quando a memória do navegador enche.
 *
 * O que importa no culto sem internet é a LETRA do hino. Se faltar espaço,
 * jogamos fora primeiro o que dá para viver sem (lista de áudios, favoritas)
 * e só então desistimos.
 */
const DESCARTAVEIS = [CACHE_MUSICAS_AUDIO, CACHE_FAVORITAS, CACHE_CANTORES];

export function cacheSalvar(chave: string, dados: any): void {
  const texto = JSON.stringify(dados);

  try {
    localStorage.setItem(CACHE_PREFIX + chave, texto);
    return;
  } catch (error) {
    console.warn('⚠️ Memória do aparelho cheia ao guardar', chave, '- liberando espaço...');
  }

  // Cota estourada: abre espaço e tenta de novo, para as letras não ficarem
  // de fora justamente na hora do culto.
  for (const descartavel of DESCARTAVEIS) {
    if (descartavel === chave) continue;

    try {
      localStorage.removeItem(CACHE_PREFIX + descartavel);
      localStorage.setItem(CACHE_PREFIX + chave, texto);
      console.log('✅ Cache local de', chave, 'guardado depois de liberar espaço');
      return;
    } catch {
      // Ainda não coube: continua liberando.
    }
  }

  console.warn('⚠️ Não foi possível guardar o cache local de', chave);
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

/** Tira uma operação da fila (usada pelo painel de pendências). */
export function filaRemover(id: string): OperacaoPendente[] {
  const fila = filaLer().filter(op => op.id !== id);
  filaGravar(fila);
  avisarMudanca();
  return fila;
}

/** Esvazia a fila inteira. */
export function filaLimpar(): void {
  filaGravar([]);
  avisarMudanca();
}
