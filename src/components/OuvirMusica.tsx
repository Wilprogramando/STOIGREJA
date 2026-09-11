import React, { useEffect, useRef, useState } from 'react';
import {
  Search, Loader2, Play, Pause, Youtube, Music, Volume2, Upload, Link2,
  Trash2, Plus, SkipBack, SkipForward, Rewind, FastForward, Globe, ListMusic,
} from 'lucide-react';
import { procurarParaOuvir, MusicaParaOuvir } from '../services/audio';
import {
  getAllMusicasAudio,
  saveMusicaAudio,
  deleteMusicaAudio,
  enviarArquivoMusica,
} from '../services/db';
import { MusicaAudio } from '../types';

/** Segundos em 3:45. */
function tempo(segundos: number): string {
  if (!segundos || !isFinite(segundos)) return '0:00';
  const min = Math.floor(segundos / 60);
  const seg = Math.floor(segundos % 60);
  return `${min}:${String(seg).padStart(2, '0')}`;
}

/**
 * OUVIR MÚSICA
 *
 * Duas abas:
 *   - Minhas músicas: as cadastradas pela equipe, tocadas do início ao fim,
 *     com linha do tempo para adiantar e voltar.
 *   - Procurar na internet: prévia de 30 segundos do catálogo da Apple.
 */
export const OuvirMusica: React.FC = () => {
  const [aba, setAba] = useState<'minhas' | 'internet'>('minhas');

  // ----- Músicas cadastradas -----
  const [musicas, setMusicas] = useState<MusicaAudio[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [cadastrando, setCadastrando] = useState(false);
  const [form, setForm] = useState({ nome: '', cantor: '', url: '' });
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [duracaoArquivo, setDuracaoArquivo] = useState(0);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  // ----- Tocador -----
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [atual, setAtual] = useState<MusicaAudio | null>(null);
  const [tocando, setTocando] = useState(false);
  const [posicao, setPosicao] = useState(0);
  const [duracao, setDuracao] = useState(0);

  // ----- Busca na internet (prévia de 30s) -----
  const [texto, setTexto] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [resultados, setResultados] = useState<MusicaParaOuvir[]>([]);
  const [aviso, setAviso] = useState('');
  const [jaBuscou, setJaBuscou] = useState(false);
  const [previaTocando, setPreviaTocando] = useState<string | null>(null);
  const previaRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    getAllMusicasAudio()
      .then(setMusicas)
      .finally(() => setCarregando(false));

    return () => {
      audioRef.current?.pause();
      previaRef.current?.pause();
    };
  }, []);

  // ==================== TOCADOR DAS MÚSICAS CADASTRADAS ====================

  const tocarMusica = (musica: MusicaAudio) => {
    pararPrevia();

    if (atual?.id === musica.id && audioRef.current) {
      if (tocando) {
        audioRef.current.pause();
        setTocando(false);
      } else {
        audioRef.current.play().catch(() => setErro('O navegador bloqueou o som. Toque de novo.'));
        setTocando(true);
      }
      return;
    }

    setAtual(musica);
    setPosicao(0);
    setDuracao(musica.duracao || 0);
    setTocando(true);
    setErro('');
  };

  // Troca a faixa: o <audio> abaixo recebe a nova fonte e começa a tocar.
  useEffect(() => {
    const som = audioRef.current;
    if (!som || !atual) return;
    som.play().catch(() => {
      setTocando(false);
      setErro('Não consegui tocar esta música. Confira o arquivo ou o link cadastrado.');
    });
  }, [atual]);

  const irPara = (segundos: number) => {
    const som = audioRef.current;
    if (!som) return;
    const destino = Math.max(0, Math.min(segundos, duracao || som.duration || 0));
    som.currentTime = destino;
    setPosicao(destino);
  };

  const trocarFaixa = (passo: number) => {
    if (!atual) return;
    const i = musicas.findIndex(m => m.id === atual.id);
    const proxima = musicas[i + passo];
    if (proxima) tocarMusica(proxima);
  };

  // ==================== CADASTRO ====================

  const escolherArquivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const escolhido = e.target.files?.[0] || null;
    setArquivo(escolhido);
    setDuracaoArquivo(0);
    setErro('');

    if (!escolhido) return;

    // Nome sugerido pelo próprio arquivo, quando o campo está vazio.
    if (!form.nome.trim()) {
      setForm(f => ({ ...f, nome: escolhido.name.replace(/\.[^.]+$/, '') }));
    }

    // Lê a duração real do arquivo antes de enviar.
    const endereco = URL.createObjectURL(escolhido);
    const teste = new Audio(endereco);
    teste.addEventListener('loadedmetadata', () => {
      setDuracaoArquivo(teste.duration || 0);
      URL.revokeObjectURL(endereco);
    });
    teste.addEventListener('error', () => URL.revokeObjectURL(endereco));
  };

  const salvarMusica = async () => {
    const nome = form.nome.trim();
    if (!nome) {
      setErro('Escreva o nome da música.');
      return;
    }
    if (!arquivo && !form.url.trim()) {
      setErro('Escolha um arquivo de música ou cole um link.');
      return;
    }

    setSalvando(true);
    setErro('');

    try {
      let url = form.url.trim();
      let caminho = '';
      let duracaoNova = duracaoArquivo;

      if (arquivo) {
        const enviado = await enviarArquivoMusica(arquivo);
        url = enviado.url;
        caminho = enviado.caminho;
      }

      const nova: MusicaAudio = {
        id: `musica_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        nome,
        cantor: form.cantor.trim(),
        url,
        arquivo: caminho,
        duracao: Math.round(duracaoNova || 0),
        criadoEm: new Date().toISOString(),
      };

      await saveMusicaAudio(nova);
      setMusicas(await getAllMusicasAudio());
      setForm({ nome: '', cantor: '', url: '' });
      setArquivo(null);
      setDuracaoArquivo(0);
      setCadastrando(false);
    } catch (e: any) {
      setErro(e?.message || 'Não foi possível salvar a música.');
    } finally {
      setSalvando(false);
    }
  };

  const excluirMusica = async (musica: MusicaAudio) => {
    if (!confirm(`Apagar "${musica.nome}" da lista?`)) return;

    if (atual?.id === musica.id) {
      audioRef.current?.pause();
      setAtual(null);
      setTocando(false);
    }

    await deleteMusicaAudio(musica);
    setMusicas(await getAllMusicasAudio());
  };

  // ==================== BUSCA NA INTERNET ====================

  const pararPrevia = () => {
    previaRef.current?.pause();
    previaRef.current = null;
    setPreviaTocando(null);
  };

  const buscar = async (e?: React.FormEvent) => {
    e?.preventDefault();

    const termo = texto.trim();
    if (termo.length < 3) {
      setAviso('Digite pelo menos 3 letras.');
      return;
    }

    pararPrevia();
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

  const tocarPrevia = (musica: MusicaParaOuvir) => {
    if (previaTocando === musica.id) {
      pararPrevia();
      return;
    }

    // Uma coisa de cada vez: para a música cadastrada que estiver tocando.
    audioRef.current?.pause();
    setTocando(false);
    pararPrevia();

    const som = new Audio(musica.previa);
    som.addEventListener('ended', () => setPreviaTocando(null));
    som.addEventListener('error', () => {
      setPreviaTocando(null);
      setAviso(`Não consegui tocar "${musica.nome}". Use o botão do YouTube.`);
    });

    previaRef.current = som;
    setPreviaTocando(musica.id);
    som.play().catch(() => {
      setPreviaTocando(null);
      setAviso('O navegador bloqueou o som. Toque novamente no botão de tocar.');
    });
  };

  // ==================== TELA ====================

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto pb-40">
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Volume2 className="text-indigo-600" size={26} />
          Ouvir Música
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          As músicas cadastradas tocam do início ao fim. Na busca da internet sai a
          prévia de 30 segundos.
        </p>
      </div>

      <div className="flex gap-2 mb-5">
        <button
          onClick={() => setAba('minhas')}
          className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition ${
            aba === 'minhas'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <ListMusic size={16} />
          Minhas músicas
        </button>
        <button
          onClick={() => setAba('internet')}
          className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition ${
            aba === 'internet'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Globe size={16} />
          Procurar na internet
        </button>
      </div>

      {erro && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm">
          {erro}
        </div>
      )}

      {/* ==================== ABA: MINHAS MÚSICAS ==================== */}
      {aba === 'minhas' && (
        <>
          {!cadastrando ? (
            <button
              onClick={() => setCadastrando(true)}
              className="w-full mb-4 px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-semibold text-sm flex items-center justify-center gap-2"
            >
              <Plus size={18} />
              Cadastrar música
            </button>
          ) : (
            <div className="mb-5 p-4 rounded-2xl border border-gray-200 bg-white shadow-sm space-y-3">
              <h3 className="font-bold text-gray-900">Nova música</h3>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Nome da música *
                </label>
                <input
                  type="text"
                  value={form.nome}
                  onChange={e => setForm({ ...form, nome: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  placeholder="Ex.: Deus é Deus"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Cantor</label>
                <input
                  type="text"
                  value={form.cantor}
                  onChange={e => setForm({ ...form, cantor: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  placeholder="Ex.: Delino Marçal"
                />
              </div>

              <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
                <label className="block text-xs font-medium text-gray-600 mb-2 flex items-center gap-1.5">
                  <Upload size={14} />
                  Arquivo da música (MP3, M4A, WAV)
                </label>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={escolherArquivo}
                  className="w-full text-sm file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-indigo-600 file:text-white file:text-sm file:font-semibold"
                />
                {arquivo && (
                  <p className="text-xs text-gray-600 mt-2">
                    {arquivo.name} · {(arquivo.size / 1024 / 1024).toFixed(1)} MB
                    {duracaoArquivo > 0 && ` · ${tempo(duracaoArquivo)}`}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1.5">
                  <Link2 size={14} />
                  Ou o link direto do áudio
                </label>
                <input
                  type="url"
                  value={form.url}
                  onChange={e => setForm({ ...form, url: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  placeholder="https://.../musica.mp3"
                />
                <p className="text-[11px] text-gray-500 mt-1">
                  Precisa ser o endereço do arquivo de áudio. Link de página do YouTube
                  ou do Spotify não toca aqui dentro.
                </p>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={salvarMusica}
                  disabled={salvando}
                  className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {salvando && <Loader2 size={16} className="animate-spin" />}
                  {salvando ? 'Enviando...' : 'Salvar música'}
                </button>
                <button
                  onClick={() => {
                    setCadastrando(false);
                    setArquivo(null);
                    setErro('');
                  }}
                  className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-semibold text-sm"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {carregando ? (
            <p className="text-sm text-gray-500">Carregando músicas...</p>
          ) : musicas.length === 0 ? (
            <div className="text-center py-10 text-gray-500 text-sm">
              Nenhuma música cadastrada ainda. Use o botão acima para enviar a primeira.
            </div>
          ) : (
            <div className="space-y-2">
              {musicas.map(musica => {
                const estaTocando = atual?.id === musica.id && tocando;

                return (
                  <div
                    key={musica.id}
                    className={`bg-white rounded-xl border p-3 flex items-center gap-3 transition ${
                      atual?.id === musica.id
                        ? 'border-indigo-300 shadow-sm'
                        : 'border-gray-200'
                    }`}
                  >
                    <button
                      onClick={() => tocarMusica(musica)}
                      title={estaTocando ? 'Pausar' : 'Tocar'}
                      className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition ${
                        estaTocando
                          ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                          : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                      }`}
                    >
                      {estaTocando ? <Pause size={20} /> : <Play size={20} />}
                    </button>

                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-gray-900 text-sm break-words">{musica.nome}</p>
                      <p className="text-xs text-gray-500 truncate">
                        {[musica.cantor, musica.duracao ? tempo(musica.duracao) : '']
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    </div>

                    <button
                      onClick={() => excluirMusica(musica)}
                      title="Apagar da lista"
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg shrink-0"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ==================== ABA: INTERNET ==================== */}
      {aba === 'internet' && (
        <>
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
                placeholder="Nome da música ou um trecho da letra"
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
            <div className="text-center py-10 text-gray-500 text-sm">Procurando a música...</div>
          )}

          {!buscando && resultados.length > 0 && (
            <div className="space-y-2">
              {resultados.map(musica => {
                const estaTocando = previaTocando === musica.id;

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
                          onClick={() => tocarPrevia(musica)}
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
                Aqui sai a prévia oficial de 30 segundos. Para ouvir inteira dentro do
                sistema, cadastre a música na aba "Minhas músicas".
              </p>
            </div>
          )}

          {!buscando && jaBuscou && resultados.length === 0 && !aviso && (
            <div className="text-center py-10 text-gray-500 text-sm">
              Nenhuma música encontrada. Tente o nome da música ou outro trecho da letra.
            </div>
          )}
        </>
      )}

      {/* ==================== BARRA DO TOCADOR (linha do tempo) ==================== */}
      {atual && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] z-40">
          <div className="max-w-4xl mx-auto p-3 sm:p-4">
            <audio
              ref={audioRef}
              src={atual.url}
              preload="metadata"
              onLoadedMetadata={e => setDuracao(e.currentTarget.duration || atual.duracao || 0)}
              onTimeUpdate={e => setPosicao(e.currentTarget.currentTime)}
              onPlay={() => setTocando(true)}
              onPause={() => setTocando(false)}
              onEnded={() => {
                setTocando(false);
                setPosicao(0);
              }}
              onError={() => {
                setTocando(false);
                setErro('Não consegui tocar esta música. Confira o arquivo ou o link cadastrado.');
              }}
            />

            <div className="flex items-center gap-3 mb-2">
              <div className="min-w-0 flex-1">
                <p className="font-bold text-gray-900 text-sm truncate">{atual.nome}</p>
                <p className="text-xs text-gray-500 truncate">{atual.cantor}</p>
              </div>
              <button
                onClick={() => {
                  audioRef.current?.pause();
                  setAtual(null);
                  setTocando(false);
                }}
                className="text-xs text-gray-400 hover:text-gray-600 px-2"
              >
                fechar
              </button>
            </div>

            {/* Linha do tempo: arraste para adiantar ou voltar */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-gray-500 w-10 text-right tabular-nums">
                {tempo(posicao)}
              </span>
              <input
                type="range"
                min={0}
                max={duracao || 0}
                step={1}
                value={posicao}
                onChange={e => irPara(Number(e.target.value))}
                className="flex-1 h-1.5 accent-indigo-600 cursor-pointer"
              />
              <span className="text-[11px] text-gray-500 w-10 tabular-nums">
                {tempo(duracao)}
              </span>
            </div>

            <div className="flex items-center justify-center gap-2 mt-2">
              <button
                onClick={() => trocarFaixa(-1)}
                title="Música anterior"
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <SkipBack size={20} />
              </button>
              <button
                onClick={() => irPara(posicao - 10)}
                title="Voltar 10 segundos"
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <Rewind size={20} />
              </button>
              <button
                onClick={() => tocarMusica(atual)}
                className="w-12 h-12 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 flex items-center justify-center"
              >
                {tocando ? <Pause size={22} /> : <Play size={22} />}
              </button>
              <button
                onClick={() => irPara(posicao + 10)}
                title="Adiantar 10 segundos"
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <FastForward size={20} />
              </button>
              <button
                onClick={() => trocarFaixa(1)}
                title="Próxima música"
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <SkipForward size={20} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
