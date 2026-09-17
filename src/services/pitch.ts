/**
 * DETECÇÃO DE ALTURA (PITCH)
 *
 * Código compartilhado pelo Afinador (corda tocada) e pela tela
 * "Saber o Tom" (voz cantada). Roda 100% no aparelho - nenhum áudio sai daqui.
 */

export const NOTAS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export const NOTAS_PT: Record<string, string> = {
  C: 'Dó',
  'C#': 'Dó#',
  D: 'Ré',
  'D#': 'Ré#',
  E: 'Mi',
  F: 'Fá',
  'F#': 'Fá#',
  G: 'Sol',
  'G#': 'Sol#',
  A: 'Lá',
  'A#': 'Lá#',
  B: 'Si'
};

/** Nome da nota (ex.: "E2") a partir da frequência. */
export function notaDaFrequencia(freq: number, a4: number) {
  const semitons = Math.round(12 * Math.log2(freq / a4));
  const indice = (((semitons + 9) % 12) + 12) % 12;
  const oitava = 4 + Math.floor((semitons + 9) / 12);
  const frequenciaCerta = a4 * Math.pow(2, semitons / 12);
  const cents = Math.round(1200 * Math.log2(freq / frequenciaCerta));
  return { nome: NOTAS[indice], oitava, cents, frequenciaCerta };
}

/** Diferença em cents entre duas frequências. */
export function centsEntre(freq: number, alvo: number) {
  return Math.round(1200 * Math.log2(freq / alvo));
}

export interface OpcoesDeteccao {
  /** Frequência mais grave procurada, em Hz. */
  minHz?: number;
  /** Frequência mais aguda procurada, em Hz. */
  maxHz?: number;
  /** Volume mínimo (RMS) para considerar que há som. */
  volumeMinimo?: number;
  /** Correlação mínima para considerar que o som tem altura definida. */
  clarezaMinima?: number;
}

/**
 * Detecta a frequência fundamental por autocorrelação.
 * Retorna -1 quando o som está fraco demais ou indefinido.
 */
export function detectarFrequencia(
  buffer: Float32Array,
  sampleRate: number,
  opcoes: OpcoesDeteccao = {}
): number {
  const minHz = opcoes.minHz ?? 28;
  const maxHz = opcoes.maxHz ?? 1200;
  const volumeMinimo = opcoes.volumeMinimo ?? 0.008;
  const clarezaMinima = opcoes.clarezaMinima ?? 0.7;

  const tamanho = buffer.length;

  let rms = 0;
  for (let i = 0; i < tamanho; i++) rms += buffer[i] * buffer[i];
  rms = Math.sqrt(rms / tamanho);
  if (rms < volumeMinimo) return -1; // silêncio / ruído

  const lagMin = Math.floor(sampleRate / maxHz);
  const lagMax = Math.min(Math.floor(sampleRate / minHz), Math.floor(tamanho / 2));
  if (lagMax <= lagMin + 1) return -1;

  // Energia acumulada: evita recalcular as normas dentro do laço de cada atraso.
  const energia = new Float64Array(tamanho + 1);
  for (let i = 0; i < tamanho; i++) energia[i + 1] = energia[i] + buffer[i] * buffer[i];

  const correlacoes = new Float64Array(lagMax + 1);
  let melhorValor = 0;

  for (let lag = lagMin; lag <= lagMax; lag++) {
    const limite = tamanho - lag;
    let soma = 0;
    for (let i = 0; i < limite; i++) soma += buffer[i] * buffer[i + lag];

    const normaA = energia[limite] - energia[0];
    const normaB = energia[tamanho] - energia[lag];
    const correlacao = soma / (Math.sqrt(normaA * normaB) || 1);

    correlacoes[lag] = correlacao;
    if (correlacao > melhorValor) melhorValor = correlacao;
  }

  if (melhorValor < clarezaMinima) return -1; // som sem altura definida (ruído, batida)

  // Usa o PRIMEIRO pico que chega perto do máximo, e não o máximo em si:
  // assim não se confunde a nota com a oitava abaixo.
  const alvo = melhorValor * 0.93;
  let melhorLag = -1;
  for (let lag = lagMin + 1; lag < lagMax; lag++) {
    if (
      correlacoes[lag] >= alvo &&
      correlacoes[lag] >= correlacoes[lag - 1] &&
      correlacoes[lag] >= correlacoes[lag + 1]
    ) {
      melhorLag = lag;
      break;
    }
  }
  if (melhorLag < 0) return -1;

  // Interpolação parabólica: precisão de fração de amostra (evita erro de vários cents).
  const y1 = correlacoes[melhorLag - 1];
  const y2 = correlacoes[melhorLag];
  const y3 = correlacoes[melhorLag + 1];
  const divisor = 2 * (2 * y2 - y1 - y3);
  const ajuste = divisor !== 0 ? (y3 - y1) / divisor : 0;

  return sampleRate / (melhorLag + ajuste);
}
