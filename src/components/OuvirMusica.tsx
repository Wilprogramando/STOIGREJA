import React, { useEffect, useRef, useState } from 'react';
import { Search, Loader2, Play, Pause, Youtube, Music, Volume2 } from 'lucide-react';
import { procurarParaOuvir, MusicaParaOuvir } from '../services/audio';

/**
 * OUVIR MÚSICA
 *
 * A pessoa digita o nome da música ou um pedaço da letra e escuta ali mesmo
 * a prévia de 30 segundos. Para a música completa, o botão abre o YouTube.
 */
export const OuvirMusica: React.FC = () => {
  const [texto, setTexto] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [resultados, setResultados] = useState<MusicaParaOuvir[]>([]);
  const [aviso, setAviso] = useState('');
  const [jaBuscou, setJaBuscou] = useState(false);
  /** Qual música está tocando agora. */
  const [tocando, setTocando] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Ao sair da tela, para o som.
  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  const buscar = async (e?: React.FormEvent) => {
    e?.preventDefault();

    const termo = texto.trim();
    if (termo.length < 3) {
      setAviso('Digite pelo menos 3 letras.');
      return;
    }

    pararSom();
    setBuscando(true);
    setAviso('');
    setResultados([]);

    try {
      const { resultados: achados, aviso: alerta } = await procurarParaOuvir(termo);
      setResultados(achados);
      setAviso(alerta || '');
      setJaBuscou(true);
    } catch {
      setAviso('Não foi possível buscar agora. Verifique a internet e tente de novo.');
    } finally {
      setBuscando(false);
    }
  };

  const pararSom = () => {
    audioRef.current?.pause();
    audioRef.current = null;
    setTocando(null);
  };

  const tocar = (musica: MusicaParaOuvir) => {
    if (tocando === musica.id) {
      pararSom();
      return;
    }

    pararSom();

    const som = new Audio(musica.previa);
    som.addEventListener('ended', () => setTocando(null));
    som.addEventListener('error', () => {
      setTocando(null);
      setAviso(`Não consegui tocar "${musica.nome}". Use o botão do YouTube.`);
    });

    audioRef.current = som;
    setTocando(musica.id);
    som.play().catch(() => {
      setTocando(null);
      setAviso('O navegador bloqueou o som. Toque novamente no botão de tocar.');
    });
  };

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <div className="mb-5">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Volume2 className="text-indigo-600" size={26} />
          Ouvir Música
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Digite o nome da música ou um pedaço da letra para escutar.
        </p>
      </div>

      <form onSubmit={buscar} className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
          <input
            type="text"
            value={texto}
            onChange={e => setTexto(e.target.value)}
            placeholder="Ex.: Deus é Deus — ou um trecho da letra"
            className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
        <button
          type="submit"
          disabled={buscando}
          className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {buscando ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
          {buscando ? 'Procurando...' : 'Procurar'}
        </button>
      </form>

      {aviso && (
        <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-sm">
          {aviso}
        </div>
      )}

      {buscando && (
        <div className="text-center py-10 text-gray-500 text-sm">
          Procurando a música...
        </div>
      )}

      {!buscando && resultados.length > 0 && (
        <div className="space-y-2">
          {resultados.map(musica => {
            const estaTocando = tocando === musica.id;

            return (
              <div
                key={musica.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 flex items-center gap-3"
              >
                {musica.capa ? (
                  <img
                    src={musica.capa}
                    alt=""
                    className="w-14 h-14 rounded-lg object-cover shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                    <Music size={22} className="text-indigo-400" />
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <p className="font-bold text-gray-900 text-sm break-words">{musica.nome}</p>
                  <p className="text-xs text-gray-500 truncate">{musica.cantor}</p>
                  {musica.album && (
                    <p className="text-[11px] text-gray-400 truncate">{musica.album}</p>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {musica.previa ? (
                    <button
                      onClick={() => tocar(musica)}
                      title={estaTocando ? 'Parar' : 'Ouvir 30 segundos'}
                      className={`w-11 h-11 rounded-full flex items-center justify-center transition ${
                        estaTocando
                          ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                          : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                      }`}
                    >
                      {estaTocando ? <Pause size={20} /> : <Play size={20} />}
                    </button>
                  ) : (
                    <span className="text-[10px] text-gray-400 w-11 text-center leading-tight">
                      sem prévia
                    </span>
                  )}

                  <a
                    href={musica.youtube}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Ouvir a música completa no YouTube"
                    className="w-11 h-11 rounded-full bg-red-50 text-red-600 hover:bg-red-100 flex items-center justify-center transition"
                  >
                    <Youtube size={20} />
                  </a>
                </div>
              </div>
            );
          })}

          <p className="text-xs text-gray-400 pt-2">
            O botão roxo toca a prévia oficial de 30 segundos. Para a música inteira,
            use o botão vermelho: ele abre a busca pronta no YouTube.
          </p>
        </div>
      )}

      {!buscando && jaBuscou && resultados.length === 0 && !aviso && (
        <div className="text-center py-10 text-gray-500 text-sm">
          Nenhuma música encontrada. Tente o nome da música ou outro trecho da letra.
        </div>
      )}
    </div>
  );
};
