import React, { useEffect, useState } from 'react';
import {
  Search,
  Loader2,
  FileText,
  Plus,
  X,
  ExternalLink,
  Check,
  Globe,
  StickyNote,
} from 'lucide-react';
import { addHino, getAllHinos } from '../services/db';
import { lerCantores, sincronizarCantoresDosHinos } from '../services/cantores';
import { lerCategorias } from '../services/categorias';
import { buscarMusicas, obterLetra, MusicaEncontrada } from '../services/musicas';
import { salvarAnotacao } from '../services/anotacoes';
import { Hino } from '../types';
import { ModalVisualizaLetra } from './ModalVisualizaLetra';

const TONS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];


const campo =
  'w-full px-3.5 py-2.5 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition text-sm';

/** Tira acento e pontuação para comparar nomes de hino. */
const chaveDoNome = (texto: string) =>
  (texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/** Dados de uma música já com a letra carregada. */
interface MusicaComLetra {
  musica: MusicaEncontrada;
  nome: string;
  cantor: string;
  letra: string;
  fonte?: string;
}

export const BuscarMusica: React.FC = () => {
  const [texto, setTexto] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [resultados, setResultados] = useState<MusicaEncontrada[]>([]);
  const [aviso, setAviso] = useState('');
  const [jaBuscou, setJaBuscou] = useState(false);

  /** Qual música está carregando a letra (o botão fica girando). */
  const [carregando, setCarregando] = useState<string | null>(null);

  const [verLetra, setVerLetra] = useState<MusicaComLetra | null>(null);
  const [cadastrando, setCadastrando] = useState<MusicaComLetra | null>(null);

  const [cantores, setCantores] = useState<string[]>(() => lerCantores());
  /** Nomes dos hinos comuns já cadastrados, para avisar quando repetir. */
  const [nomesCadastrados, setNomesCadastrados] = useState<Set<string>>(new Set());

  const [formulario, setFormulario] = useState({
    nome: '',
    tom: 'C',
    cantor: '',
    letra: '',
    categoria: 'Manancial',
    observacoes: '',
  });
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState('');
  /** Qual música está sendo guardada nas anotações. */
  const [guardando, setGuardando] = useState<string | null>(null);

  useEffect(() => {
    sincronizarCantoresDosHinos().then(setCantores);
    carregarNomes();
  }, []);

  const carregarNomes = async () => {
    const todos = await getAllHinos();
    setNomesCadastrados(
      new Set(todos.filter((h) => h.tipo === 'comum').map((h) => chaveDoNome(h.nome)))
    );
  };

  const handleBuscar = async (e?: React.FormEvent) => {
    e?.preventDefault();

    const termo = texto.trim();
    if (termo.length < 3) {
      setAviso('Digite pelo menos 3 letras.');
      return;
    }

    setBuscando(true);
    setAviso('');
    setResultados([]);

    try {
      const { resultados: achados, aviso: recado } = await buscarMusicas(termo);
      setResultados(achados);
      setAviso(recado || '');
      setJaBuscou(true);
    } catch (erro: any) {
      setAviso(erro?.message || 'Erro ao buscar. Verifique a internet e tente de novo.');
    } finally {
      setBuscando(false);
    }
  };

  /** Baixa a letra da música escolhida (usada pelos dois botões do card). */
  const carregarLetra = async (musica: MusicaEncontrada): Promise<MusicaComLetra | null> => {
    setCarregando(musica.id);
    setAviso('');

    try {
      const achado = await obterLetra(musica);

      if (!achado.letra) {
        setAviso(`Não consegui abrir a letra de "${musica.nome}". Tente outra opção da lista.`);
        return null;
      }

      return {
        musica,
        nome: achado.nome,
        cantor: achado.cantor,
        letra: achado.letra,
        fonte: achado.fonte,
      };
    } catch (erro: any) {
      setAviso(erro?.message || 'Erro ao abrir a letra.');
      return null;
    } finally {
      setCarregando(null);
    }
  };

  const handleVerLetra = async (musica: MusicaEncontrada) => {
    const carregada = await carregarLetra(musica);
    if (carregada) setVerLetra(carregada);
  };

  const abrirCadastro = (carregada: MusicaComLetra) => {
    setFormulario({
      nome: carregada.nome,
      tom: 'C',
      // O cantor da igreja é escolhido na hora; o artista original vai nas observações.
      cantor: '',
      letra: carregada.letra,
      categoria: 'Manancial',
      observacoes: carregada.cantor ? `Original: ${carregada.cantor}` : '',
    });
    setSalvo('');
    setVerLetra(null);
    setCadastrando(carregada);
  };

  /**
   * Guarda o achado apenas nas Anotações, com a letra junto.
   * De lá o usuário decide depois se transfere para os hinos comuns.
   */
  const guardarNasAnotacoes = async (carregada: MusicaComLetra) => {
    setGuardando(carregada.musica.id);
    setAviso('');

    try {
      await salvarAnotacao({
        hino: carregada.nome,
        cantor: carregada.cantor || '',
        tom: '',
        observacoes: carregada.fonte ? `Letra encontrada em: ${carregada.fonte}` : '',
        letra: carregada.letra,
        criadoEm: new Date().toISOString(),
      });

      setVerLetra(null);
      setSalvo(`anotado:"${carregada.nome}" foi guardado nas Anotações com a letra.`);
    } catch (erro) {
      console.error('Erro ao guardar nas anotações:', erro);
      setAviso('Não foi possível guardar nas anotações. Tente de novo.');
    } finally {
      setGuardando(null);
    }
  };

  const handleGuardar = async (musica: MusicaEncontrada) => {
    const carregada = await carregarLetra(musica);
    if (carregada) await guardarNasAnotacoes(carregada);
  };

  const handleCadastrar = async (musica: MusicaEncontrada) => {
    const carregada = await carregarLetra(musica);
    if (carregada) abrirCadastro(carregada);
  };

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formulario.nome.trim() || !formulario.cantor.trim()) {
      setSalvo('erro:Preencha o nome do hino e o cantor.');
      return;
    }

    setSalvando(true);

    try {
      const agora = new Date().toISOString();
      const novo: Hino = {
        id: Date.now().toString(),
        nome: formulario.nome.trim(),
        tom: formulario.tom,
        cantor: formulario.cantor.trim(),
        letra: formulario.letra,
        categoria: formulario.categoria,
        observacoes: formulario.observacoes,
        tipo: 'comum',
        criadoEm: agora,
        atualizadoEm: agora,
      };

      await addHino(novo);
      await carregarNomes();
      setCantores(await sincronizarCantoresDosHinos());

      setCadastrando(null);
      setSalvo(`ok:"${novo.nome}" foi cadastrado nos hinos.`);
    } catch (erro) {
      console.error('Erro ao cadastrar hino:', erro);
      setSalvo('erro:Não foi possível salvar o hino. Tente de novo.');
    } finally {
      setSalvando(false);
    }
  };

  // Categorias cadastradas em Configuracoes; a atual entra na lista mesmo
  // que tenha sido apagada de la, para o hino nao perder a categoria.
  const cadastradas = lerCategorias();
  const categorias = cadastradas.includes(formulario.categoria)
    ? cadastradas
    : [formulario.categoria, ...cadastradas].filter(Boolean);

  return (
    <div className="max-w-3xl mx-auto pb-20">
      {/* Cabeçalho */}
      <div className="flex items-start gap-3 mb-5">
        <div className="bg-indigo-50 text-indigo-600 p-2.5 rounded-xl shrink-0">
          <Globe size={22} />
        </div>
        <div className="min-w-0">
          <h2 className="text-2xl font-bold text-gray-900">Buscar Música</h2>
          <p className="text-sm text-gray-500">
            Procure pelo nome ou por um pedaço da letra
          </p>
        </div>
      </div>

      {/* Campo de busca */}
      <form
        onSubmit={handleBuscar}
        className="bg-white rounded-2xl border border-gray-100 shadow-lg p-4 sm:p-5 mb-5"
      >
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Trecho da letra ou nome da música
        </label>

        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Ex.: porque ele vive, posso crer no amanhã"
            className={campo}
            autoFocus
          />

          <button
            type="submit"
            disabled={buscando}
            className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-semibold flex items-center justify-center gap-2 shadow-md disabled:opacity-60 shrink-0"
          >
            {buscando ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
            Buscar
          </button>
        </div>

        <p className="text-xs text-gray-500 mt-2">
          Não lembra o nome? Digite as palavras da letra que você lembra.
        </p>
      </form>

      {/* Recado de sucesso do cadastro */}
      {salvo.startsWith('ok:') && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800 flex items-center gap-2">
          <Check size={16} className="shrink-0" />
          {salvo.slice(3)} Ele já aparece em <strong>Cadastrar Hino</strong> e em{' '}
          <strong>Montar Repertório</strong>.
        </div>
      )}

      {salvo.startsWith('anotado:') && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800 flex items-center gap-2">
          <Check size={16} className="shrink-0" />
          {salvo.slice(8)} Ele aparece agora em <strong>Anotações</strong>, onde dá para
          transferir para os hinos comuns quando você quiser.
        </div>
      )}

      {aviso && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
          {aviso}
        </div>
      )}

      {/* Resultados */}
      {buscando && (
        <div className="flex items-center justify-center gap-2 py-10 text-gray-500">
          <Loader2 size={20} className="animate-spin" />
          Procurando nos sites de letras...
        </div>
      )}

      {!buscando && resultados.length > 0 && (
        <div className="space-y-3">
          {resultados.map((musica) => {
            const jaTem = nomesCadastrados.has(chaveDoNome(musica.nome));
            const ocupado = carregando === musica.id;

            return (
              <div
                key={musica.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-md p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-bold text-gray-900 leading-tight">{musica.nome}</h3>
                    <p className="text-sm text-gray-500">{musica.cantor || 'Cantor não informado'}</p>
                  </div>

                  {jaTem && (
                    <span className="shrink-0 text-[11px] font-semibold px-2 py-1 rounded-lg bg-green-50 text-green-700 border border-green-200">
                      já cadastrado
                    </span>
                  )}
                </div>

                {musica.trecho && (
                  <p className="mt-2 text-sm text-gray-600 bg-gray-50 rounded-xl p-3 whitespace-pre-line line-clamp-4">
                    {musica.trecho}
                  </p>
                )}

                <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    onClick={() => handleVerLetra(musica)}
                    disabled={ocupado}
                    className="flex-1 px-3 py-2.5 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 transition text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {ocupado ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
                    Abrir letra
                  </button>

                  <button
                    onClick={() => handleGuardar(musica)}
                    disabled={ocupado}
                    className="px-3 py-2.5 rounded-xl bg-amber-500 text-white hover:bg-amber-600 transition text-sm font-semibold flex items-center justify-center gap-2 shadow-sm disabled:opacity-60"
                  >
                    {guardando === musica.id ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <StickyNote size={16} />
                    )}
                    Guardar em anotações
                  </button>

                  <button
                    onClick={() => handleCadastrar(musica)}
                    disabled={ocupado}
                    className="px-3 py-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition text-sm font-semibold flex items-center justify-center gap-2 shadow-sm disabled:opacity-60"
                  >
                    {ocupado ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                    Cadastrar hino
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!buscando && jaBuscou && resultados.length === 0 && !aviso && (
        <div className="text-center py-10 text-gray-500 text-sm">
          Nenhuma música encontrada. Tente outro trecho da letra.
        </div>
      )}

      {/* Modal: letra completa */}
      {verLetra && (
        <ModalVisualizaLetra
          hino={{ nome: verLetra.nome, cantor: verLetra.cantor, letra: verLetra.letra } as any}
          onClose={() => setVerLetra(null)}
        >
          {verLetra.fonte && (
            <a
              href={verLetra.fonte}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:underline"
            >
              <ExternalLink size={13} />
              Ver no site de origem
            </a>
          )}

          <div className="mt-5 flex flex-col sm:flex-row gap-2">
            <button
              onClick={() => guardarNasAnotacoes(verLetra)}
              disabled={guardando === verLetra.musica.id}
              className="flex-1 px-4 py-2.5 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {guardando === verLetra.musica.id ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <StickyNote size={16} />
              )}
              Guardar em anotações
            </button>
            <button
              onClick={() => abrirCadastro(verLetra)}
              className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-semibold text-sm flex items-center justify-center gap-2"
            >
              <Plus size={16} />
              Cadastrar hino
            </button>
          </div>
        </ModalVisualizaLetra>
      )}

      {/* Modal: cadastro do hino */}
      {cadastrando && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <form
            onSubmit={handleSalvar}
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col"
          >
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-5 flex items-start justify-between gap-3 rounded-t-2xl">
              <div className="min-w-0">
                <h3 className="text-xl font-bold leading-tight">Cadastrar hino</h3>
                <p className="text-indigo-100 text-sm mt-0.5">
                  Vai para a lista de hinos comuns
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCadastrando(null)}
                className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition shrink-0"
              >
                <X size={22} />
              </button>
            </div>

            <div className="p-5 overflow-auto space-y-3">
              {salvo.startsWith('erro:') && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                  {salvo.slice(5)}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Nome do hino *
                </label>
                <input
                  type="text"
                  value={formulario.nome}
                  onChange={(e) => setFormulario({ ...formulario, nome: e.target.value })}
                  className={campo}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Tom</label>
                  <select
                    value={formulario.tom}
                    onChange={(e) => setFormulario({ ...formulario, tom: e.target.value })}
                    className={campo}
                  >
                    {TONS.map((tom) => (
                      <option key={tom} value={tom}>
                        {tom}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Categoria
                  </label>
                  <select
                    value={formulario.categoria}
                    onChange={(e) =>
                      setFormulario({ ...formulario, categoria: e.target.value })
                    }
                    className={campo}
                  >
                    {categorias.map((categoria) => (
                      <option key={categoria} value={categoria}>
                        {categoria}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Cantor *
                </label>
                {/* Lista, e nao campo com sugestoes: no celular a sugestao do
                    datalist nao abre, e o cantor tem de ser escolhido. */}
                <select
                  value={formulario.cantor}
                  onChange={(e) => setFormulario({ ...formulario, cantor: e.target.value })}
                  className={campo}
                >
                  <option value="">Selecione o cantor</option>
                  {cantores.map((nome) => (
                    <option key={nome} value={nome}>
                      {nome}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Quem vai cantar na igreja. Para incluir alguém na lista, use
                  Configurações {'>'} Cantores.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Letra</label>
                <textarea
                  value={formulario.letra}
                  onChange={(e) => setFormulario({ ...formulario, letra: e.target.value })}
                  rows={8}
                  className={`${campo} font-sans`}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Observações
                </label>
                <input
                  type="text"
                  value={formulario.observacoes}
                  onChange={(e) =>
                    setFormulario({ ...formulario, observacoes: e.target.value })
                  }
                  className={campo}
                />
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => setCadastrando(null)}
                className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition font-semibold text-sm"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={salvando}
                className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {salvando ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                Salvar hino
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
