import React, { useState, useEffect, useRef } from 'react';
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
  transporCifra,
  normalizarTom,
  tomAtual,
  tomDaCifra,
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

/**
 * A cifra desenhada como no Cifra Club: acordes destacados na linha de cima,
 * letra embaixo, em fonte de largura fixa para o acorde cair na sílaba certa.
 */
const CifraEscrita: React.FC<{ texto: string; tamanho: number }> = ({ texto, tamanho }) => (
  <pre
    className="font-mono whitespace-pre overflow-x-auto leading-relaxed text-gray-800"
    style={{ fontSize: `${tamanho}px` }}
  >
    {texto.split('\n').map((linha, i) => (
      <div key={i}>
        {ehLinhaDeAcordes(linha) ? (
          <span className="font-bold text-indigo-600">{linha || ' '}</span>
        ) : (
          linha || ' '
        )}
      </div>
    ))}
  </pre>
);

/** Escolha do tom, com os doze tons e o aviso de qual é o original. */
const EscolherTom: React.FC<{
  valor: string;
  original: string;
  onEscolher: (tom: string) => void;
}> = ({ valor, original, onEscolher }) => (
  <div className="flex flex-wrap gap-1.5">
    {TONS.map(tom => {
      const escolhido = normalizarTom(valor) === tom;
      const ehOriginal = normalizarTom(original) === tom;

      return (
        <button
          key={tom}
          onClick={() => onEscolher(tom)}
          title={ehOriginal ? 'Tom original da cifra' : `Tocar em ${tom}`}
          className={`px-2.5 py-1.5 rounded-lg text-xs font-bold tabular-nums transition border ${
            escolhido
              ? 'bg-indigo-600 border-indigo-600 text-white'
              : ehOriginal
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
              : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          {tom}
        </button>
      );
    })}
  </div>
);

/**
 * Tela cheia para tocar: cifra grande, troca de tom na hora e rolagem
 * automática, para não precisar soltar o instrumento no meio da música.
 */
const ModalTocar: React.FC<{ cifra: Cifra; onFechar: () => void; onTom: (tom: string) => void }> = ({
  cifra,
  onFechar,
  onTom,
}) => {
  const [tamanho, setTamanho] = useState(13);
  const [rolando, setRolando] = useState(false);
  const [velocidade, setVelocidade] = useState(1);
  const area = useRef<HTMLDivElement>(null);

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

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-3xl h-full sm:h-[90vh] sm:rounded-2xl flex flex-col overflow-hidden">
        {/* Cabeçalho */}
        <div className="shrink-0 px-4 py-3 border-b border-gray-100 flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-gray-900 truncate">{cifra.nome}</h3>
            <p className="text-xs text-gray-500 truncate">
              {cifra.artista || 'Sem artista'}
              {cifra.afinacao ? ` · afinação ${cifra.afinacao}` : ''}
            </p>
          </div>

          <button
            onClick={onFechar}
            title="Fechar"
            className="shrink-0 p-2 rounded-lg hover:bg-gray-100 transition text-gray-500"
          >
            <X size={18} />
          </button>
        </div>

        {/* Controles */}
        <div className="shrink-0 px-4 py-3 border-b border-gray-100 space-y-3 bg-gray-50">
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-1.5">
              Tom: <span className="text-indigo-600">{tomAtual(cifra)}</span>
              {normalizarTom(cifra.tomOriginal) &&
                normalizarTom(cifra.tomOriginal) !== tomAtual(cifra) && (
                  <span className="text-gray-400 font-normal">
                    {' '}
                    (original {normalizarTom(cifra.tomOriginal)})
                  </span>
                )}
            </p>
            <EscolherTom valor={tomAtual(cifra)} original={cifra.tomOriginal} onEscolher={onTom} />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setRolando(!rolando)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                rolando
                  ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
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
              <button
                onClick={() => setTamanho(t => Math.min(24, t + 1))}
                className="px-2.5 py-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 transition text-xs font-bold"
              >
                A+
              </button>
            </div>
          </div>
        </div>

        {/* Cifra */}
        <div ref={area} className="flex-1 overflow-auto px-4 py-4">
          <CifraEscrita texto={cifraParaTocar(cifra)} tamanho={tamanho} />

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
 * Busca a música no Cifra Club pelo nome ou por um trecho da letra, deixa
 * escolher o tom e guarda aqui para tocar no culto - inclusive sem internet,
 * porque a cifra fica no aparelho depois de salva.
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

  /** Música achada, ainda não salva: dá para ver e escolher o tom antes. */
  const [previa, setPrevia] = useState<CifraEncontrada | null>(null);
  const [tomPrevia, setTomPrevia] = useState('');
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

  const buscar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!termo.trim()) return;

    setBuscando(true);
    setAviso('');
    setResultados([]);
    setPrevia(null);

    const achado = await buscarCifras(termo.trim());

    if (achado.direta) {
      const original = normalizarTom(achado.direta.tom) || tomDaCifra(achado.direta.cifra);
      setPrevia(achado.direta);
      setTomOriginal(original);
      setTomPrevia(original);
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

    const original = normalizarTom(achado.tom) || tomDaCifra(achado.cifra);
    setPrevia({ ...achado, nome: achado.nome || resultado.nome });
    setTomOriginal(original);
    setTomPrevia(original);
  };

  const guardar = async () => {
    if (!previa) return;

    const nova: Cifra = {
      id: Date.now().toString(),
      nome: previa.nome,
      artista: previa.artista,
      tomOriginal: tomOriginal,
      tomEscolhido: tomPrevia,
      cifra: previa.cifra,
      afinacao: previa.afinacao,
      fonte: previa.fonte,
      criadoEm: new Date().toISOString(),
    };

    setCifras(await salvarCifra(nova));
    setPrevia(null);
    setResultados([]);
    setTermo('');
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
      {/* Cabeçalho */}
      <div className="flex items-center gap-3 mb-5">
        <div className="bg-indigo-50 text-indigo-600 p-2.5 rounded-xl shrink-0">
          <Guitar size={22} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Tocar por Cifra</h2>
          <p className="text-sm text-gray-500">
            {cifras.length} cifra(s) guardada(s) neste aparelho
          </p>
        </div>
      </div>

      {/* Busca */}
      <Painel className="p-4 sm:p-6 mb-5">
        <form onSubmit={buscar} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Nome da música ou um trecho da letra
            </label>
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
                className="shrink-0 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-semibold text-sm flex items-center gap-2 disabled:opacity-50"
              >
                {buscando ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                Buscar
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1.5">
              A letra e a cifra vêm do Cifra Club. Depois de salvar, funcionam sem internet.
            </p>
          </div>
        </form>

        {aviso && (
          <p className="mt-3 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-2.5">
            {aviso}
          </p>
        )}

        {/* Resultados da busca */}
        {resultados.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-sm font-medium text-gray-700">Qual é a música?</p>

            {resultados.map(resultado => {
              const chave = `${resultado.dns}/${resultado.url}`;

              return (
                <button
                  key={chave}
                  onClick={() => escolherResultado(resultado)}
                  disabled={abrindo === chave}
                  className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl border border-gray-200 hover:bg-gray-50 transition text-left disabled:opacity-60"
                >
                  <span className="shrink-0 w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    {abrindo === chave ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Music size={16} />
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
                </button>
              );
            })}
          </div>
        )}
      </Painel>

      {/* Prévia do que foi achado, antes de guardar */}
      {previa && (
        <Painel className="p-4 sm:p-6 mb-5 border-l-4 border-l-emerald-500">
          <div className="flex items-start gap-3 mb-4">
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-gray-900">{previa.nome}</h3>
              <p className="text-sm text-gray-500 capitalize">{previa.artista}</p>
            </div>

            <button
              onClick={() => setPrevia(null)}
              title="Descartar"
              className="shrink-0 p-2 rounded-lg hover:bg-gray-100 transition text-gray-400"
            >
              <X size={16} />
            </button>
          </div>

          <div className="mb-4">
            <p className="text-sm font-medium text-gray-700 mb-2">
              Em que tom você vai tocar?
              <span className="text-xs font-normal text-emerald-700">
                {' '}
                (a cifra está em {tomOriginal || '?'})
              </span>
            </p>
            <EscolherTom valor={tomPrevia} original={tomOriginal} onEscolher={setTomPrevia} />
          </div>

          {/*
            O tom de origem é deduzido do primeiro acorde, porque a página do
            Cifra Club não informa mais. Errando ali, a transposição toda sai
            errada - então fica à mão para corrigir.
          */}
          <div className="mb-4 flex items-center gap-2 flex-wrap">
            <label className="text-xs text-gray-500">A cifra original está em</label>
            <select
              value={tomOriginal}
              onChange={e => setTomOriginal(e.target.value)}
              className="px-2.5 py-1.5 border border-gray-200 rounded-lg bg-white text-xs font-bold focus:outline-none focus:border-indigo-500"
            >
              {TONS.map(tom => (
                <option key={tom} value={tom}>
                  {tom}
                </option>
              ))}
            </select>
            <span className="text-xs text-gray-400">
              — só mexa aqui se os acordes saírem errados
            </span>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 max-h-64 overflow-auto mb-4">
            <CifraEscrita
              texto={transporCifra(previa.cifra, tomOriginal, tomPrevia)}
              tamanho={12}
            />
          </div>

          <button
            onClick={guardar}
            className="w-full px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-semibold text-sm flex items-center justify-center gap-2 shadow-md"
          >
            <Plus size={16} />
            Guardar nas minhas cifras
          </button>
        </Painel>
      )}

      {/* Cifras guardadas */}
      <div className="space-y-3">
        {cifras.length === 0 ? (
          <Painel className="text-center py-12">
            <Guitar className="mx-auto text-gray-300 mb-3" size={40} />
            <p className="text-gray-500">Nenhuma cifra guardada ainda</p>
            <p className="text-sm text-gray-400 mt-1">
              Busque a música acima e escolha o tom para começar
            </p>
          </Painel>
        ) : (
          cifras.map(cifra => (
            <Painel key={cifra.id} className="p-3 sm:p-4 border-l-4 border-l-indigo-500">
              <div className="flex items-start gap-3">
                <div className="shrink-0 w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex flex-col items-center justify-center leading-none">
                  <span className="text-[10px] font-semibold opacity-70">Tom</span>
                  <span className="text-lg font-extrabold">{tomAtual(cifra)}</span>
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-gray-900 break-words leading-tight">
                    {cifra.nome}
                  </h3>
                  <p className="text-xs text-gray-500 capitalize truncate">
                    {cifra.artista}
                    {normalizarTom(cifra.tomOriginal) &&
                      normalizarTom(cifra.tomOriginal) !== tomAtual(cifra) &&
                      ` · original ${normalizarTom(cifra.tomOriginal)}`}
                  </p>
                </div>

                <button
                  onClick={() => apagar(cifra)}
                  title="Excluir"
                  className="shrink-0 p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition"
                >
                  <Trash2 size={15} />
                </button>
              </div>

              <div className="mt-3">
                <p className="text-xs font-medium text-gray-600 mb-1.5">Tom para tocar</p>
                <EscolherTom
                  valor={tomAtual(cifra)}
                  original={cifra.tomOriginal}
                  onEscolher={tom => trocarTom(cifra.id, tom)}
                />
              </div>

              <button
                onClick={() => setTocando(cifra)}
                className="mt-3 w-full px-4 py-2.5 bg-indigo-50 text-indigo-700 rounded-xl hover:bg-indigo-100 transition font-semibold text-sm flex items-center justify-center gap-2"
              >
                <Eye size={15} />
                Ver letra com cifra
              </button>
            </Painel>
          ))
        )}
      </div>

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
