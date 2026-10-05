import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Guitar,
  Search,
  Loader2,
  Plus,
  Trash2,
  Eye,
  X,
  ArrowUp,
  ArrowDown,
  Play,
  Pause,
  Type,
  ExternalLink,
  Music,
  Minus,
  SlidersHorizontal,
  WifiOff,
  Sparkles,
  CheckCircle2,
  RotateCcw,
  Lightbulb,
  ListMusic,
} from 'lucide-react';
import {
  Cifra,
  CifraEncontrada,
  ResultadoCifra,
  TONS,
  lerCifras,
  lerCifrasLocais,
  salvarCifra,
  removerCifra,
  mudarTom,
  buscarCifras,
  abrirCifra,
  cifraParaTocar,
  normalizarTom,
  tomAtual,
  tomDaCifra,
  tomVizinho,
  acordesUsados,
  ehLinhaDeAcordes,
} from '../services/cifras';

/** Card branco padrão da tela. */
const Painel: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => (
  <div className={`bg-white rounded-2xl border border-gray-100 shadow-lg ${className}`}>
    {children}
  </div>
);

/** Título de seção: ícone colorido + nome + explicação curta. */
const TituloSecao: React.FC<{
  icone: React.ReactNode;
  cor: string;
  titulo: string;
  ajuda?: string;
}> = ({ icone, cor, titulo, ajuda }) => (
  <div className="flex items-center gap-2.5 mb-4">
    <span className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${cor}`}>
      {icone}
    </span>
    <div className="min-w-0">
      <h3 className="text-sm font-bold text-gray-900 leading-tight">{titulo}</h3>
      {ajuda && <p className="text-xs text-gray-500 leading-tight">{ajuda}</p>}
    </div>
  </div>
);

/** Etiqueta de informação destacada (artista, tom original, afinação...). */
const Etiqueta: React.FC<{ rotulo: string; valor: string; cor: string }> = ({
  rotulo,
  valor,
  cor,
}) => (
  <span
    className={`inline-flex items-baseline gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${cor}`}
  >
    <span className="opacity-70 font-medium">{rotulo}</span>
    <span className="capitalize">{valor}</span>
  </span>
);

/**
 * A cifra desenhada como no Cifra Club: acordes destacados na linha de cima,
 * letra embaixo, em fonte de largura fixa para o acorde cair na sílaba certa.
 *
 * Os marcadores de trecho ([Intro], [Refrão]) ganham cor própria, porque na
 * hora de tocar o olho procura por eles para se achar na música.
 */
const CifraEscrita: React.FC<{ texto: string; tamanho: number }> = ({ texto, tamanho }) => (
  <pre
    className="font-mono whitespace-pre overflow-x-auto leading-relaxed text-gray-800"
    style={{ fontSize: `${tamanho}px` }}
  >
    {texto.split('\n').map((linha, i) => {
      const soMarcador = /^\s*\[[^\]]*\]\s*$/.test(linha);

      if (soMarcador) {
        return (
          <div key={i} className="font-bold text-purple-700 mt-2">
            {linha}
          </div>
        );
      }

      return (
        <div key={i}>
          {ehLinhaDeAcordes(linha) ? (
            <span className="font-bold text-indigo-600">{linha || ' '}</span>
          ) : (
            linha || ' '
          )}
        </div>
      );
    })}
  </pre>
);

/** Escolha do tom, com os doze tons e o aviso de qual é o original. */
const EscolherTom: React.FC<{
  valor: string;
  original: string;
  onEscolher: (tom: string) => void;
}> = ({ valor, original, onEscolher }) => (
  <div className="grid grid-cols-6 gap-1.5">
    {TONS.map(tom => {
      const escolhido = normalizarTom(valor) === tom;
      const ehOriginal = normalizarTom(original) === tom;

      return (
        <button
          key={tom}
          onClick={() => onEscolher(tom)}
          title={ehOriginal ? 'Tom original da cifra' : `Tocar em ${tom}`}
          className={`relative py-2 rounded-xl text-sm font-bold tabular-nums transition border ${
            escolhido
              ? 'bg-indigo-600 border-indigo-600 text-white shadow-md scale-105'
              : ehOriginal
              ? 'bg-emerald-100 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
              : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          {tom}
          {ehOriginal && !escolhido && (
            <span className="absolute top-0.5 right-1 text-[9px] font-bold text-emerald-600">
              •
            </span>
          )}
        </button>
      );
    })}
  </div>
);

/**
 * Tela cheia para tocar: cifra grande, troca de tom na hora e rolagem
 * automática, para não precisar soltar o instrumento no meio da música.
 *
 * É aqui - e só aqui - que o tom se escolhe. Na lista de fora o tom aparece
 * apenas como informação, porque mexer nele sem ver a letra não ajuda em nada.
 */
const ModalTocar: React.FC<{ cifra: Cifra; onFechar: () => void; onTom: (tom: string) => void }> = ({
  cifra,
  onFechar,
  onTom,
}) => {
  const [tamanho, setTamanho] = useState(13);
  const [rolando, setRolando] = useState(false);
  const [velocidade, setVelocidade] = useState(1);
  const [painelTom, setPainelTom] = useState(false);
  const area = useRef<HTMLDivElement>(null);

  const tom = tomAtual(cifra);
  const original = normalizarTom(cifra.tomOriginal);
  const transposta = !!original && !!tom && original !== tom;

  const texto = cifraParaTocar(cifra);
  const acordes = useMemo(() => acordesUsados(texto), [texto]);

  // Rolagem automática: um passo curto a cada tique, para subir macio.
  useEffect(() => {
    if (!rolando) return;

    const timer = window.setInterval(() => {
      const caixa = area.current;
      if (!caixa) return;

      caixa.scrollTop += velocidade;

      // Chegou no fim: para sozinha.
      if (caixa.scrollTop + caixa.clientHeight >= caixa.scrollHeight - 2) {
        setRolando(false);
      }
    }, 50);

    return () => window.clearInterval(timer);
  }, [rolando, velocidade]);

  // Fecha no Esc: o aparelho costuma estar no suporte, longe da mão.
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onFechar();
    };

    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [onFechar]);

  /**
   * Mantém a tela acesa enquanto a cifra está aberta - no meio da música o
   * aparelho apagava sozinho e era preciso soltar o instrumento para acordá-lo.
   */
  useEffect(() => {
    let trava: { release: () => Promise<void> } | null = null;
    const navegador = navigator as Navigator & {
      wakeLock?: { request: (tipo: string) => Promise<{ release: () => Promise<void> }> };
    };

    navegador.wakeLock
      ?.request('screen')
      .then(obtida => {
        trava = obtida;
      })
      .catch(() => {
        // Aparelho sem suporte ou permissão: segue sem a trava.
      });

    return () => {
      trava?.release().catch(() => {});
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-3xl h-full sm:h-[92vh] sm:rounded-2xl flex flex-col overflow-hidden">
        {/* Cabeçalho colorido: nome, artista e o tom em evidência */}
        <div className="shrink-0 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <h3 className="font-bold truncate leading-tight">{cifra.nome}</h3>
              <p className="text-xs text-white/70 truncate capitalize">
                {cifra.artista || 'Sem artista'}
                {cifra.afinacao ? ` · afinação ${cifra.afinacao}` : ''}
              </p>
            </div>

            <button
              onClick={onFechar}
              title="Fechar (Esc)"
              className="shrink-0 p-2 rounded-lg hover:bg-white/15 transition"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Barra do tom: desce e sobe num toque, ou abre os doze tons */}
        <div className="shrink-0 px-4 py-3 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onTom(tomVizinho(tom, -1))}
              disabled={!tom}
              title="Meio tom abaixo"
              className="shrink-0 w-10 h-10 rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-gray-100 transition flex items-center justify-center disabled:opacity-40"
            >
              <Minus size={16} />
            </button>

            <button
              onClick={() => setPainelTom(p => !p)}
              className="flex-1 h-10 rounded-xl bg-indigo-600 text-white font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition shadow-md"
            >
              <span className="text-[11px] font-semibold uppercase tracking-wide opacity-75">
                Tom
              </span>
              <span className="text-lg leading-none tabular-nums">{tom || '?'}</span>
              <SlidersHorizontal size={14} className="opacity-75" />
            </button>

            <button
              onClick={() => onTom(tomVizinho(tom, 1))}
              disabled={!tom}
              title="Meio tom acima"
              className="shrink-0 w-10 h-10 rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-gray-100 transition flex items-center justify-center disabled:opacity-40"
            >
              <Plus size={16} />
            </button>
          </div>

          {transposta && (
            <button
              onClick={() => onTom(original)}
              className="mt-2 w-full text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 flex items-center justify-center gap-1.5 hover:bg-amber-50 transition"
            >
              <RotateCcw size={12} />
              Transposta de {original} para {tom} — voltar ao original
            </button>
          )}

          {painelTom && (
            <div className="mt-3">
              <EscolherTom valor={tom} original={cifra.tomOriginal} onEscolher={onTom} />
              <p className="text-[11px] text-gray-500 mt-2 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-emerald-100 border border-emerald-200 inline-block" />
                tom original da cifra
              </p>
            </div>
          )}
        </div>

        {/* Acordes que a música usa no tom escolhido */}
        {acordes.length > 0 && (
          <div className="shrink-0 px-4 py-2.5 border-b border-gray-200 bg-white">
            <div className="flex items-center gap-2">
              <span className="shrink-0 text-[11px] font-bold uppercase tracking-wide text-gray-400">
                Acordes
              </span>
              <div className="flex gap-1.5 overflow-x-auto pb-0.5">
                {acordes.slice(0, 14).map(acorde => (
                  <span
                    key={acorde}
                    className="shrink-0 px-2 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-bold font-mono"
                  >
                    {acorde}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Rolagem automática e tamanho da letra */}
        <div className="shrink-0 px-4 py-2.5 border-b border-gray-200 bg-gray-50 flex flex-wrap items-center gap-2">
          <button
            onClick={() => setRolando(!rolando)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
              rolando
                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md'
            }`}
          >
            {rolando ? <Pause size={14} /> : <Play size={14} />}
            {rolando ? 'Parar rolagem' : 'Rolar sozinho'}
          </button>

          {rolando && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setVelocidade(v => Math.max(1, v - 1))}
                className="p-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 transition"
                title="Mais devagar"
              >
                <ArrowDown size={14} />
              </button>
              <span className="text-xs font-bold text-gray-600 w-6 text-center tabular-nums">
                {velocidade}
              </span>
              <button
                onClick={() => setVelocidade(v => Math.min(6, v + 1))}
                className="p-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 transition"
                title="Mais rápido"
              >
                <ArrowUp size={14} />
              </button>
            </div>
          )}

          <div className="flex items-center gap-1 ml-auto">
            <Type size={14} className="text-gray-400" />
            <button
              onClick={() => setTamanho(t => Math.max(10, t - 1))}
              className="px-2.5 py-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 transition text-xs font-bold"
            >
              A-
            </button>
            <span className="text-xs font-bold text-gray-500 w-6 text-center tabular-nums">
              {tamanho}
            </span>
            <button
              onClick={() => setTamanho(t => Math.min(28, t + 1))}
              className="px-2.5 py-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 transition text-xs font-bold"
            >
              A+
            </button>
          </div>
        </div>

        {/* Cifra */}
        <div ref={area} className="flex-1 overflow-auto px-4 py-4">
          <CifraEscrita texto={texto} tamanho={tamanho} />

          {cifra.fonte && (
            <a
              href={cifra.fonte}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 mt-6 text-xs text-gray-400 hover:text-indigo-600 transition"
            >
              <ExternalLink size={12} />
              Ver no Cifra Club
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * TOCAR POR CIFRA
 *
 * Busca a música no Cifra Club pelo nome ou por um trecho da letra e guarda
 * aqui para tocar no culto - inclusive sem internet, porque a cifra fica no
 * aparelho depois de salva. O tom se escolhe na tela de tocar, com a letra
 * à vista.
 */
export const TocarPorCifra: React.FC = () => {
  // Começa com a cópia do aparelho (abre na hora) e troca pela lista do
  // Supabase quando ela chegar.
  const [cifras, setCifras] = useState<Cifra[]>(() => lerCifrasLocais());

  useEffect(() => {
    lerCifras().then(setCifras);
  }, []);

  const [termo, setTermo] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [resultados, setResultados] = useState<ResultadoCifra[]>([]);
  const [aviso, setAviso] = useState('');

  /** Filtro da lista guardada - com muitas cifras, rolar a tela não dava conta. */
  const [filtro, setFiltro] = useState('');

  /** Música achada, ainda não salva: dá para conferir antes de guardar. */
  const [previa, setPrevia] = useState<CifraEncontrada | null>(null);
  /** Tom em que a cifra achada esta escrita. Vem deduzido e da para corrigir. */
  const [tomOriginal, setTomOriginal] = useState('');
  const [abrindo, setAbrindo] = useState('');

  const [tocando, setTocando] = useState<Cifra | null>(null);

  // Mantém a música aberta em dia quando o tom muda na tela cheia.
  useEffect(() => {
    if (!tocando) return;
    const atual = cifras.find(c => c.id === tocando.id);
    if (atual && atual !== tocando) setTocando(atual);
  }, [cifras, tocando]);

  const visiveis = useMemo(() => {
    const busca = filtro.trim().toLowerCase();
    if (!busca) return cifras;

    return cifras.filter(c =>
      `${c.nome} ${c.artista}`.toLowerCase().includes(busca)
    );
  }, [cifras, filtro]);

  const buscar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!termo.trim()) return;

    setBuscando(true);
    setAviso('');
    setResultados([]);
    setPrevia(null);

    const achado = await buscarCifras(termo.trim());

    if (achado.direta) {
      setPrevia(achado.direta);
      setTomOriginal(normalizarTom(achado.direta.tom) || tomDaCifra(achado.direta.cifra));
    }

    setResultados(achado.resultados);
    if (achado.erro) setAviso(achado.erro);
    setBuscando(false);
  };

  const escolherResultado = async (resultado: ResultadoCifra) => {
    setAbrindo(`${resultado.dns}/${resultado.url}`);
    setAviso('');

    const achado = await abrirCifra(resultado.dns, resultado.url);
    setAbrindo('');

    if (!achado) {
      setAviso('Não deu para abrir essa cifra. Tente outra da lista.');
      return;
    }

    setPrevia({ ...achado, nome: achado.nome || resultado.nome });
    setTomOriginal(normalizarTom(achado.tom) || tomDaCifra(achado.cifra));
  };

  /**
   * Guarda já no tom original: a escolha do tom para tocar acontece depois,
   * na tela de tocar, onde a letra está à vista.
   */
  const guardar = async () => {
    if (!previa) return;

    const nova: Cifra = {
      id: Date.now().toString(),
      nome: previa.nome,
      artista: previa.artista,
      tomOriginal: tomOriginal,
      tomEscolhido: tomOriginal,
      cifra: previa.cifra,
      afinacao: previa.afinacao,
      fonte: previa.fonte,
      criadoEm: new Date().toISOString(),
    };

    const lista = await salvarCifra(nova);
    setCifras(lista);
    setPrevia(null);
    setResultados([]);
    setTermo('');

    // Abre na hora para escolher o tom e já conferir a letra.
    setTocando(lista.find(c => c.id === nova.id) || nova);
  };

  const apagar = async (cifra: Cifra) => {
    if (!window.confirm(`Tirar "${cifra.nome}" das suas cifras?`)) return;
    setCifras(await removerCifra(cifra.id));
  };

  const trocarTom = async (id: string, tom: string) => {
    setCifras(await mudarTom(id, tom));
  };

  return (
    <div className="max-w-4xl mx-auto pb-20">
      {/* Cabeçalho em faixa colorida, com o que importa em números */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-2xl shadow-lg p-4 sm:p-5 mb-5 text-white">
        <div className="flex items-center gap-3">
          <div className="bg-white/15 p-2.5 rounded-xl shrink-0">
            <Guitar size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl sm:text-2xl font-bold leading-tight">Tocar por Cifra</h2>
            <p className="text-sm text-white/75">Letra e acordes para tocar no culto</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          <span className="inline-flex items-center gap-1.5 bg-white/15 rounded-xl px-3 py-1.5 text-xs font-semibold">
            <ListMusic size={13} />
            {cifras.length} {cifras.length === 1 ? 'cifra guardada' : 'cifras guardadas'}
          </span>
          <span className="inline-flex items-center gap-1.5 bg-white/15 rounded-xl px-3 py-1.5 text-xs font-semibold">
            <WifiOff size={13} />
            Funcionam sem internet
          </span>
        </div>
      </div>

      {/* Busca */}
      <Painel className="p-4 sm:p-5 mb-5">
        <TituloSecao
          icone={<Search size={17} />}
          cor="bg-indigo-50 text-indigo-600"
          titulo="Procurar uma música"
          ajuda="Pelo nome ou por um trecho da letra"
        />

        <form onSubmit={buscar}>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
              <input
                type="text"
                value={termo}
                onChange={e => setTermo(e.target.value)}
                placeholder="Ex.: Deus do impossível, ou: eu sei que ele vem"
                className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={buscando || !termo.trim()}
              className="shrink-0 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-semibold text-sm flex items-center gap-2 disabled:opacity-50 shadow-md"
            >
              {buscando ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              Buscar
            </button>
          </div>
        </form>

        <p className="text-xs text-gray-500 mt-2.5 flex items-start gap-1.5">
          <Lightbulb size={13} className="shrink-0 mt-0.5 text-amber-500" />
          A letra e a cifra vêm do Cifra Club. O tom você escolhe depois, já com a letra na tela.
        </p>

        {aviso && (
          <p className="mt-3 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-2.5">
            {aviso}
          </p>
        )}

        {/* Resultados da busca */}
        {resultados.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">
              Qual é a música?
            </p>

            <div className="space-y-2">
              {resultados.map((resultado, i) => {
                const chave = `${resultado.dns}/${resultado.url}`;

                return (
                  <button
                    key={chave}
                    onClick={() => escolherResultado(resultado)}
                    disabled={abrindo === chave}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-gray-200 hover:border-indigo-200 hover:bg-indigo-50 transition text-left disabled:opacity-60"
                  >
                    <span className="shrink-0 w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
                      {abrindo === chave ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        i + 1
                      )}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-gray-800 truncate">
                        {resultado.nome}
                      </span>
                      <span className="block text-xs text-gray-500 truncate capitalize">
                        {resultado.artista}
                      </span>
                    </span>

                    <Music size={15} className="shrink-0 text-gray-300" />
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </Painel>

      {/* Prévia do que foi achado, antes de guardar */}
      {previa && (
        <Painel className="p-4 sm:p-5 mb-5 border-l-4 border-l-emerald-500">
          <div className="flex items-start gap-3 mb-3">
            <span className="shrink-0 w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 size={17} />
            </span>

            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-700">
                Cifra encontrada
              </p>
              <h3 className="font-bold text-gray-900 break-words leading-tight">{previa.nome}</h3>
            </div>

            <button
              onClick={() => setPrevia(null)}
              title="Descartar"
              className="shrink-0 p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition"
            >
              <X size={16} />
            </button>
          </div>

          {/* Informações em destaque */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {previa.artista && (
              <Etiqueta rotulo="Artista" valor={previa.artista} cor="bg-blue-50 text-blue-800" />
            )}
            <Etiqueta rotulo="Tom" valor={tomOriginal || '?'} cor="bg-emerald-100 text-emerald-700" />
            {previa.afinacao && (
              <Etiqueta
                rotulo="Afinação"
                valor={previa.afinacao}
                cor="bg-purple-50 text-purple-700"
              />
            )}
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 max-h-56 overflow-auto mb-3">
            <CifraEscrita texto={previa.cifra} tamanho={12} />
          </div>

          {/*
            O tom de origem é deduzido do primeiro acorde, porque a página do
            Cifra Club não informa mais. Errando ali, a transposição toda sai
            errada - então fica à mão para corrigir.
          */}
          <div className="mb-3 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2.5 flex items-center gap-2 flex-wrap">
            <span className="text-xs text-amber-800 font-medium">
              Acordes saindo errados? A cifra original está em
            </span>
            <select
              value={tomOriginal}
              onChange={e => setTomOriginal(e.target.value)}
              className="px-2.5 py-1 border border-amber-200 rounded-lg bg-white text-xs font-bold focus:outline-none focus:border-indigo-500"
            >
              {TONS.map(tom => (
                <option key={tom} value={tom}>
                  {tom}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={guardar}
            className="w-full px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-semibold text-sm flex items-center justify-center gap-2 shadow-md"
          >
            <Plus size={16} />
            Guardar e escolher o tom
          </button>
        </Painel>
      )}

      {/* Cifras guardadas */}
      <Painel className="p-4 sm:p-5">
        <TituloSecao
          icone={<Sparkles size={17} />}
          cor="bg-purple-50 text-purple-700"
          titulo="Minhas cifras"
          ajuda="Abra para ver a letra e escolher o tom"
        />

        {cifras.length > 3 && (
          <div className="relative mb-3">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
            <input
              type="text"
              value={filtro}
              onChange={e => setFiltro(e.target.value)}
              placeholder="Filtrar pelo nome ou artista"
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:border-indigo-500 transition text-sm"
            />
          </div>
        )}

        {cifras.length === 0 ? (
          <div className="text-center py-10">
            <Guitar className="mx-auto text-gray-300 mb-3" size={40} />
            <p className="text-gray-500 font-medium">Nenhuma cifra guardada ainda</p>
            <p className="text-sm text-gray-400 mt-1">
              Busque a música acima para começar
            </p>
          </div>
        ) : visiveis.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-8">
            Nenhuma cifra com "{filtro}"
          </p>
        ) : (
          <div className="space-y-2.5">
            {visiveis.map(cifra => {
              const tom = tomAtual(cifra);
              const original = normalizarTom(cifra.tomOriginal);
              const transposta = !!original && !!tom && original !== tom;

              return (
                <div
                  key={cifra.id}
                  className="rounded-2xl border border-gray-200 bg-gray-50 p-3 flex items-center gap-3"
                >
                  {/* O tom em evidência: é a primeira coisa que se procura */}
                  <div className="shrink-0 w-14 h-14 rounded-2xl bg-indigo-600 text-white flex flex-col items-center justify-center leading-none shadow-md">
                    <span className="text-[9px] font-bold uppercase tracking-wide opacity-75">
                      Tom
                    </span>
                    <span className="text-xl font-extrabold tabular-nums">{tom || '?'}</span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-gray-900 break-words leading-tight">
                      {cifra.nome}
                    </h4>
                    <p className="text-xs text-gray-500 capitalize truncate">
                      {cifra.artista || 'Sem artista'}
                    </p>

                    {transposta && (
                      <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-lg bg-amber-50 text-amber-800 text-[11px] font-semibold">
                        original {original}
                      </span>
                    )}
                  </div>

                  <div className="shrink-0 flex items-center gap-1.5">
                    <button
                      onClick={() => setTocando(cifra)}
                      className="px-3 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-semibold text-xs flex items-center gap-1.5 shadow-md"
                    >
                      <Eye size={14} />
                      <span className="hidden sm:inline">Ver letra</span>
                    </button>

                    <button
                      onClick={() => apagar(cifra)}
                      title="Excluir"
                      className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Painel>

      {tocando && (
        <ModalTocar
          cifra={tocando}
          onFechar={() => setTocando(null)}
          onTom={tom => trocarTom(tocando.id, tom)}
        />
      )}
    </div>
  );
};
