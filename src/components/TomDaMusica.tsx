import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, AlertCircle, RotateCcw, Music2 } from 'lucide-react';
import { NOTAS, NOTAS_PT, detectarFrequencia } from '../services/pitch';

/**
 * SABER O TOM DA MÚSICA
 *
 * Ouve a pessoa cantando pelo microfone e descobre em que tom ela está.
 * A resposta é SEMPRE um tom maior: quando a melodia é menor, mostramos o
 * relativo maior (mesmas notas, mesmos acordes), que é o que se toca.
 *
 * Como funciona, em três passos:
 *  1. Altura da voz nota a nota (autocorrelação, igual ao Afinador);
 *  2. Só as notas seguradas entram na conta - deslizes e consoantes ficam fora;
 *  3. As notas cantadas viram um "perfil" comparado com o de cada um dos 12
 *     tons (Krumhansl-Schmuckler). O tom que mais se parece é o resultado.
 *
 * Funciona 100% offline - nenhum áudio sai do aparelho.
 */

// ==================== TABELAS DO TOM ====================

/** Nome de cada tom maior, na escrita mais usada no violão. */
const NOMES_TOM = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

const NOMES_TOM_PT = ['Dó', 'Réb', 'Ré', 'Mib', 'Mi', 'Fá', 'Fá#', 'Sol', 'Láb', 'Lá', 'Sib', 'Si'];

/** Campo harmônico (I ii iii IV V vi vii°) de cada tom maior. */
const CAMPOS: string[][] = [
  ['C', 'Dm', 'Em', 'F', 'G', 'Am', 'B°'],
  ['Db', 'Ebm', 'Fm', 'Gb', 'Ab', 'Bbm', 'C°'],
  ['D', 'Em', 'F#m', 'G', 'A', 'Bm', 'C#°'],
  ['Eb', 'Fm', 'Gm', 'Ab', 'Bb', 'Cm', 'D°'],
  ['E', 'F#m', 'G#m', 'A', 'B', 'C#m', 'D#°'],
  ['F', 'Gm', 'Am', 'Bb', 'C', 'Dm', 'E°'],
  ['F#', 'G#m', 'A#m', 'B', 'C#', 'D#m', 'F°'],
  ['G', 'Am', 'Bm', 'C', 'D', 'Em', 'F#°'],
  ['Ab', 'Bbm', 'Cm', 'Db', 'Eb', 'Fm', 'G°'],
  ['A', 'Bm', 'C#m', 'D', 'E', 'F#m', 'G#°'],
  ['Bb', 'Cm', 'Dm', 'Eb', 'F', 'Gm', 'A°'],
  ['B', 'C#m', 'D#m', 'E', 'F#', 'G#m', 'A#°']
];

const GRAUS = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'];

/** Perfis de Krumhansl-Schmuckler: o "peso" de cada nota dentro do tom. */
const PERFIL_MAIOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const PERFIL_MENOR = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

// ==================== CONTA DO TOM ====================

/** Correlação de Pearson entre duas listas do mesmo tamanho. */
function correlacao(a: number[], b: number[]): number {
  const n = a.length;
  const mediaA = a.reduce((s, v) => s + v, 0) / n;
  const mediaB = b.reduce((s, v) => s + v, 0) / n;

  let cima = 0;
  let somaA = 0;
  let somaB = 0;

  for (let i = 0; i < n; i++) {
    const da = a[i] - mediaA;
    const db = b[i] - mediaB;
    cima += da * db;
    somaA += da * da;
    somaB += db * db;
  }

  const baixo = Math.sqrt(somaA * somaB);
  return baixo === 0 ? 0 : cima / baixo;
}

/**
 * Afinação do grupo: a pessoa (ou o violão) pode estar alguns cents acima ou
 * abaixo do Lá 440. Tirando esse desvio antes de arredondar, uma voz "no meio
 * do caminho" não cai na nota errada.
 *
 * Média circular, porque -49 cents e +49 cents são vizinhos, não opostos.
 */
function desvioDoGrupo(frequencias: number[]): number {
  let x = 0;
  let y = 0;

  for (const hz of frequencias) {
    const semitons = 12 * Math.log2(hz / 440);
    const desvio = (semitons - Math.round(semitons)) * 100; // -50..+50 cents
    const angulo = (desvio / 100) * 2 * Math.PI;
    x += Math.cos(angulo);
    y += Math.sin(angulo);
  }

  if (x === 0 && y === 0) return 0;
  return (Math.atan2(y, x) / (2 * Math.PI)) * 100;
}

/** Só as notas seguradas: as vizinhas precisam estar na mesma altura. */
function apenasNotasSeguradas(frequencias: number[]): number[] {
  const firmes: number[] = [];

  for (let i = 1; i < frequencias.length - 1; i++) {
    const antes = Math.abs(1200 * Math.log2(frequencias[i] / frequencias[i - 1]));
    const depois = Math.abs(1200 * Math.log2(frequencias[i] / frequencias[i + 1]));
    if (antes < 60 && depois < 60) firmes.push(frequencias[i]);
  }

  return firmes;
}

interface Resultado {
  /** Tom maior para tocar (0 = Dó). */
  tom: number;
  /** A melodia em si é menor? (o tom para tocar continua sendo o maior.) */
  eraMenor: boolean;
  /** 0 a 100: o quanto a leitura é confiável. */
  certeza: number;
  /** Outros tons que também servem, do melhor para o pior. */
  alternativos: number[];
  /** Peso de cada nota cantada, 0 a 1, na ordem de NOTAS. */
  pesos: number[];
  desvio: number;
  maisGrave: number;
  maisAguda: number;
  notasUsadas: number;
}

function descobrirTom(frequencias: number[]): Resultado | null {
  const firmes = apenasNotasSeguradas(frequencias);
  if (firmes.length < 12) return null;

  const desvio = desvioDoGrupo(firmes);

  // Cada leitura vira uma nota da escala; o peso é o tempo que ela ficou soando.
  const pesos: number[] = new Array(12).fill(0);

  for (const hz of firmes) {
    const semitons = 12 * Math.log2(hz / 440) - desvio / 100;
    const indice = (((Math.round(semitons) + 9) % 12) + 12) % 12; // 0 = Dó
    pesos[indice] += 1;
  }

  // Compara o que foi cantado com os 12 tons maiores e os 12 menores.
  const candidatos: { tom: number; nota: number; menor: boolean }[] = [];

  for (let t = 0; t < 12; t++) {
    const rodado = pesos.map((_, i) => pesos[(i + t) % 12]);
    candidatos.push({ tom: t, nota: correlacao(rodado, PERFIL_MAIOR), menor: false });
    // Menor: o tom para TOCAR é o relativo maior (3 semitons acima).
    candidatos.push({ tom: (t + 3) % 12, nota: correlacao(rodado, PERFIL_MENOR), menor: true });
  }

  candidatos.sort((a, b) => b.nota - a.nota);
  const melhor = candidatos[0];

  // Melhor nota de cada tom maior (o maior e seu relativo menor têm os mesmos acordes).
  const porTom = new Map<number, number>();
  for (const c of candidatos) {
    if (!porTom.has(c.tom) || (porTom.get(c.tom) as number) < c.nota) porTom.set(c.tom, c.nota);
  }

  const ranking = [...porTom.entries()].sort((a, b) => b[1] - a[1]);
  const segundo = ranking[1]?.[1] ?? 0;

  // Certeza: mistura o quanto o tom bate com a música (correlação), o quanto
  // ele ganha do segundo colocado e o tanto de voz que foi ouvido.
  const forca = Math.max(0, Math.min(1, (melhor.nota - 0.3) / 0.6));
  const vantagem = Math.max(0, Math.min(1, (melhor.nota - segundo) / 0.25));
  const tempo = Math.max(0, Math.min(1, firmes.length / 60));
  const certeza = Math.round(100 * (0.45 * forca + 0.35 * vantagem + 0.2 * tempo));

  const maior = Math.max(...pesos);

  return {
    tom: melhor.tom,
    eraMenor: melhor.menor,
    certeza,
    alternativos: ranking.slice(1, 3).map(([t]) => t),
    pesos: pesos.map(p => (maior > 0 ? p / maior : 0)),
    desvio: Math.round(desvio) || 0, // o `|| 0` tira o "-0" da tela
    maisGrave: Math.min(...firmes),
    maisAguda: Math.max(...firmes),
    notasUsadas: firmes.length
  };
}

/** Nome da nota cantada (ex.: "Sol3"), para mostrar a extensão da voz. */
function nomeDaNota(hz: number): string {
  const semitons = Math.round(12 * Math.log2(hz / 440));
  const indice = (((semitons + 9) % 12) + 12) % 12;
  const oitava = 4 + Math.floor((semitons + 9) / 12);
  return `${NOTAS_PT[NOTAS[indice]]}${oitava}`;
}

// ==================== TELA ====================

/** Leituras mínimas antes de arriscar um palpite (~2,5 segundos cantando). */
const LEITURAS_MINIMAS = 25;

export const TomDaMusica: React.FC = () => {
  const [ouvindo, setOuvindo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [notaAtual, setNotaAtual] = useState<string | null>(null);
  const [capturadas, setCapturadas] = useState(0);
  const [resultado, setResultado] = useState<Resultado | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const lidasRef = useRef<number[]>([]);

  const parar = () => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    audioCtxRef.current?.close().catch(() => undefined);
    audioCtxRef.current = null;
    setOuvindo(false);
    setNotaAtual(null);
  };

  // Sai da tela: desliga o microfone.
  useEffect(() => parar, []);

  const limpar = () => {
    lidasRef.current = [];
    setCapturadas(0);
    setResultado(null);
  };

  const começar = async () => {
    setErro(null);
    limpar();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });

      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const fonte = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      // Janela longa o bastante para a voz masculina grave (~80 Hz) caber
      // várias vezes dentro dela.
      analyser.fftSize = 8192;
      fonte.connect(analyser);

      streamRef.current = stream;
      audioCtxRef.current = ctx;
      setOuvindo(true);

      const buffer = new Float32Array(analyser.fftSize);
      let ultimaLeitura = 0;

      const medir = (agora: number) => {
        rafRef.current = requestAnimationFrame(medir);

        // ~12 leituras por segundo: a janela é longa, medir mais vezes só
        // gastaria bateria.
        if (agora - ultimaLeitura < 80) return;
        ultimaLeitura = agora;

        analyser.getFloatTimeDomainData(buffer);

        // Faixa da voz cantada, do baixo profundo ao soprano. A exigência de
        // clareza é maior que a do afinador: a voz tem consoante e respiração.
        const hz = detectarFrequencia(buffer, ctx.sampleRate, {
          minHz: 70,
          maxHz: 1100,
          volumeMinimo: 0.012,
          clarezaMinima: 0.8
        });

        if (hz < 0) {
          setNotaAtual(null);
          return;
        }

        setNotaAtual(nomeDaNota(hz));

        const lidas = [...lidasRef.current, hz];
        lidasRef.current = lidas;
        setCapturadas(lidas.length);

        // Resultado ao vivo: vai se firmando enquanto a pessoa canta.
        if (lidas.length >= LEITURAS_MINIMAS && lidas.length % 5 === 0) {
          setResultado(descobrirTom(lidas));
        }
      };

      rafRef.current = requestAnimationFrame(medir);
    } catch (e: any) {
      console.error('Erro ao acessar o microfone:', e);
      setErro(
        e?.name === 'NotAllowedError'
          ? 'Permissão do microfone negada. Libere o microfone para este site e tente de novo.'
          : 'Não foi possível acessar o microfone deste aparelho.'
      );
    }
  };

  const finalizar = () => {
    parar();
    setResultado(descobrirTom(lidasRef.current));
  };

  const segundos = (capturadas * 0.08).toFixed(1);
  const progresso = Math.min(100, (capturadas / 75) * 100); // 75 leituras ≈ 6 s de voz
  const campo = resultado ? CAMPOS[resultado.tom] : null;

  const corCerteza = (c: number) =>
    c >= 70 ? 'text-green-600' : c >= 45 ? 'text-amber-600' : 'text-red-600';

  const textoCerteza = (c: number) =>
    c >= 70 ? 'Leitura firme' : c >= 45 ? 'Leitura razoável' : 'Cante mais um pouco';

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Saber o Tom da Música</h2>
        <p className="text-gray-600">
          Ligue o microfone, peça para a pessoa cantar um trecho e o sistema diz o tom para tocar.
        </p>
      </div>

      {erro && (
        <div className="mb-4 flex items-start gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
          <AlertCircle size={20} className="shrink-0 mt-0.5" />
          <span className="text-sm">{erro}</span>
        </div>
      )}

      {/* ---------- MICROFONE ---------- */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-4 text-center">
        {!ouvindo ? (
          <button
            onClick={começar}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 bg-indigo-600 text-white rounded-xl font-semibold text-lg shadow-sm hover:bg-indigo-700 transition active:scale-95"
          >
            <Mic size={22} />
            Ligar o microfone
          </button>
        ) : (
          <>
            <div className="flex items-center justify-center gap-2 text-indigo-600 font-semibold mb-3">
              <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
              Ouvindo... {segundos}s de voz
            </div>

            <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
              <div
                className="h-full bg-indigo-500 transition-all duration-200"
                style={{ width: `${progresso}%` }}
              />
            </div>

            <div className="text-4xl font-bold text-gray-800 mb-4 h-12 flex items-center justify-center">
              {notaAtual || <span className="text-base font-normal text-gray-400">silêncio</span>}
            </div>

            <button
              onClick={finalizar}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 bg-gray-800 text-white rounded-xl font-semibold text-lg hover:bg-gray-900 transition active:scale-95"
            >
              <MicOff size={22} />
              Parar e ver o tom
            </button>
          </>
        )}

        {!ouvindo && capturadas > 0 && (
          <button
            onClick={limpar}
            className="mt-3 inline-flex items-center gap-2 px-4 py-2 text-gray-600 text-sm hover:text-gray-800"
          >
            <RotateCcw size={16} />
            Limpar e começar de novo
          </button>
        )}
      </div>

      {/* ---------- RESULTADO ---------- */}
      {resultado && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-4">
          <div className="p-6 text-center bg-gradient-to-b from-indigo-50 to-white">
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">
              Tom para tocar
            </p>

            <p className="text-6xl font-bold text-indigo-700 my-2">{NOMES_TOM[resultado.tom]}</p>

            <p className="text-lg text-gray-700">{NOMES_TOM_PT[resultado.tom]} maior</p>

            <p className={`mt-3 text-sm font-semibold ${corCerteza(resultado.certeza)}`}>
              {textoCerteza(resultado.certeza)} · {resultado.certeza}% de certeza
            </p>

            {resultado.eraMenor && (
              <p className="mt-3 text-xs text-gray-500 max-w-sm mx-auto">
                A melodia tem cara de {NOMES_TOM_PT[(resultado.tom + 9) % 12]} menor — que usa
                exatamente as mesmas notas e os mesmos acordes de {NOMES_TOM_PT[resultado.tom]}{' '}
                maior.
              </p>
            )}
          </div>

          {/* Acordes do tom */}
          {campo && (
            <div className="p-4 border-t border-gray-100">
              <p className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <Music2 size={16} className="text-indigo-600" />
                Acordes deste tom
              </p>

              <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                {campo.map((acorde, i) => (
                  <div
                    key={acorde}
                    className={`p-2 rounded-lg border text-center ${
                      i === 0 || i === 3 || i === 4
                        ? 'bg-indigo-50 border-indigo-200'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <p className="text-[10px] text-gray-500">{GRAUS[i]}</p>
                    <p className="font-bold text-gray-800">{acorde}</p>
                  </div>
                ))}
              </div>

              <p className="text-xs text-gray-500 mt-2">
                Os três em destaque ({campo[0]}, {campo[3]} e {campo[4]}) já seguram a maioria dos
                louvores.
              </p>
            </div>
          )}

          {/* Outros tons possíveis */}
          {resultado.alternativos.length > 0 && (
            <div className="p-4 border-t border-gray-100">
              <p className="text-sm font-semibold text-gray-700 mb-2">Se não encaixar, tente</p>

              <div className="flex gap-2 flex-wrap">
                {resultado.alternativos.map(t => (
                  <span
                    key={t}
                    className="px-3 py-1.5 bg-gray-100 rounded-lg text-sm font-semibold text-gray-700"
                  >
                    {NOMES_TOM[t]}{' '}
                    <span className="font-normal text-gray-500">({NOMES_TOM_PT[t]})</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Detalhes da voz */}
          <div className="p-4 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div>
              <p className="text-[11px] text-gray-500">Nota mais grave</p>
              <p className="font-bold text-gray-800">{nomeDaNota(resultado.maisGrave)}</p>
            </div>

            <div>
              <p className="text-[11px] text-gray-500">Nota mais aguda</p>
              <p className="font-bold text-gray-800">{nomeDaNota(resultado.maisAguda)}</p>
            </div>

            <div>
              <p className="text-[11px] text-gray-500">Afinação da voz</p>
              <p className="font-bold text-gray-800">
                {resultado.desvio > 0 ? '+' : ''}
                {resultado.desvio} cents
              </p>
            </div>

            <div>
              <p className="text-[11px] text-gray-500">Notas analisadas</p>
              <p className="font-bold text-gray-800">{resultado.notasUsadas}</p>
            </div>
          </div>

          {/* Notas mais cantadas */}
          <div className="p-4 border-t border-gray-100">
            <p className="text-sm font-semibold text-gray-700 mb-2">Notas que ela mais cantou</p>

            <div className="flex items-end gap-1 h-24">
              {resultado.pesos.map((peso, i) => {
                const naEscala = [0, 2, 4, 5, 7, 9, 11]
                  .map(g => (g + resultado.tom) % 12)
                  .includes(i);

                return (
                  <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
                    <div
                      className={`w-full rounded-t ${naEscala ? 'bg-indigo-500' : 'bg-gray-300'}`}
                      style={{ height: `${Math.max(2, peso * 100)}%` }}
                    />
                    <span className="text-[9px] text-gray-500 mt-1">{NOTAS[i]}</span>
                  </div>
                );
              })}
            </div>

            <p className="text-xs text-gray-500 mt-2">
              Em azul, as notas que pertencem ao tom de {NOMES_TOM[resultado.tom]}.
            </p>
          </div>
        </div>
      )}

      {!resultado && !ouvindo && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4">
          <p className="text-sm font-semibold text-indigo-900 mb-1">Para acertar o tom</p>

          <ul className="text-sm text-indigo-800 space-y-1 list-disc list-inside">
            <li>
              Peça um trecho com <strong>letra</strong>, de 10 a 20 segundos — o refrão é o melhor.
            </li>
            <li>Segure o celular a um palmo da boca, num lugar sem barulho.</li>
            <li>
              Que cante <strong>sozinha</strong>: instrumento tocando junto atrapalha a leitura.
            </li>
            <li>Deixe passar dos 70% de certeza antes de fechar o tom.</li>
          </ul>
        </div>
      )}
    </div>
  );
};
