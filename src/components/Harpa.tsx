import React, { useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  Eye,
  Download,
  Share2,
  Star,
  BookOpen,
  Pencil,
  Copy,
  MoreHorizontal,
  Search,
  Check,
  X
} from 'lucide-react';
import {
  getHinosByType,
  addHino,
  updateHino,
  deleteHino,
  getHarpaByNumber,
  getAllHarpa,
  addHarpaItems
} from '../services/db';
import { generateHinoPdf, shareViaWhatsApp } from '../services/pdf';
import { carregarFavoritosSupabase, adicionarFavoritoSupabase, removerFavoritoSupabase } from '../services/supabase';
import { Hino, HarpaItem, Configuracoes } from '../types';
import { ModalVisualizaLetra } from './ModalVisualizaLetra';
import { lerCantores, sincronizarCantoresDosHinos } from '../services/cantores';
import { DeletePasswordModal } from './DeletePasswordModal';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// ID padrão para usuários não autenticados
const USUARIO_ANONIMO_ID = 'anonimo-user';

interface HarpaProps {
  configuracoes: Configuracoes | null;
}

const TONS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export const Harpa: React.FC<HarpaProps> = ({ configuracoes }) => {
  const [hinos, setHinos] = useState<Hino[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState<Hino | null>(null);
  const [filtros, setFiltros] = useState({ numero: '', nome: '' });
  const [modalLetra, setModalLetra] = useState<Hino | null>(null);
  const [searchNumber, setSearchNumber] = useState('');
  const [searchResult, setSearchResult] = useState<HarpaItem | null>(null);
  const [deletePasswordModal, setDeletePasswordModal] = useState<Hino | null>(null);
  const [favoritos, setFavoritos] = useState<Set<string>>(new Set());
  const [usuarioId, setUsuarioId] = useState<string>(USUARIO_ANONIMO_ID);
  /** Hino com as ações extras abertas (PDF, compartilhar, duplicar). */
  const [acoesAbertas, setAcoesAbertas] = useState<string | null>(null);

  const [cantores, setCantores] = useState<string[]>(() => lerCantores());
  const [formData, setFormData] = useState({
    numeroHarpa: '',
    nome: '',
    tom: 'C',
    cantor: '',
    letra: '',
    observacoes: ''
  });

  useEffect(() => {
    loadHinos();
    carregarFavoritos();
    // Mantém a lista de cantores em dia com o gerenciador das Configurações.
    sincronizarCantoresDosHinos().then(setCantores);
  }, []);

  const loadHinos = async () => {
    const todos = await getHinosByType('harpa');
    console.log('📚 Hinos carregados:', todos.map(h => ({
      nome: h.nome,
      numeroHarpa: h.numeroHarpa
    })));
    todos.sort((a, b) => (a.numeroHarpa || 0) - (b.numeroHarpa || 0));
    setHinos(todos);
  };

  const carregarFavoritos = async () => {
    try {
      // Tenta carregar usuário autenticado
      const { data: { user }, error } = await supabase.auth.getUser();
      
      let idParaCarregar = USUARIO_ANONIMO_ID;
      
      if (user && !error) {
        idParaCarregar = user.id;
        setUsuarioId(user.id);
        console.log('✅ Usuário autenticado:', user.id);
      } else {
        setUsuarioId(USUARIO_ANONIMO_ID);
        console.log('ℹ️ Usando usuário anônimo');
      }

      // Carrega favoritos do Supabase com o ID (autenticado ou anônimo)
      const favoritosIds = await carregarFavoritosSupabase(idParaCarregar);
      setFavoritos(new Set(favoritosIds));
      console.log('✅ Favoritos carregados:', favoritosIds.length);
    } catch (error) {
      console.error('❌ Erro ao carregar favoritos:', error);
    }
  };

  const toggleFavorito = async (hinoId: string) => {
    try {
      const novosFavoritos = new Set(favoritos);
      const isFavoritado = novosFavoritos.has(hinoId);

      if (isFavoritado) {
        novosFavoritos.delete(hinoId);
        console.log('❌ Removendo favorito:', hinoId);
      } else {
        novosFavoritos.add(hinoId);
        console.log('⭐ Adicionando favorito:', hinoId);
      }
      
      setFavoritos(novosFavoritos);
      
      // Salva no Supabase com o usuarioId (autenticado ou anônimo)
      console.log('📤 Salvando no Supabase com usuário:', usuarioId);
      if (isFavoritado) {
        const sucesso = await removerFavoritoSupabase(usuarioId, hinoId);
        if (!sucesso) {
          console.error('❌ Erro ao remover do Supabase');
          novosFavoritos.add(hinoId);
          setFavoritos(novosFavoritos);
        }
      } else {
        const sucesso = await adicionarFavoritoSupabase(usuarioId, hinoId);
        if (!sucesso) {
          console.error('❌ Erro ao adicionar ao Supabase');
          novosFavoritos.delete(hinoId);
          setFavoritos(novosFavoritos);
        }
      }
    } catch (error) {
      console.error('❌ Erro ao processar favorito:', error);
    }
  };

  const handleBuscarPorNumero = async (numero: string) => {
    setSearchNumber(numero);
    if (numero.trim()) {
      const result = await getHarpaByNumber(parseInt(numero));
      setSearchResult(result || null);
      if (result) {
        setFormData(prev => ({ ...prev, numeroHarpa: numero }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.numeroHarpa || !formData.nome.trim()) {
      alert('Preencha o Número e Nome do Hino!');
      return;
    }

    try {
      const agora = new Date().toISOString();

      if (editando) {
        const hinoAtualizado: Hino = {
          ...editando,
          nome: formData.nome.trim(),
          numeroHarpa: parseInt(formData.numeroHarpa),
          tom: formData.tom,
          cantor: formData.cantor,
          letra: formData.letra,
          observacoes: formData.observacoes,
          atualizadoEm: agora
        };
        await updateHino(hinoAtualizado);
      } else {
        const novoHino: Hino = {
          id: Date.now().toString(),
          nome: formData.nome.trim(),
          numeroHarpa: parseInt(formData.numeroHarpa),
          tom: formData.tom,
          cantor: formData.cantor,
          letra: formData.letra,
          categoria: 'Harpa',
          observacoes: formData.observacoes,
          tipo: 'harpa',
          criadoEm: agora,
          atualizadoEm: agora
        };
        console.log('📝 Salvando hino:', {
          nome: novoHino.nome,
          numeroHarpa: novoHino.numeroHarpa,
          tipo: typeof novoHino.numeroHarpa
        });
        await addHino(novoHino);
      }

      setFormData({
        numeroHarpa: '',
        nome: '',
        tom: 'C',
        cantor: '',
        letra: '',
        observacoes: ''
      });
      setSearchNumber('');
      setSearchResult(null);
      setEditando(null);
      setShowForm(false);
      loadHinos();
    } catch (error) {
      console.error('Erro ao salvar hino:', error);
      alert('Erro ao salvar hino');
    }
  };

  const handleEditar = (hino: Hino) => {
    setFormData({
      numeroHarpa: hino.numeroHarpa?.toString() || '',
      nome: hino.nome,
      tom: hino.tom,
      cantor: hino.cantor,
      letra: hino.letra,
      observacoes: hino.observacoes || ''
    });
    setEditando(hino);
    setShowForm(true);
  };

  const handleDuplicar = (hino: Hino) => {
    setFormData({
      numeroHarpa: '',
      nome: hino.nome + ' (Cópia)',
      tom: hino.tom,
      cantor: hino.cantor + ' (Cópia)',
      letra: hino.letra,
      observacoes: hino.observacoes || ''
    });
    setEditando(null);
    setShowForm(true);
  };

  const handleDeletar = (hino: Hino) => {
    setDeletePasswordModal(hino);
  };

  const handleConfirmDelete = async (password: string) => {
    if (!deletePasswordModal) return;

    try {
      await deleteHino(deletePasswordModal.id);
      setDeletePasswordModal(null);
      loadHinos();
    } catch (error) {
      console.error('Erro ao deletar hino:', error);
      alert('Erro ao deletar hino');
    }
  };

  const handleGerarPdf = async (hino: Hino) => {
    try {
      await generateHinoPdf(hino, configuracoes, configuracoes?.logo);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Erro ao gerar PDF');
    }
  };

  const handleCompartilharWhatsApp = (hino: Hino) => {
    const message = `Segue o hino da Harpa nº ${hino.numeroHarpa}: *${hino.nome}*\nTom: ${hino.tom}\nCantor: ${hino.cantor}`;
    shareViaWhatsApp(message);
  };

  const hinosFiltrados = hinos.filter(h => {
    if (filtros.numero && h.numeroHarpa?.toString() !== filtros.numero) return false;
    if (filtros.nome && !h.nome.toLowerCase().includes(filtros.nome.toLowerCase())) return false;
    return true;
  });

  const hinosFavoritos = hinosFiltrados.filter(h => favoritos.has(h.id));
  const hinosNaoFavoritos = hinosFiltrados.filter(h => !favoritos.has(h.id));
  const hinosOrdenados = [...hinosFavoritos, ...hinosNaoFavoritos];

  /** Card branco padrão da tela. */
  const Painel: React.FC<{ children: React.ReactNode; className?: string }> = ({
    children,
    className = ''
  }) => (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-lg ${className}`}>
      {children}
    </div>
  );

  const campo =
    'w-full px-3.5 py-2.5 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition text-sm';

  /** Botão redondo de ação do hino. */
  const BotaoAcao = ({ icon: Icon, titulo, cor, onClick }: any) => (
    <button onClick={onClick} title={titulo} className={`p-2 rounded-xl transition ${cor}`}>
      <Icon size={17} />
    </button>
  );

  /** Botão das ações extras, com nome ao lado. */
  const AcaoExtra = ({ icon: Icon, texto, cor, onClick }: any) => (
    <button
      onClick={onClick}
      className={`flex-1 px-3 py-2 rounded-xl transition text-xs font-semibold flex items-center justify-center gap-1.5 ${cor}`}
    >
      <Icon size={15} />
      {texto}
    </button>
  );

  return (
    <div className="max-w-4xl mx-auto pb-20">
      {/* Cabeçalho */}
      <div className="flex items-center gap-3 mb-5">
        <div className="bg-indigo-50 text-indigo-600 p-2.5 rounded-xl shrink-0">
          <BookOpen size={22} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 whitespace-nowrap">
            Harpa Cristã
          </h2>
          <p className="text-sm text-gray-500">{hinos.length} hino(s) cadastrado(s)</p>
        </div>
      </div>

      {/* Botão do topo */}
      <div className="mb-5">
        {!showForm && (
          <button
            onClick={() => {
              setEditando(null);
              setFormData({
                numeroHarpa: '',
                nome: '',
                tom: 'C',
                cantor: '',
                letra: '',
                observacoes: ''
              });
              setSearchNumber('');
              setSearchResult(null);
              setShowForm(true);
            }}
            className="w-full px-4 py-3.5 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition font-semibold flex items-center justify-center gap-2 shadow-lg"
          >
            <Plus size={20} />
            Novo Hino
          </button>
        )}
      </div>

      {/* Formulário */}
      {showForm && (
        <Painel className="p-4 sm:p-6 mb-5">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            {editando ? 'Editar Hino da Harpa' : 'Cadastrar Hino da Harpa'}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Número da Harpa *
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={formData.numeroHarpa}
                    onChange={(e) => setFormData({ ...formData, numeroHarpa: e.target.value })}
                    onBlur={(e) => handleBuscarPorNumero(e.target.value)}
                    className={campo}
                    placeholder="Ex: 100"
                  />
                  <button
                    type="button"
                    onClick={() => handleBuscarPorNumero(formData.numeroHarpa)}
                    className="shrink-0 px-3 py-2 bg-indigo-50 text-indigo-700 rounded-xl hover:bg-indigo-100 transition text-sm font-semibold"
                  >
                    Buscar
                  </button>
                </div>
                {searchResult && (
                  <p className="text-green-600 text-xs mt-1.5">✓ {searchResult.nome}</p>
                )}
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Nome do Hino *
                </label>
                <input
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className={campo}
                  placeholder="Nome do hino"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Tom</label>
                <select
                  value={formData.tom}
                  onChange={(e) => setFormData({ ...formData, tom: e.target.value })}
                  className={campo}
                >
                  {TONS.map(tom => (
                    <option key={tom} value={tom}>{tom}</option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Cantor</label>
                {/* Cantores vêm do gerenciador em Configurações */}
                <select
                  value={formData.cantor}
                  onChange={(e) => setFormData({ ...formData, cantor: e.target.value })}
                  className={campo}
                >
                  <option value="">Selecione o cantor</option>
                  {formData.cantor && !cantores.includes(formData.cantor) && (
                    <option value={formData.cantor}>{formData.cantor}</option>
                  )}
                  {cantores.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Letra do Hino</label>
              <textarea
                value={formData.letra}
                onChange={(e) => setFormData({ ...formData, letra: e.target.value })}
                rows={8}
                className={campo}
                placeholder="Letra do hino (opcional)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Observações</label>
              <textarea
                value={formData.observacoes}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                rows={3}
                className={campo}
                placeholder="Observações opcionais"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="submit"
                className="px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-semibold text-sm flex items-center justify-center gap-2 shadow-md"
              >
                <Check size={18} />
                {editando ? 'Atualizar' : 'Salvar'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditando(null);
                }}
                className="px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition font-semibold text-sm flex items-center justify-center gap-2"
              >
                <X size={18} />
                Cancelar
              </button>
            </div>
          </form>
        </Painel>
      )}

      {/* Filtros */}
      <Painel className="p-3 sm:p-4 mb-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center pointer-events-none text-xs font-bold">
              nº
            </span>
            <input
              type="number"
              placeholder="Número..."
              value={filtros.numero}
              onChange={(e) => setFiltros({ ...filtros, numero: e.target.value })}
              className={`${campo} pl-12`}
            />
          </div>

          <div className="relative sm:col-span-2">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
            <input
              type="text"
              placeholder="Pesquisar pelo nome do hino..."
              value={filtros.nome}
              onChange={(e) => setFiltros({ ...filtros, nome: e.target.value })}
              className={`${campo} pl-10`}
            />
          </div>
        </div>
      </Painel>

      {/* Lista de hinos */}
      <div className="space-y-3">
        {hinosOrdenados.length === 0 ? (
          <Painel className="text-center py-12">
            <BookOpen className="mx-auto text-gray-300 mb-3" size={40} />
            <p className="text-gray-500">Nenhum hino da Harpa encontrado</p>
          </Painel>
        ) : (
          hinosOrdenados.map(hino => {
            const favorito = favoritos.has(hino.id);
            const aberto = acoesAbertas === hino.id;

            return (
              <Painel
                key={hino.id}
                className={`p-3 sm:p-4 border-l-4 ${
                  favorito ? 'border-l-amber-400' : 'border-l-indigo-500'
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Número da Harpa */}
                  <div
                    className={`shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex flex-col items-center justify-center leading-none ${
                      favorito ? 'bg-amber-50 text-amber-700' : 'bg-indigo-50 text-indigo-700'
                    }`}
                  >
                    <span className="text-[10px] font-semibold opacity-70">Harpa</span>
                    <span className="text-lg sm:text-xl font-extrabold tabular-nums">
                      {hino.numeroHarpa !== undefined ? hino.numeroHarpa : '?'}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 break-words text-base sm:text-lg leading-tight">
                      {hino.nome}
                    </h3>

                    <div className="flex items-end justify-between gap-3 mt-1.5">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                            {hino.tom}
                          </span>
                          {hino.cantor && (
                            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-gray-700">
                              {hino.cantor}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Ações principais */}
                      <div className="shrink-0 flex gap-1">
                        <button
                          onClick={() => toggleFavorito(hino.id)}
                          title={favorito ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                          className="p-2 rounded-xl hover:bg-gray-100 transition"
                        >
                          <Star
                            size={17}
                            className={favorito ? 'fill-amber-400 text-amber-400' : 'text-gray-400'}
                          />
                        </button>
                        <BotaoAcao
                          icon={Eye}
                          titulo="Ver letra"
                          cor="bg-blue-50 text-blue-600 hover:bg-blue-100"
                          onClick={() => setModalLetra(hino)}
                        />
                        <BotaoAcao
                          icon={Pencil}
                          titulo="Editar"
                          cor="bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
                          onClick={() => handleEditar(hino)}
                        />
                        <BotaoAcao
                          icon={Trash2}
                          titulo="Excluir"
                          cor="bg-red-50 text-red-600 hover:bg-red-100"
                          onClick={() => handleDeletar(hino)}
                        />
                        <BotaoAcao
                          icon={MoreHorizontal}
                          titulo="Mais opções"
                          cor={
                            aberto
                              ? 'bg-gray-700 text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }
                          onClick={() => setAcoesAbertas(aberto ? null : hino.id)}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Ações extras */}
                {aberto && (
                  <div className="mt-3 pt-3 border-t border-gray-100 flex gap-2">
                    <AcaoExtra
                      icon={Download}
                      texto="PDF"
                      cor="bg-orange-50 text-orange-700 hover:bg-orange-100"
                      onClick={() => handleGerarPdf(hino)}
                    />
                    <AcaoExtra
                      icon={Share2}
                      texto="Compartilhar"
                      cor="bg-green-50 text-green-700 hover:bg-green-100"
                      onClick={() => handleCompartilharWhatsApp(hino)}
                    />
                    <AcaoExtra
                      icon={Copy}
                      texto="Duplicar"
                      cor="bg-purple-50 text-purple-700 hover:bg-purple-100"
                      onClick={() => handleDuplicar(hino)}
                    />
                  </div>
                )}
              </Painel>
            );
          })
        )}
      </div>

      {modalLetra && (
        <ModalVisualizaLetra
          hino={modalLetra}
          onClose={() => setModalLetra(null)}
        />
      )}

      {deletePasswordModal && (
        <DeletePasswordModal
          hinoNome={deletePasswordModal.nome}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeletePasswordModal(null)}
        />
      )}
    </div>
  );
};
