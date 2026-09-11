import React, { useEffect, useRef, useState } from 'react';
import {
  Search, Loader2, Play, Pause, Youtube, Music, Volume2, Upload, Link2,
  Trash2, Plus, SkipBack, SkipForward, Rewind, FastForward, Globe, ListMusic, Mic, Square, Copy, Check, Gauge, Star,
} from 'lucide-react';
import { procurarParaOuvir, acharVideoNoYoutube, MusicaParaOuvir } from '../services/audio';
import {
  getAllMusicasAudio,
  saveMusicaAudio,
  deleteMusicaAudio,
  enviarArquivoMusica,
} from '../services/db';
import { MusicaAudio } from '../types';
import { DeletePasswordModal } from './DeletePasswordModal';
import { comprimirMusica, QUALIDADES, QualidadeAudio } from '../services/compressao';
import { listarFavoritas, alternarFavorita, removerFavorita, Favorita } from '../services/favoritos';

/** Tamanho em MB, com uma casa. */
function mb(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

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
  /** Favoritas da equipe (cadastradas e achadas na internet). */
  const [favoritas, setFavoritas] = useState<Favorita[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [cadastrando, setCadastrando] = useState(false);
  const [form, setForm] = useState({ nome: '', cantor: '', url: '' });
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [duracaoArquivo, setDuracaoArquivo] = useState(0);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  /** Música esperando a senha para ser apagada. */
  const [pedindoSenha, setPedindoSenha] = useState<MusicaAudio | null>(null);
  /** Qualidade escolhida para o envio (comprime antes de subir). */
  const [qualidade, setQualidade] = useState<QualidadeAudio>('media');
  const [comprimindo, setComprimindo] = useState(0);
  /** Tamanho final depois de comprimir, para mostrar o quanto diminuiu. */
  const [tamanhoFinal, setTamanhoFinal] = useState(0);

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
  /** Qual resultado está procurando o vídeo no YouTube. */
  const [abrindoYoutube, setAbrindoYoutube] = useState<string | null>(null);
  /** Qual resultado está copiando o link, e qual acabou de ser copiado. */
  const [copiando, setCopiando] = useState<string | null>(null);
  const [copiado, setCopiado] = useState<string | null>(null);
  const previaRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    getAllMusicasAudio()
      .then(setMusicas)
      .finally(() => setCarregando(false));

    // Favoritas da equipe, guardadas na nuvem.
    listarFavoritas().then(setFavoritas).catch(() => undefined);

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

  // ==================== FAVORITAS ====================

  const estaFavorita = (id: string) => favoritas.some(f => f.id === id);

  /** Estrela de uma música já cadastrada. */
  const favoritarCadastrada = async (musica: MusicaAudio) => {
    setFavoritas(
      await alternarFavorita(favoritas, {
        id: musica.id,
        tipo: 'cadastrada',
        nome: musica.nome,
        cantor: musica.cantor,
      })
    );
  };

  /** Estrela de uma música achada na internet (fica guardada para depois). */
  const favoritarDaInternet = async (musica: MusicaParaOuvir) => {
    setFavoritas(
      await alternarFavorita(favoritas, {
        id: musica.id,
        tipo: 'internet',
        nome: musica.nome,
        cantor: musica.cantor,
        capa: musica.capa,
        previa: musica.previa,
        youtube: musica.youtube,
      })
    );
  };

  /** Favorita da internet de volta no formato dos resultados da busca. */
  const comoResultado = (f: Favorita): MusicaParaOuvir => ({
    id: f.id,
    nome: f.nome,
    cantor: f.cantor,
    album: '',
    capa: f.capa || '',
    previa: f.previa || '',
    youtube: f.youtube || '',
  });

  const favoritasDaInternet = favoritas.filter(f => f.tipo === 'internet');

  // Favoritas cadastradas aparecem primeiro na lista.
  const musicasOrdenadas = [...musicas].sort(
    (a, b) => Number(estaFavorita(b.id)) - Number(estaFavorita(a.id))
  );

  // ==================== CADASTRO ====================

  /** Abre o formulário já preenchido com a música achada na internet. */
  const cadastrarDaBusca = (musica: MusicaParaOuvir) => {
    pararPrevia();
    setForm({ nome: musica.nome, cantor: musica.cantor, url: '' });
    setArquivo(null);
    setDuracaoArquivo(0);
    setErro('');
    setCadastrando(true);
    setAba('minhas');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ----- Gravar pelo próprio aparelho (ensaio, culto, playback) -----

  const gravadorRef = useRef<MediaRecorder | null>(null);
  const pedacosRef = useRef<Blob[]>([]);
  /** Quando a gravação começou, para calcular a duração ao parar. */
  const inicioRef = useRef<number>(0);
  const [gravando, setGravando] = useState(false);
  const [tempoGravado, setTempoGravado] = useState(0);

  const iniciarGravacao = async () => {
    setErro('');

    try {
      const microfone = await navigator.mediaDevices.getUserMedia({ audio: true });
      const gravador = new MediaRecorder(microfone);
      pedacosRef.current = [];

      gravador.addEventListener('dataavailable', evento => {
        if (evento.data.size > 0) pedacosRef.current.push(evento.data);
      });

      gravador.addEventListener('stop', () => {
        microfone.getTracks().forEach(faixa => faixa.stop());

        const tipo = gravador.mimeType || 'audio/webm';
        const extensao = tipo.includes('mp4') ? 'm4a' : 'webm';
        const bruto = new Blob(pedacosRef.current, { type: tipo });
        const agora = new Date();

        const gravacao = new File([bruto], `gravacao-${agora.getTime()}.${extensao}`, { type: tipo });
        setArquivo(gravacao);
        setDuracaoArquivo(Math.round((Date.now() - inicioRef.current) / 1000));

        if (!form.nome.trim()) {
          setForm(f => ({
            ...f,
            nome: `Gravação de ${agora.toLocaleDateString('pt-BR')}`,
          }));
        }
      });

      gravador.start();
      gravadorRef.current = gravador;
      inicioRef.current = Date.now();
      setTempoGravado(0);
      setGravando(true);
    } catch {
      setErro('Não consegui usar o microfone. Autorize o acesso ao microfone no navegador.');
    }
  };

  const pararGravacao = () => {
    gravadorRef.current?.stop();
    gravadorRef.current = null;
    setGravando(false);
  };

  // Relógio da gravação.
  useEffect(() => {
    if (!gravando) return;
    const timer = setInterval(() => setTempoGravado(t => t + 1), 1000);
    return () => clearInterval(timer);
  }, [gravando]);

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
        let paraEnviar = arquivo;

        // Comprime no próprio aparelho antes de subir, quando pedido.
        if (qualidade !== 'original') {
          setComprimindo(1);
          paraEnviar = await comprimirMusica(arquivo, qualidade, setComprimindo);
          setTamanhoFinal(paraEnviar.size);
          setComprimindo(0);
        }

        const enviado = await enviarArquivoMusica(paraEnviar);
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

  /** Só apaga depois da senha conferida no modal. */
  const excluirMusica = async (musica: MusicaAudio) => {
    setPedindoSenha(null);

    if (atual?.id === musica.id) {
      audioRef.current?.pause();
      setAtual(null);
      setTocando(false);
    }

    await deleteMusicaAudio(musica);
    setMusicas(await getAllMusicasAudio());
  };

  // ==================== BUSCA NA INTERNET ====================

  /**
   * Abre a música no aplicativo do YouTube quando ele está instalado.
   *
   * No celular tentamos primeiro o endereço do aplicativo (vnd.youtube://).
   * Se nada abrir em um segundo - aparelho sem o app, ou computador -,
   * seguimos para o site normal.
   */
  /** Copia o link do vídeo (o mesmo que o botão vermelho abre). */
  const copiarLinkYoutube = async (musica: MusicaParaOuvir) => {
    setCopiando(musica.id);

    const video = await acharVideoNoYoutube(musica.nome, musica.cantor);
    const link = video?.url || musica.youtube;

    try {
      await navigator.clipboard.writeText(link);
      setCopiado(musica.id);
      setTimeout(() => setCopiado(null), 2000);
    } catch {
      // Navegador antigo ou sem permissão: faz do jeito tradicional.
      const campo = document.createElement('textarea');
      campo.value = link;
      campo.style.position = 'fixed';
      campo.style.opacity = '0';
      document.body.appendChild(campo);
      campo.select();
      try {
        document.execCommand('copy');
        setCopiado(musica.id);
        setTimeout(() => setCopiado(null), 2000);
      } catch {
        setAviso('Não consegui copiar o link neste navegador.');
      }
      document.body.removeChild(campo);
    } finally {
      setCopiando(null);
    }
  };

  const abrirNoYoutube = async (musica: MusicaParaOuvir) => {
    const busca = `${musica.nome} ${musica.cantor}`.trim();
    const noCelular = /Android|iPhone|iPad/i.test(navigator.userAgent);

    setAbrindoYoutube(musica.id);
    // Descobre o vídeo em si; não achando, cai na busca do YouTube.
    const video = await acharVideoNoYoutube(musica.nome, musica.cantor);
    setAbrindoYoutube(null);

    const site = video?.url || musica.youtube;

    if (!noCelular) {
      window.open(site, '_blank', 'noopener');
      return;
    }

    let abriu = false;
    const aoSair = () => {
      abriu = true;
    };
    window.addEventListener('pagehide', aoSair, { once: true });
    document.addEventListener('visibilitychange', aoSair, { once: true });

    window.location.href = video
      ? `vnd.youtube://${video.id}`
      : `vnd.youtube://results?search_query=${encodeURIComponent(busca)}`;

    setTimeout(() => {
      window.removeEventListener('pagehide', aoSair);
      document.removeEventListener('visibilitychange', aoSair);
      if (!abriu && !document.hidden) {
        window.open(site, '_blank', 'noopener');
      }
    }, 1000);
  };

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
                    {arquivo.name} · {mb(arquivo.size)}
                    {duracaoArquivo > 0 && ` · ${tempo(duracaoArquivo)}`}
                    {tamanhoFinal > 0 && ` → enviado com ${mb(tamanhoFinal)}`}
                  </p>
                )}
              </div>

              <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
                <label className="block text-xs font-medium text-gray-600 mb-2 flex items-center gap-1.5">
                  <Gauge size={14} />
                  Qualidade do envio (comprime a música no aparelho)
                </label>

                <div className="grid grid-cols-2 gap-2">
                  {(['alta', 'media', 'baixa'] as const).map(nivel => (
                    <button
                      key={nivel}
                      onClick={() => setQualidade(nivel)}
                      className={`px-3 py-2 rounded-lg text-xs font-semibold text-left transition border ${
                        qualidade === nivel
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                      }`}
                    >
                      {QUALIDADES[nivel].rotulo} · {QUALIDADES[nivel].kbps} kbps
                      <span
                        className={`block font-normal ${
                          qualidade === nivel ? 'text-indigo-100' : 'text-gray-500'
                        }`}
                      >
                        {QUALIDADES[nivel].explicacao}
                      </span>
                    </button>
                  ))}

                  <button
                    onClick={() => setQualidade('original')}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold text-left transition border ${
                      qualidade === 'original'
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    Original
                    <span
                      className={`block font-normal ${
                        qualidade === 'original' ? 'text-indigo-100' : 'text-gray-500'
                      }`}
                    >
                      envia do jeito que está
                    </span>
                  </button>
                </div>

                {comprimindo > 0 && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-[11px] text-gray-600 mb-1">
                      <span>Comprimindo a música...</span>
                      <span className="tabular-nums">{comprimindo}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-600 rounded-full transition-all"
                        style={{ width: `${comprimindo}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
                <label className="block text-xs font-medium text-gray-600 mb-2 flex items-center gap-1.5">
                  <Mic size={14} />
                  Ou grave agora pelo aparelho (ensaio, culto, playback)
                </label>

                {gravando ? (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={pararGravacao}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold flex items-center gap-2 hover:bg-red-700"
                    >
                      <Square size={16} />
                      Parar gravação
                    </button>
                    <span className="text-sm font-bold text-red-600 tabular-nums flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" />
                      {tempo(tempoGravado)}
                    </span>
                  </div>
                ) : (
                  <button
                    onClick={iniciarGravacao}
                    className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-semibold flex items-center gap-2 hover:bg-gray-100"
                  >
                    <Mic size={16} />
                    Gravar agora
                  </button>
                )}

                <p className="text-[11px] text-gray-500 mt-2">
                  A gravação entra no lugar do arquivo acima. O navegador vai pedir
                  permissão para usar o microfone na primeira vez.
                </p>
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

          {favoritasDaInternet.length > 0 && (
            <div className="mb-5">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5 mb-2">
                <Star size={16} className="text-amber-500" fill="currentColor" />
                Favoritas da internet
              </h3>

              <div className="space-y-2">
                {favoritasDaInternet.map(f => {
                  const musica = comoResultado(f);
                  const estaTocando = previaTocando === f.id;

                  return (
                    <div
                      key={f.id}
                      className="bg-white rounded-xl border border-amber-200 p-3 flex items-center gap-3"
                    >
                      {f.capa ? (
                        <img src={f.capa} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                          <Music size={20} className="text-amber-400" />
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-gray-900 text-sm break-words">{f.nome}</p>
                        <p className="text-xs text-gray-500 truncate">{f.cantor}</p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {f.previa && (
                          <button
                            onClick={() => tocarPrevia(musica)}
                            title={estaTocando ? 'Parar' : 'Ouvir 30 segundos'}
                            className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 hover:bg-indigo-100 flex items-center justify-center"
                          >
                            {estaTocando ? <Pause size={18} /> : <Play size={18} />}
                          </button>
                        )}
                        <button
                          onClick={() => abrirNoYoutube(musica)}
                          title="Ouvir no YouTube"
                          className="w-10 h-10 rounded-full bg-red-50 text-red-600 hover:bg-red-100 flex items-center justify-center"
                        >
                          <Youtube size={18} />
                        </button>
                        <button
                          onClick={async () => setFavoritas(await removerFavorita(favoritas, f.id))}
                          title="Tirar dos favoritos"
                          className="w-10 h-10 rounded-full text-amber-500 hover:bg-amber-50 flex items-center justify-center"
                        >
                          <Star size={18} fill="currentColor" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <p className="text-[11px] text-gray-400 mt-2">
                Essas ficam guardadas na nuvem como lembrete. Para tocar inteira,
                cadastre a música com o arquivo.
              </p>
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
              {musicasOrdenadas.map(musica => {
                const estaTocando = atual?.id === musica.id && tocando;
                const favorita = estaFavorita(musica.id);

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
                      onClick={() => favoritarCadastrada(musica)}
                      title={favorita ? 'Tirar dos favoritos' : 'Marcar como favorita'}
                      className={`p-2 rounded-lg shrink-0 transition ${
                        favorita
                          ? 'text-amber-500 hover:bg-amber-50'
                          : 'text-gray-300 hover:text-amber-500 hover:bg-amber-50'
                      }`}
                    >
                      <Star size={18} fill={favorita ? 'currentColor' : 'none'} />
                    </button>

                    <button
                      onClick={() => setPedindoSenha(musica)}
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
          <form onSubmit={buscar} className="flex flex-nowrap items-center gap-2 mb-4">
            <div className="relative flex-1 min-w-0">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
              <input
                type="text"
                value={texto}
                onChange={e => setTexto(e.target.value)}
                placeholder="Nome da música ou trecho da letra"
                className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <button
              type="submit"
              disabled={buscando}
              className="shrink-0 px-4 sm:px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {buscando ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
              <span className="hidden sm:inline">{buscando ? 'Procurando...' : 'Procurar'}</span>
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
                    className="bg-white rounded-xl shadow-sm border border-gray-200 p-3"
                  >
                    {/* Cabeçalho: capa, nome e cantor */}
                    <div className="flex items-center gap-3">
                      {musica.capa ? (
                        <img
                          src={musica.capa}
                          alt=""
                          className="w-12 h-12 rounded-lg object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                          <Music size={20} className="text-indigo-400" />
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-gray-900 text-sm truncate">{musica.nome}</p>
                        <p className="text-xs text-gray-500 truncate">{musica.cantor}</p>
                        {musica.album && (
                          <p className="text-[11px] text-gray-400 truncate">{musica.album}</p>
                        )}
                      </div>
                    </div>

                    {/* Botões: uma linha só, dividindo a largura do cartão */}
                    <div className="mt-2.5 flex flex-nowrap items-center gap-1.5 [&>*]:flex-1">
                      {musica.previa ? (
                        <button
                          onClick={() => tocarPrevia(musica)}
                          title={estaTocando ? 'Parar' : 'Ouvir 30 segundos'}
                          className={`h-10 rounded-lg flex items-center justify-center transition ${
                            estaTocando
                              ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                              : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                          }`}
                        >
                          {estaTocando ? <Pause size={18} /> : <Play size={18} />}
                        </button>
                      ) : (
                        <span className="h-10 rounded-lg bg-gray-50 text-[10px] text-gray-400 flex items-center justify-center leading-tight">
                          sem prévia
                        </span>
                      )}

                      <button
                        onClick={() => abrirNoYoutube(musica)}
                        disabled={abrindoYoutube === musica.id}
                        title="Ouvir a música completa no YouTube"
                        className="h-10 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 flex items-center justify-center transition disabled:opacity-60"
                      >
                        {abrindoYoutube === musica.id ? (
                          <Loader2 size={18} className="animate-spin" />
                        ) : (
                          <Youtube size={18} />
                        )}
                      </button>

                      <button
                        onClick={() => favoritarDaInternet(musica)}
                        title={
                          estaFavorita(musica.id)
                            ? 'Tirar dos favoritos'
                            : 'Guardar nos favoritos'
                        }
                        className={`h-10 rounded-lg flex items-center justify-center transition ${
                          estaFavorita(musica.id)
                            ? 'bg-amber-100 text-amber-600 hover:bg-amber-200'
                            : 'bg-gray-100 text-gray-500 hover:bg-amber-50 hover:text-amber-600'
                        }`}
                      >
                        <Star
                          size={18}
                          fill={estaFavorita(musica.id) ? 'currentColor' : 'none'}
                        />
                      </button>

                      <button
                        onClick={() => copiarLinkYoutube(musica)}
                        disabled={copiando === musica.id}
                        title="Copiar o link do YouTube"
                        className={`h-10 rounded-lg flex items-center justify-center transition disabled:opacity-60 ${
                          copiado === musica.id
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {copiando === musica.id ? (
                          <Loader2 size={18} className="animate-spin" />
                        ) : copiado === musica.id ? (
                          <Check size={18} />
                        ) : (
                          <Copy size={18} />
                        )}
                      </button>

                      <button
                        onClick={() => cadastrarDaBusca(musica)}
                        title="Cadastrar esta música em Minhas músicas"
                        className="h-10 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 flex items-center justify-center transition"
                      >
                        <Plus size={18} />
                      </button>
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

      {/* Senha para apagar, a mesma usada nos hinos */}
      {pedindoSenha && (
        <DeletePasswordModal
          hinoNome={pedindoSenha.nome}
          onConfirm={() => excluirMusica(pedindoSenha)}
          onCancel={() => setPedindoSenha(null)}
        />
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
