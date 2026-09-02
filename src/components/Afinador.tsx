import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Check, AlertCircle, Volume2, VolumeX } from 'lucide-react';

/**
 * AFINADOR CROMÁTICO
 *
 * Ouve o microfone, descobre a frequência da corda tocada (autocorrelação)
 * e mostra o quanto ela está longe da nota certa, em cents.
 *
 * Funciona 100% offline - nenhum áudio sai do aparelho.
 */

interface Corda {
  nome: string;
  nota: string;
  frequencia: number;
}

interface Instrumento {
  id: string;
  nome: string;
  cordas: Corda[];
}

// Frequências em Hz com Lá4 = 440 (recalculadas quando o usuário muda o diapasão).
const INSTRUMENTOS: Instrumento[] = [
  {
    id: 'violao',
    nome: 'Violão / Guitarra',
    cordas: [
      { nome: '6ª', nota: 'E2', frequencia: 82.41 },
      { nome: '5ª', nota: 'A2', frequencia: 110.0 },
      { nome: '4ª', nota: 'D3', frequencia: 146.83 },
      { nome: '3ª', nota: 'G3', frequencia: 196.0 },
      { nome: '2ª', nota: 'B3', frequencia: 246.94 },
      { nome: '1ª', nota: 'E4', frequencia: 329.63 }
    ]
  },
  {
    id: 'violao-drop-d',
    nome: 'Violão em Ré (Drop D)',
    cordas: [
      { nome: '6ª', nota: 'D2', frequencia: 73.42 },
      { nome: '5ª', nota: 'A2', frequencia: 110.0 },
      { nome: '4ª', nota: 'D3', frequencia: 146.83 },
      { nome: '3ª', nota: 'G3', frequencia: 196.0 },
      { nome: '2ª', nota: 'B3', frequencia: 246.94 },
      { nome: '1ª', nota: 'E4', frequencia: 329.63 }
    ]
  },
  {
    id: 'baixo4',
    nome: 'Baixo 4 cordas',
    cordas: [
      { nome: '4ª', nota: 'E1', frequencia: 41.2 },
      { nome: '3ª', nota: 'A1', frequencia: 55.0 },
      { nome: '2ª', nota: 'D2', frequencia: 73.42 },
      { nome: '1ª', nota: 'G2', frequencia: 98.0 }
    ]
  },
  {
    id: 'baixo5',
    nome: 'Baixo 5 cordas',
    cordas: [
      { nome: '5ª', nota: 'B0', frequencia: 30.87 },
      { nome: '4ª', nota: 'E1', frequencia: 41.2 },
      { nome: '3ª', nota: 'A1', frequencia: 55.0 },
      { nome: '2ª', nota: 'D2', frequencia: 73.42 },
      { nome: '1ª', nota: 'G2', frequencia: 98.0 }
    ]
  },
  {
    id: 'cavaquinho',
    nome: 'Cavaquinho',
    cordas: [
      { nome: '4ª', nota: 'D4', frequencia: 293.66 },
      { nome: '3ª', nota: 'G4', frequencia: 392.0 },
      { nome: '2ª', nota: 'B4', frequencia: 493.88 },
      { nome: '1ª', nota: 'D5', frequencia: 587.33 }
    ]
  },
  {
    id: 'ukulele',
    nome: 'Ukulele',
    cordas: [
      { nome: '4ª', nota: 'G4', frequencia: 392.0 },
      { nome: '3ª', nota: 'C4', frequencia: 261.63 },
      { nome: '2ª', nota: 'E4', frequencia: 329.63 },
      { nome: '1ª', nota: 'A4', frequencia: 440.0 }
    ]
  }
];

const NOTAS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const NOTAS_PT: Record<string, string> = {
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

const TOLERANCIA_CENTS = 5; // dentro disso a corda é considerada afinada

/** Nome da nota (ex.: "E2") a partir da frequência. */
function notaDaFrequencia(freq: number, a4: number) {
  const semitons = Math.round(12 * Math.log2(freq / a4));
  const indice = (((semitons + 9) % 12) + 12) % 12;
  const oitava = 4 + Math.floor((semitons + 9) / 12);
  const frequenciaCerta = a4 * Math.pow(2, semitons / 12);
  const cents = Math.round(1200 * Math.log2(freq / frequenciaCerta));
  return { nome: NOTAS[indice], oitava, cents, frequenciaCerta };
}

/** Diferença em cents entre duas frequências. */
function centsEntre(freq: number, alvo: number) {
  return Math.round(1200 * Math.log2(freq / alvo));
}

/**
 * Detecta a frequência fundamental por autocorrelação.
 * Retorna -1 quando o som está fraco demais ou indefinido.
 */
function detectarFrequencia(buffer: Float32Array, sampleRate: number): number {
  const tamanho = buffer.length;

  let rms = 0;
  for (let i = 0; i < tamanho; i++) rms += buffer[i] * buffer[i];
  rms = Math.sqrt(rms / tamanho);
  if (rms < 0.008) return -1; // silêncio / ruído

  // Só procuramos notas entre 28 Hz (Si0 do baixo) e 1200 Hz.
  const lagMin = Math.floor(sampleRate / 1200);
  const lagMax = Math.min(Math.floor(sampleRate / 28), Math.floor(tamanho / 2));

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

  if (melhorValor < 0.5) return -1; // som sem altura definida (ruído, batida)

  // Usa o PRIMEIRO pico que chega perto do máximo, e não o máximo em si:
  // assim o afinador não confunde a nota com a oitava abaixo.
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

export const Afinador: React.FC = () => {
  const [instrumentoId, setInstrumentoId] = useState('violao');
  const [a4, setA4] = useState(440);
  const [ouvindo, setOuvindo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [frequencia, setFrequencia] = useState(0);
  const [cordaFixa, setCordaFixa] = useState<string | null>(null);

  const [cordaTocando, setCordaTocando] = useState<string | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number>(0);
  const ultimasRef = useRef<number[]>([]);

  // Reprodução das cordas (som de referência)
  const somCtxRef = useRef<AudioContext | null>(null);
  const somAtivosRef = useRef<{ oscilador: OscillatorNode; ganho: GainNode }[]>([]);
  const somTimersRef = useRef<number[]>([]);
  const ignorarMicAteRef = useRef(0);

  const instrumento = INSTRUMENTOS.find(i => i.id === instrumentoId) || INSTRUMENTOS[0];

  // Ajusta as frequências das cordas ao diapasão escolhido.
  const cordas = instrumento.cordas.map(c => ({
    ...c,
    frequencia: c.frequencia * (a4 / 440)
  }));

  const parar = () => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    audioCtxRef.current?.close().catch(() => undefined);
    streamRef.current = null;
    audioCtxRef.current = null;
    analyserRef.current = null;
    ultimasRef.current = [];
    setOuvindo(false);
    setFrequencia(0);
  };

  // ==================== SOM DAS CORDAS ====================

  const pararSom = () => {
    somTimersRef.current.forEach(t => clearTimeout(t));
    somTimersRef.current = [];

    const ctx = somCtxRef.current;
    somAtivosRef.current.forEach(({ oscilador, ganho }) => {
      try {
        if (ctx) {
          ganho.gain.cancelScheduledValues(ctx.currentTime);
          ganho.gain.setTargetAtTime(0, ctx.currentTime, 0.02);
        }
        oscilador.stop(ctx ? ctx.currentTime + 0.15 : 0);
      } catch {
        /* já parou */
      }
    });
    somAtivosRef.current = [];
    setCordaTocando(null);
  };

  /**
   * Toca a nota da corda afinada. Somamos alguns harmônicos com decaimento
   * diferente para o som lembrar uma corda tocada, e não um apito de teste.
   */
  const tocarNota = (frequenciaHz: number, duracao = 2.2, atraso = 0) => {
    let ctx = somCtxRef.current;
    if (!ctx || ctx.state === 'closed') {
      ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      somCtxRef.current = ctx;
    }
    if (ctx.state === 'suspended') ctx.resume();

    const inicio = ctx.currentTime + atraso;
    const harmonicos = [
      { multiplo: 1, volume: 0.55, decaimento: 1 },
      { multiplo: 2, volume: 0.22, decaimento: 0.65 },
      { multiplo: 3, volume: 0.11, decaimento: 0.45 },
      { multiplo: 4, volume: 0.06, decaimento: 0.35 }
    ];

    harmonicos.forEach(h => {
      const oscilador = ctx!.createOscillator();
      const ganho = ctx!.createGain();

      oscilador.type = 'sine';
      oscilador.frequency.setValueAtTime(frequenciaHz * h.multiplo, inicio);

      const fim = inicio + duracao * h.decaimento;
      ganho.gain.setValueAtTime(0, inicio);
      ganho.gain.linearRampToValueAtTime(h.volume, inicio + 0.015); // ataque da palhetada
      ganho.gain.exponentialRampToValueAtTime(0.0001, fim);

      oscilador.connect(ganho);
      ganho.connect(ctx!.destination);
      oscilador.start(inicio);
      oscilador.stop(fim + 0.05);

      somAtivosRef.current.push({ oscilador, ganho });
    });

    // Enquanto o alto-falante toca, o microfone ouviria o próprio som.
    ignorarMicAteRef.current = performance.now() + (atraso + duracao) * 1000 + 250;
  };

  const tocarCorda = (corda: Corda) => {
    pararSom();
    setCordaTocando(corda.nota);
    tocarNota(corda.frequencia);
    somTimersRef.current.push(
      window.setTimeout(() => setCordaTocando(null), 2300)
    );
  };

  /** Toca as cordas em sequência, da mais grave para a mais aguda. */
  const tocarTodasAsCordas = () => {
    pararSom();

    const duracao = 1.6;
    const intervalo = 1.4;

    cordas.forEach((corda, i) => {
      tocarNota(corda.frequencia, duracao, i * intervalo);
      somTimersRef.current.push(
        window.setTimeout(() => setCordaTocando(corda.nota), i * intervalo * 1000)
      );
    });

    somTimersRef.current.push(
      window.setTimeout(
        () => setCordaTocando(null),
        ((cordas.length - 1) * intervalo + duracao) * 1000
      )
    );
    setCordaTocando(cordas[0].nota);
  };

  // Trocar de instrumento no meio do som pararia notas de outro instrumento.
  useEffect(() => {
    pararSom();
  }, [instrumentoId]);

  useEffect(() => {
    return () => {
      parar();
      pararSom();
      somCtxRef.current?.close().catch(() => undefined);
    };
  }, []);

  const começar = async () => {
    setErro(null);
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
      analyser.fftSize = 4096;
      fonte.connect(analyser);

      streamRef.current = stream;
      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
      setOuvindo(true);

      const buffer = new Float32Array(analyser.fftSize);
      let ultimaLeitura = 0;

      const medir = (agora: number) => {
        rafRef.current = requestAnimationFrame(medir);

        // ~14 leituras por segundo: preciso o bastante e leve para o aparelho.
        if (agora - ultimaLeitura < 70) return;
        ultimaLeitura = agora;

        // Não medir o som de referência que o próprio sistema está tocando.
        if (performance.now() < ignorarMicAteRef.current) {
          ultimasRef.current = [];
          setFrequencia(0);
          return;
        }

        analyser.getFloatTimeDomainData(buffer);
        const hz = detectarFrequencia(buffer, ctx.sampleRate);

        if (hz < 0) {
          ultimasRef.current = [];
          setFrequencia(0);
          return;
        }

        // Média das últimas leituras para o ponteiro não tremer.
        const ultimas = [...ultimasRef.current, hz].slice(-5);
        ultimasRef.current = ultimas;
        const ordenadas = [...ultimas].sort((a, b) => a - b);
        setFrequencia(ordenadas[Math.floor(ordenadas.length / 2)]);
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

  // ==================== O QUE MOSTRAR ====================

  const info = frequencia > 0 ? notaDaFrequencia(frequencia, a4) : null;

  // Corda mais próxima (ou a que o usuário fixou).
  const cordaAlvo = cordaFixa
    ? cordas.find(c => c.nota === cordaFixa) || null
    : frequencia > 0
      ? cordas.reduce((maisPerto, c) =>
          Math.abs(centsEntre(frequencia, c.frequencia)) <
          Math.abs(centsEntre(frequencia, maisPerto.frequencia))
            ? c
            : maisPerto
        )
      : null;

  const cents =
    frequencia > 0 && cordaAlvo
      ? centsEntre(frequencia, cordaAlvo.frequencia)
      : info?.cents ?? 0;

  const afinado = frequencia > 0 && Math.abs(cents) <= TOLERANCIA_CENTS;
  const centsLimitado = Math.max(-50, Math.min(50, cents));

  const nomeExibido = cordaAlvo
    ? `${NOTAS_PT[cordaAlvo.nota.replace(/\d/g, '')]}${cordaAlvo.nota.replace(/\D/g, '')}`
    : info
      ? `${NOTAS_PT[info.nome]}${info.oitava}`
      : '--';

  const corPrincipal = !frequencia
    ? 'text-gray-300'
    : afinado
      ? 'text-green-500'
      : 'text-amber-500';

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-800">🎸 Afinador</h2>
        <p className="text-gray-500">
          Toque uma corda por vez e ajuste até o ponteiro ficar no centro.
        </p>
      </div>

      {/* Instrumento e diapasão */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-4 grid gap-4 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Instrumento</label>
          <select
            value={instrumentoId}
            onChange={e => {
              setInstrumentoId(e.target.value);
              setCordaFixa(null);
            }}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            {INSTRUMENTOS.map(i => (
              <option key={i.id} value={i.id}>
                {i.nome}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Referência (Lá = {a4} Hz)
          </label>
          <input
            type="range"
            min={432}
            max={446}
            step={1}
            value={a4}
            onChange={e => setA4(Number(e.target.value))}
            className="w-full accent-indigo-600"
          />
          <p className="text-xs text-gray-500">O padrão é 440 Hz. Só mude se souber o motivo.</p>
        </div>
      </div>

      {/* Mostrador */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-4 text-center">
        <div className={`text-6xl md:text-7xl font-bold ${corPrincipal} transition-colors`}>
          {nomeExibido}
        </div>

        <div className="h-6 mt-1 text-sm text-gray-500">
          {frequencia > 0 && (
            <>
              {frequencia.toFixed(1)} Hz
              {cordaAlvo && ` · alvo ${cordaAlvo.frequencia.toFixed(1)} Hz`}
            </>
          )}
          {ouvindo && frequencia === 0 && 'Ouvindo... toque uma corda'}
          {!ouvindo && 'Toque em "Ligar microfone" para começar'}
        </div>

        {/* Régua de cents */}
        <div className="relative h-24 mt-4">
          <div className="absolute inset-x-0 top-10 h-2 bg-gray-100 rounded-full" />
          {/* faixa verde de tolerância */}
          <div
            className="absolute top-10 h-2 bg-green-200 rounded-full"
            style={{ left: '47%', width: '6%' }}
          />
          {/* marca central */}
          <div className="absolute left-1/2 top-4 -ml-px w-0.5 h-14 bg-gray-400" />

          {/* ponteiro */}
          {frequencia > 0 && (
            <div
              className={`absolute top-2 w-1 h-18 rounded-full transition-all duration-100 ${
                afinado ? 'bg-green-500' : 'bg-amber-500'
              }`}
              style={{
                left: `calc(${50 + centsLimitado}% - 2px)`,
                height: '4.5rem'
              }}
            />
          )}

          <div className="absolute inset-x-0 bottom-0 flex justify-between text-xs text-gray-400 px-1">
            <span>♭ -50</span>
            <span>afinado</span>
            <span>+50 ♯</span>
          </div>
        </div>

        {/* Instrução */}
        <div className="mt-2 h-8 flex items-center justify-center">
          {frequencia > 0 &&
            (afinado ? (
              <span className="inline-flex items-center gap-2 text-green-600 font-bold text-lg">
                <Check size={20} /> Afinado!
              </span>
            ) : (
              <span className="text-amber-600 font-semibold">
                {cents < 0
                  ? `Está grave — aperte a corda (${Math.abs(cents)} cents)`
                  : `Está agudo — solte a corda (${cents} cents)`}
              </span>
            ))}
        </div>

        <button
          onClick={ouvindo ? parar : começar}
          className={`mt-2 inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-white transition ${
            ouvindo ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700'
          }`}
        >
          {ouvindo ? <MicOff size={20} /> : <Mic size={20} />}
          {ouvindo ? 'Parar' : 'Ligar microfone'}
        </button>

        {erro && (
          <div className="mt-4 flex items-start gap-2 text-left bg-red-50 border border-red-200 text-red-700 rounded-lg p-3">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <span className="text-sm">{erro}</span>
          </div>
        )}
      </div>

      {/* Cordas */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-800">Cordas do {instrumento.nome}</h3>
          {cordaFixa && (
            <button
              onClick={() => setCordaFixa(null)}
              className="text-sm text-indigo-600 underline"
            >
              Voltar ao automático
            </button>
          )}
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {cordas.map(corda => {
            const ativa = cordaAlvo?.nota === corda.nota;
            const okAgora = ativa && afinado;
            const soando = cordaTocando === corda.nota;

            return (
              <div
                key={corda.nota}
                className={`rounded-lg border-2 text-center transition ${
                  okAgora
                    ? 'border-green-500 bg-green-50'
                    : soando
                      ? 'border-amber-500 bg-amber-50'
                      : ativa
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200'
                }`}
              >
                <button
                  onClick={() => setCordaFixa(cordaFixa === corda.nota ? null : corda.nota)}
                  className="w-full px-3 pt-3 pb-1 hover:bg-black/5 rounded-t-md"
                  title="Travar o afinador nesta corda"
                >
                  <div className="text-lg font-bold text-gray-800">
                    {NOTAS_PT[corda.nota.replace(/\d/g, '')]}
                  </div>
                  <div className="text-xs text-gray-500">
                    {corda.nome} · {corda.nota}
                  </div>
                </button>

                <button
                  onClick={() => tocarCorda(corda)}
                  className="w-full flex items-center justify-center gap-1 py-2 text-xs font-medium text-indigo-700 hover:bg-indigo-100 rounded-b-md border-t border-gray-100"
                  title={`Ouvir ${corda.nota} afinado (${corda.frequencia.toFixed(1)} Hz)`}
                >
                  <Volume2 size={14} className={soando ? 'animate-pulse' : ''} />
                  {soando ? 'Tocando' : 'Ouvir'}
                </button>
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-2 mt-3">
          <button
            onClick={tocarTodasAsCordas}
            disabled={cordaTocando !== null}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            <Volume2 size={16} /> Ouvir todas as cordas
          </button>
          {cordaTocando && (
            <button
              onClick={pararSom}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-300"
            >
              <VolumeX size={16} /> Parar som
            </button>
          )}
        </div>

        <p className="text-xs text-gray-500 mt-3">
          Toque em <strong>Ouvir</strong> para escutar a corda afinada e comparar de ouvido.
          Clicando no nome da nota, o afinador trava naquela corda — útil quando ela está muito
          desafinada.
          {ouvindo && ' Enquanto o som toca, o microfone é ignorado para não se confundir.'}
        </p>
      </div>

      <div className="mt-4 bg-indigo-50 rounded-lg p-4 text-sm text-gray-700">
        <strong>Dicas para afinar melhor:</strong>
        <ul className="list-disc list-inside mt-1 space-y-1">
          <li>Fique num lugar silencioso e perto do microfone.</li>
          <li>Toque a corda solta, com força média, e deixe soar.</li>
          <li>Sempre chegue na nota apertando a corda (subindo), assim ela segura melhor.</li>
          <li>Depois de afinar todas, repita a volta — uma corda desafina a outra.</li>
        </ul>
      </div>
    </div>
  );
};
