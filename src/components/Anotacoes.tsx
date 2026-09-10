import React, { useEffect, useState } from 'react';
import {
  StickyNote,
  Plus,
  Trash2,
  Pencil,
  Search,
  X,
  Music,
  Globe,
  Loader2,
  FileText,
  ExternalLink,
  Check,
  ArrowRightLeft,
} from 'lucide-react';
import { Anotacao, listarAnotacoes, salvarAnotacao, excluirAnotacao } from '../services/anotacoes';
import { buscarMusicas, obterLetra, MusicaEncontrada } from '../services/musicas';
import { addHino, getAllHinos } from '../services/db';
import { lerCantores, sincronizarCantoresDosHinos } from '../services/cantores';
import { Hino } from '../types';

const TONS = ['', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const TONS_HINO = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const CATEGORIAS = ['Alfa', 'Manancial', 'Louvor', 'Consagração', 'Outro'];

const VAZIO = { id: '', hino: '', cantor: '', tom: '', observacoes: '', letra: '' };

/** Tira acento e pontuação para comparar nomes de hino. */
const chaveDoNome = (texto: string) =>
  (texto || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/** Letra completa aberta em um modal (vem da busca ou de uma anotação). */
interface LetraAberta {
  nome: string;
  cantor: string;
  letra: string;
  fonte?: string;
  /** Quando veio da busca, dá para salvar direto em anotações. */
  musica?: MusicaEncontrada;
}

/**
 * Bloco de anotações para sugestões de hinos ouvidas no ensaio.
 *
 * Aqui também dá para procurar a letra na internet (pelo nome ou por um trecho),
 * guardar só como anotação e, quando quiser, transferir para os hinos comuns.
 */
export const Anotacoes: React.FC = () => {
  const [anotacoes, setAnotacoes] = useState<Anotacao[]>([]);
  const [form, setForm] = useState(VAZIO);
  const [busca, setBusca] = useState('');
  const [aviso, setAviso] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [recado, setRecado] = useState('');

  // ----- Busca de letras na internet -----
  const [textoBusca, setTextoBusca] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [resultados, setResultados] = useState<MusicaEncontrada[]>([]);
  const [avisoBusca, setAvisoBusca] = useState('');
  const [jaBuscou, setJaBuscou] = useState(false);
  /** Qual resultado está baixando a letra (o botão fica girando). */
  const [baixando, setBaixando] = useState<string | null>(null);

  const [letraAberta, setLetraAberta] = useState<LetraAberta | null>(null);

  // ----- Transferência para hinos comuns -----
  const [transferindo, setTransferindo] = useState<Anotacao | null>(null);
  const [formHino, setFormHino] = useState({
    nome: '',
    tom: 'C',
    cantor: '',
    letra: '',
    categoria: 'Manancial',
    observacoes: '',
  });
  const [salvandoHino, setSalvandoHino] = useState(false);
  const [erroHino, setErroHino] = useState('');
  const [cantores, setCantores] = useState<string[]>(() => lerCantores());
  /** Nomes dos hinos comuns já cadastrados, para marcar o que já foi transferido. */
  const [nomesCadastrados, setNomesCadastrados] = useState<Set<string>>(new Set());

  const recarregar = async () => {
    try {
      setAnotacoes(await listarAnotacoes());
    } catch (error) {
      console.error('Erro ao carregar anotações:', error);
      setAviso('Não foi possível carregar as anotações.');
    } finally {
      setCarregando(false);
    }
  };

  const carregarNomes = async () => {
    try {
      const todos = await getAllHinos();
      setNomesCadastrados(
        new Set(todos.filter(h => h.tipo === 'comum').map(h => chaveDoNome(h.nome)))
      );
    } catch (error) {
      console.error('Erro ao carregar hinos cadastrados:', error);
    }
  };

  useEffect(() => {
    recarregar();
    carregarNomes();
    sincronizarCantoresDosHinos().then(setCantores).catch(() => {});
  }, []);

  const editando = form.id !== '';

  const salvar = async () => {
    if (!form.hino.trim()) {
      setAviso('Escreva pelo menos o nome do hino.');
      return;
    }

    setSalvando(true);
    try {
      await salvarAnotacao({
        ...form,
        id: form.id || undefined,
        hino: form.hino.trim(),
        cantor: form.cantor.trim(),
        tom: form.tom.trim(),
        observacoes: form.observacoes.trim(),
        letra: form.letra,
        criadoEm: editando
          ? anotacoes.find(a => a.id === form.id)?.criadoEm || new Date().toISOString()
          : new Date().toISOString()
      });

      await recarregar();
      setForm(VAZIO);
      setAviso(null);
    } catch (error) {
      console.error('Erro ao salvar anotação:', error);
      setAviso('Não foi possível salvar a anotação.');
    } finally {
      setSalvando(false);
    }
  };

  const editar = (anotacao: Anotacao) => {
    setForm({
      id: anotacao.id,
      hino: anotacao.hino,
      cantor: anotacao.cantor,
      tom: anotacao.tom,
      observacoes: anotacao.observacoes,
      letra: anotacao.letra || ''
    });
    setAviso(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const excluir = async (anotacao: Anotacao) => {
    if (!confirm(`Apagar a anotação "${anotacao.hino}"?`)) return;

    try {
      await excluirAnotacao(anotacao.id);
      await recarregar();
      if (form.id === anotacao.id) setForm(VAZIO);
    } catch (error) {
      console.error('Erro ao excluir anotação:', error);
      setAviso('Não foi possível apagar a anotação.');
    }
  };

  // ==================== BUSCA NA INTERNET ====================

  const handleBuscar = async (e?: React.FormEvent) => {
    e?.preventDefault();

    const termo = textoBusca.trim();
    if (termo.length < 3) {
      setAvisoBusca('Digite pelo menos 3 letras.');
      return;
    }

    setBuscando(true);
    setAvisoBusca('');
    setResultados([]);

    try {
      const { resultados: achados, aviso: alerta } = await buscarMusicas(termo);
      setResultados(achados);
      setAvisoBusca(alerta || '');
      setJaBuscou(true);
    } catch (erro: any) {
      setAvisoBusca(erro?.message || 'Erro ao buscar. Verifique a internet e tente de novo.');
    } finally {
      setBuscando(false);
    }
  };

  /** Baixa a letra da música escolhida (usada pelos dois botões do resultado). */
  const carregarLetra = async (musica: MusicaEncontrada): Promise<LetraAberta | null> => {
    setBaixando(musica.id);
    setAvisoBusca('');

    try {
      const achado = await obterLetra(musica);

      if (!achado.letra) {
        setAvisoBusca(
          `Não consegui abrir a letra de "${musica.nome}". Tente outra opção da lista.`
        );
        return null;
      }

      return {
        nome: achado.nome,
        cantor: achado.cantor,
        letra: achado.letra,
        fonte: achado.fonte,
        musica,
      };
    } catch (erro: any) {
      setAvisoBusca(erro?.message || 'Erro ao abrir a letra.');
      return null;
    } finally {
      setBaixando(null);
    }
  };

  const handleVerLetra = async (musica: MusicaEncontrada) => {
    const carregada = await carregarLetra(musica);
    if (carregada) setLetraAberta(carregada);
  };

  /** Guarda o achado da internet como anotação (não vai para os hinos ainda). */
  const guardarNasAnotacoes = async (achado: LetraAberta) => {
    setSalvando(true);
    try {
      await salvarAnotacao({
        hino: achado.nome,
        cantor: achado.cantor || '',
        tom: '',
        observacoes: achado.fonte ? `Letra encontrada em: ${achado.fonte}` : '',
        letra: achado.letra,
        criadoEm: new Date().toISOString(),
      });

      await recarregar();
      setLetraAberta(null);
      setRecado(`"${achado.nome}" foi guardado nas anotações com a letra.`);
    } catch (error) {
      console.error('Erro ao guardar anotação:', error);
      setAvisoBusca('Não foi possível guardar nas anotações.');
    } finally {
      setSalvando(false);
    }
  };

  const handleGuardar = async (musica: MusicaEncontrada) => {
    const carregada = await carregarLetra(musica);
    if (carregada) await guardarNasAnotacoes(carregada);
  };

  // ==================== TRANSFERIR PARA HINOS COMUNS ====================

  const abrirTransferencia = (anotacao: Anotacao) => {
    // O artista da musica nao serve como cantor do hino: aqui o cantor e quem
    // vai cantar na igreja, escolhido na lista das Configuracoes. O nome do
    // artista original fica guardado nas observacoes.
    const original = anotacao.cantor?.trim()
      ? `Original: ${anotacao.cantor.trim()}`
      : '';
    const anotado = anotacao.observacoes?.trim() || '';

    setFormHino({
      nome: anotacao.hino,
      tom: anotacao.tom || '',
      cantor: cantores.includes(anotacao.cantor) ? anotacao.cantor : '',
      letra: anotacao.letra || '',
      categoria: 'Manancial',
      observacoes: [original, anotado].filter(Boolean).join(' | '),
    });
    setErroHino('');
    setRecado('');
    setTransferindo(anotacao);
  };

  const confirmarTransferencia = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formHino.nome.trim() || !formHino.cantor.trim() || !formHino.tom.trim()) {
      setErroHino('Escreva o nome do hino e escolha o tom e o cantor que vai cantar.');
      return;
    }

    setSalvandoHino(true);

    try {
      const agora = new Date().toISOString();
      const novo: Hino = {
        id: Date.now().toString(),
        nome: formHino.nome.trim(),
        tom: formHino.tom,
        cantor: formHino.cantor.trim(),
        letra: formHino.letra,
        categoria: formHino.categoria,
        observacoes: formHino.observacoes,
        tipo: 'comum',
        criadoEm: agora,
        atualizadoEm: agora,
      };

      await addHino(novo);
      await carregarNomes();
      setCantores(await sincronizarCantoresDosHinos());

      setTransferindo(null);
      setRecado(`"${novo.nome}" foi transferido para os hinos comuns.`);
    } catch (error) {
      console.error('Erro ao transferir para hinos comuns:', error);
      setErroHino('Não foi possível transferir o hino. Tente de novo.');
    } finally {
      setSalvandoHino(false);
    }
  };

  const termo = busca.trim().toLowerCase();
  const filtradas = termo
    ? anotacoes.filter(a =>
        [a.hino, a.cantor, a.observacoes, a.letra].some(campo =>
          (campo || '').toLowerCase().includes(termo)
        )
      )
    : anotacoes;

  const formatarData = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('pt-BR');
    } catch {
      return '';
    }
  };

  const campo =
    'w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none';

  return (
    <div className="max-w-4xl mx-auto pb-20">
      <div className="mb-6">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-800 flex items-center gap-2">
          <StickyNote size={28} className="text-indigo-600" />
          Anotações
        </h2>
        <p className="text-gray-500">
          Anote sugestões de hinos, ache a letra na internet e transfira só as que você quiser.
        </p>
      </div>

      {/* Busca de letra na internet */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <h3 className="font-semibold text-gray-800 mb-1 flex items-center gap-2">
          <Globe size={18} className="text-indigo-600" />
          Procurar a letra na internet
        </h3>
        <p className="text-sm text-gray-500 mb-3">
          Digite o nome do hino ou um pedaço da letra que você lembra.
        </p>

        <form onSubmit={handleBuscar} className="flex flex-col sm:flex-row gap-2">
          <input
            value={textoBusca}
            onChange={e => setTextoBusca(e.target.value)}
            placeholder="Ex.: porque ele vive, posso crer no amanhã"
            className={campo}
          />
          <button
            type="submit"
            disabled={buscando}
            className="px-5 py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:opacity-60 flex items-center justify-center gap-2 shrink-0"
          >
            {buscando ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
            Buscar
          </button>
        </form>

        {avisoBusca && (
          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
            {avisoBusca}
          </div>
        )}

        {buscando && (
          <div className="flex items-center justify-center gap-2 py-8 text-gray-500">
            <Loader2 size={20} className="animate-spin" />
            Procurando nos sites de letras...
          </div>
        )}

        {!buscando && resultados.length > 0 && (
          <div className="mt-4 space-y-3">
            {resultados.map(musica => {
              const ocupado = baixando === musica.id;

              return (
                <div key={musica.id} className="border border-gray-200 rounded-xl p-3">
                  <h4 className="font-bold text-gray-900 leading-tight">{musica.nome}</h4>
                  <p className="text-sm text-gray-500">
                    {musica.cantor || 'Cantor não informado'}
                  </p>

                  {musica.trecho && (
                    <p className="mt-2 text-sm text-gray-600 bg-gray-50 rounded-lg p-3 whitespace-pre-line line-clamp-4">
                      {musica.trecho}
                    </p>
                  )}

                  <div className="mt-3 flex flex-col sm:flex-row gap-2">
                    <button
                      onClick={() => handleVerLetra(musica)}
                      disabled={ocupado}
                      className="flex-1 px-3 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                      {ocupado ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <FileText size={16} />
                      )}
                      Abrir letra
                    </button>

                    <button
                      onClick={() => handleGuardar(musica)}
                      disabled={ocupado}
                      className="flex-1 px-3 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                      {ocupado ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <StickyNote size={16} />
                      )}
                      Guardar nas anotações
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!buscando && jaBuscou && resultados.length === 0 && !avisoBusca && (
          <p className="text-center py-6 text-gray-500 text-sm">
            Nenhuma música encontrada. Tente outro trecho da letra.
          </p>
        )}
      </div>

      {recado && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800 flex items-start gap-2">
          <Check size={16} className="shrink-0 mt-0.5" />
          <span>{recado}</span>
        </div>
      )}

      {/* Formulário */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <h3 className="font-semibold text-gray-800 mb-3">
          {editando ? 'Editar anotação' : 'Nova anotação'}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Hino *</label>
            <input
              value={form.hino}
              onChange={e => setForm({ ...form, hino: e.target.value })}
              placeholder="Nome do hino"
              className={campo}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tom</label>
            <select
              value={form.tom}
              onChange={e => setForm({ ...form, tom: e.target.value })}
              className={campo}
            >
              {TONS.map(t => (
                <option key={t || 'sem'} value={t}>
                  {t || 'Não sei ainda'}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Cantor</label>
            <input
              value={form.cantor}
              onChange={e => setForm({ ...form, cantor: e.target.value })}
              placeholder="Quem canta / de quem é o hino"
              className={campo}
            />
          </div>

          <div className="md:col-span-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
            <textarea
              value={form.observacoes}
              onChange={e => setForm({ ...form, observacoes: e.target.value })}
              rows={3}
              placeholder="Ex.: bom para abertura, ensaiar com o coral, achei no YouTube..."
              className={campo}
            />
          </div>

          <div className="md:col-span-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Letra <span className="font-normal text-gray-400">(opcional)</span>
            </label>
            <textarea
              value={form.letra}
              onChange={e => setForm({ ...form, letra: e.target.value })}
              rows={6}
              placeholder="A letra achada na busca acima aparece aqui. Você também pode colar uma letra."
              className={campo}
            />
          </div>
        </div>

        {aviso && <p className="mt-2 text-sm text-red-600">{aviso}</p>}

        <div className="flex gap-2 mt-4">
          <button
            onClick={salvar}
            disabled={salvando}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            <Plus size={18} />
            {salvando ? 'Salvando...' : editando ? 'Salvar alteração' : 'Adicionar anotação'}
          </button>

          {editando && (
            <button
              onClick={() => {
                setForm(VAZIO);
                setAviso(null);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              <X size={18} /> Cancelar
            </button>
          )}
        </div>
      </div>

      {/* Busca dentro das anotações */}
      {anotacoes.length > 0 && (
        <div className="relative mb-4">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Procurar por hino, cantor, observação ou letra"
            className="w-full border border-gray-300 rounded-lg pl-10 pr-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>
      )}

      {/* Lista */}
      {carregando ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-500">
          Carregando anotações...
        </div>
      ) : filtradas.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-500">
          {anotacoes.length === 0
            ? 'Nenhuma anotação ainda. Busque uma letra acima ou anote a primeira sugestão.'
            : 'Nenhuma anotação encontrada com essa busca.'}
        </div>
      ) : (
        <div className="space-y-3">
          {filtradas.map(anotacao => {
            const jaNosHinos = nomesCadastrados.has(chaveDoNome(anotacao.hino));

            return (
              <div
                key={anotacao.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex items-start gap-3"
              >
                <Music size={20} className="text-indigo-500 mt-1 shrink-0" />

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-bold text-gray-900 break-words">{anotacao.hino}</h4>

                    {jaNosHinos && (
                      <span className="shrink-0 text-[11px] font-semibold px-2 py-1 rounded-lg bg-green-50 text-green-700 border border-green-200">
                        já nos hinos
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-gray-600">
                    {anotacao.cantor && <>👤 {anotacao.cantor}</>}
                    {anotacao.cantor && anotacao.tom && ' • '}
                    {anotacao.tom && <>🎵 Tom {anotacao.tom}</>}
                  </p>

                  {anotacao.observacoes && (
                    <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">
                      {anotacao.observacoes}
                    </p>
                  )}

                  <div className="mt-2 flex flex-wrap gap-2">
                    {anotacao.letra ? (
                      <>
                        <button
                          onClick={() =>
                            setLetraAberta({
                              nome: anotacao.hino,
                              cantor: anotacao.cantor,
                              letra: anotacao.letra || '',
                            })
                          }
                          className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 text-xs font-semibold flex items-center gap-1.5"
                        >
                          <FileText size={14} />
                          Ver letra
                        </button>

                        <button
                          onClick={() => abrirTransferencia(anotacao)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-semibold flex items-center gap-1.5"
                        >
                          <ArrowRightLeft size={14} />
                          Transferir para hinos comuns
                        </button>
                      </>
                    ) : (
                      <span className="px-3 py-1.5 rounded-lg bg-gray-50 text-gray-400 text-xs font-semibold">
                        Sem letra guardada
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-gray-400 mt-2">
                    Anotado em {formatarData(anotacao.criadoEm)}
                  </p>
                </div>

                <div className="flex gap-1">
                  <button
                    onClick={() => editar(anotacao)}
                    title="Editar anotação"
                    className="p-2 text-indigo-600 hover:bg-indigo-50 rounded"
                  >
                    <Pencil size={18} />
                  </button>
                  <button
                    onClick={() => excluir(anotacao)}
                    title="Apagar anotação"
                    className="p-2 text-red-600 hover:bg-red-50 rounded"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-xs text-gray-500 mt-4">
        As anotações ficam salvas na nuvem e aparecem em todos os aparelhos. Sem internet,
        você continua anotando: o sistema envia assim que a conexão voltar.
      </p>

      {/* Modal: letra completa */}
      {letraAberta && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-5 flex items-start justify-between gap-3 rounded-t-2xl">
              <div className="min-w-0">
                <h3 className="text-xl font-bold leading-tight">{letraAberta.nome}</h3>
                <p className="text-indigo-100 text-sm mt-0.5">{letraAberta.cantor}</p>
              </div>
              <button
                onClick={() => setLetraAberta(null)}
                className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition shrink-0"
              >
                <X size={22} />
              </button>
            </div>

            <div className="p-5 overflow-auto">
              <pre className="whitespace-pre-wrap font-sans text-gray-800 leading-relaxed">
                {letraAberta.letra}
              </pre>

              {letraAberta.fonte && (
                <a
                  href={letraAberta.fonte}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:underline"
                >
                  <ExternalLink size={13} />
                  Ver no site de origem
                </a>
              )}
            </div>

            <div className="p-4 border-t border-gray-100 flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => setLetraAberta(null)}
                className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-semibold text-sm"
              >
                Fechar
              </button>

              {letraAberta.musica && (
                <button
                  onClick={() => guardarNasAnotacoes(letraAberta)}
                  disabled={salvando}
                  className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {salvando ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <StickyNote size={16} />
                  )}
                  Guardar nas anotações
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: transferir para hinos comuns */}
      {transferindo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <form
            onSubmit={confirmarTransferencia}
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col"
          >
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-5 flex items-start justify-between gap-3 rounded-t-2xl">
              <div className="min-w-0">
                <h3 className="text-xl font-bold leading-tight">Transferir para hinos comuns</h3>
                <p className="text-emerald-100 text-sm mt-0.5">
                  A anotação continua aqui; o hino passa a aparecer em Cadastrar Hino
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTransferindo(null)}
                className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition shrink-0"
              >
                <X size={22} />
              </button>
            </div>

            <div className="p-5 overflow-auto space-y-3">
              {erroHino && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {erroHino}
                </div>
              )}

              {nomesCadastrados.has(chaveDoNome(formHino.nome)) && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                  Já existe um hino comum com esse nome. Se continuar, vai ficar repetido.
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome do hino *
                </label>
                <input
                  value={formHino.nome}
                  onChange={e => setFormHino({ ...formHino, nome: e.target.value })}
                  className={campo}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tom *</label>
                  <select
                    value={formHino.tom}
                    onChange={e => setFormHino({ ...formHino, tom: e.target.value })}
                    className={campo}
                  >
                    <option value="">Selecione o tom</option>
                    {TONS_HINO.map(t => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                  <select
                    value={formHino.categoria}
                    onChange={e => setFormHino({ ...formHino, categoria: e.target.value })}
                    className={campo}
                  >
                    {CATEGORIAS.map(c => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cantor *</label>
                <select
                  value={formHino.cantor}
                  onChange={e => setFormHino({ ...formHino, cantor: e.target.value })}
                  className={campo}
                >
                  <option value="">Selecione o cantor</option>
                  {cantores.map(nome => (
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Letra</label>
                <textarea
                  value={formHino.letra}
                  onChange={e => setFormHino({ ...formHino, letra: e.target.value })}
                  rows={8}
                  className={campo}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
                <input
                  value={formHino.observacoes}
                  onChange={e => setFormHino({ ...formHino, observacoes: e.target.value })}
                  className={campo}
                />
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => setTransferindo(null)}
                className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-semibold text-sm"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={salvandoHino}
                className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {salvandoHino ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <ArrowRightLeft size={16} />
                )}
                Transferir
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
