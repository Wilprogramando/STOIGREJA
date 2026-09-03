import React, { useState, useEffect } from 'react';
import {
  Plus,
  Music,
  Music2,
  Eye,
  Pencil,
  Trash2,
  Download,
  Share2,
  Copy,
  MoreHorizontal,
  Search,
  Check,
  X,
  Music4,
  Mic2,
  Users
} from 'lucide-react';
import { addHino, updateHino, deleteHino, getAllHinos } from '../services/db';
import { generateHinoPdf, shareViaWhatsApp } from '../services/pdf';
import { Hino, Configuracoes } from '../types';
import { ModalVisualizaLetra } from './ModalVisualizaLetra';
import { lerCantores, sincronizarCantoresDosHinos } from '../services/cantores';
import { DeletePasswordModal } from './DeletePasswordModal';

interface CadastrarHinoProps {
  configuracoes: Configuracoes | null;
}

const TONS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const CATEGORIAS = ['Alfa', 'Manancial', 'Louvor', 'Consagração', 'Outro'];

export const CadastrarHino: React.FC<CadastrarHinoProps> = ({ configuracoes }) => {
  const [hinos, setHinos] = useState<Hino[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState<Hino | null>(null);
  const [filtros, setFiltros] = useState({ tom: '', cantor: '', nome: '' });
  const [cantores, setCantores] = useState<string[]>(() => lerCantores());
  const [modalLetra, setModalLetra] = useState<Hino | null>(null);
  const [deletePasswordModal, setDeletePasswordModal] = useState<Hino | null>(null);
  /** Qual hino está com as ações extras abertas (PDF, compartilhar, duplicar). */
  const [acoesAbertas, setAcoesAbertas] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    nome: '',
    tom: 'C',
    cantor: '',
    letra: '',
    categoria: 'Manancial',
    observacoes: ''
  });

  useEffect(() => {
    loadHinos();
    // Mantém a lista de cantores em dia com o gerenciador das Configurações.
    sincronizarCantoresDosHinos().then(setCantores);
  }, []);

  const loadHinos = async () => {
    const todos = await getAllHinos();
    setHinos(todos.filter(h => h.tipo === 'comum'));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nome || !formData.cantor) {
      alert('Preencha os campos obrigatórios: Nome e Cantor!');
      return;
    }

    try {
      const agora = new Date().toISOString();

      if (editando) {
        const hinoAtualizado: Hino = {
          ...editando,
          ...formData,
          atualizadoEm: agora
        };
        await updateHino(hinoAtualizado);
      } else {
        const novoHino: Hino = {
          id: Date.now().toString(),
          ...formData,
          tipo: 'comum',
          criadoEm: agora,
          atualizadoEm: agora
        };
        await addHino(novoHino);
      }

      setFormData({
        nome: '',
        tom: 'C',
        cantor: '',
        letra: '',
        categoria: 'Manancial',
        observacoes: ''
      });
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
      nome: hino.nome,
      tom: hino.tom,
      cantor: hino.cantor,
      letra: hino.letra,
      categoria: hino.categoria,
      observacoes: hino.observacoes || ''
    });
    setEditando(hino);
    setShowForm(true);
    window.scrollTo(0, 0);
  };

  const handleDuplicar = (hino: Hino) => {
    setFormData({
      nome: hino.nome + ' (Cópia)',
      tom: hino.tom,
      cantor: hino.cantor,
      letra: hino.letra,
      categoria: hino.categoria,
      observacoes: hino.observacoes || ''
    });
    setEditando(null);
    setShowForm(true);
    window.scrollTo(0, 0);
  };

  const handleDeletar = async (id: string) => {
    try {
      await deleteHino(id);
      loadHinos();
      setDeletePasswordModal(null);
    } catch (error) {
      console.error('Erro ao deletar hino:', error);
      alert('Erro ao deletar hino');
    }
  };

  const hinosFiltrados = hinos.filter(hino => {
    const nomeMatch = hino.nome.toLowerCase().includes(filtros.nome.toLowerCase());
    const tomMatch = !filtros.tom || hino.tom === filtros.tom;
    const cantorMatch = hino.cantor.toLowerCase().includes(filtros.cantor.toLowerCase());
    return nomeMatch && tomMatch && cantorMatch;
  });

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
      <div className="flex items-start gap-3 mb-5">
        <div className="bg-indigo-50 text-indigo-600 p-2.5 rounded-xl shrink-0">
          <Music2 size={22} />
        </div>
        <div className="min-w-0">
          <h2 className="text-2xl font-bold text-gray-900">Cadastrar Hino</h2>
          <p className="text-sm text-gray-500">
            {hinos.length} hino(s) cadastrado(s)
          </p>
        </div>
      </div>

      {/* Botão Novo Hino */}
      {!showForm && (
        <button
          onClick={() => {
            setEditando(null);
            setFormData({
              nome: '',
              tom: 'C',
              cantor: '',
              letra: '',
              categoria: 'Manancial',
              observacoes: ''
            });
            setShowForm(true);
          }}
          className="w-full mb-5 px-4 py-3.5 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition font-semibold flex items-center justify-center gap-2 shadow-lg"
        >
          <Plus size={20} />
          Novo Hino
        </button>
      )}

      {/* Formulário */}
      {showForm && (
        <Painel className="p-4 sm:p-6 mb-5">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            {editando ? 'Editar Hino' : 'Novo Hino'}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Nome do hino *
              </label>
              <input
                type="text"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                className={campo}
                placeholder="Ex: Poderoso Deus"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Tom</label>
                <select
                  value={formData.tom}
                  onChange={(e) => setFormData({ ...formData, tom: e.target.value })}
                  className={campo}
                >
                  {TONS.map(ton => (
                    <option key={ton} value={ton}>{ton}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Categoria</label>
                <select
                  value={formData.categoria}
                  onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                  className={campo}
                >
                  {CATEGORIAS.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Cantor *</label>
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Letra</label>
              <textarea
                value={formData.letra}
                onChange={(e) => setFormData({ ...formData, letra: e.target.value })}
                rows={6}
                className={campo}
                placeholder="Letra do hino (opcional)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Observações</label>
              <textarea
                value={formData.observacoes}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                rows={2}
                className={campo}
                placeholder="Observações (opcional)"
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
        <div className="relative mb-3">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
          <input
            type="text"
            placeholder="Pesquisar hino..."
            value={filtros.nome}
            onChange={(e) => setFiltros({ ...filtros, nome: e.target.value })}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center pointer-events-none">
              <Music4 size={16} />
            </span>
            <select
              value={filtros.tom}
              onChange={(e) => setFiltros({ ...filtros, tom: e.target.value })}
              className={`${campo} pl-12`}
            >
              <option value="">Todos os tons</option>
              {TONS.map(ton => (
                <option key={ton} value={ton}>{ton}</option>
              ))}
            </select>
          </div>

          <div className="relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center pointer-events-none">
              <Mic2 size={16} />
            </span>
            <input
              type="text"
              placeholder="Cantor..."
              value={filtros.cantor}
              onChange={(e) => setFiltros({ ...filtros, cantor: e.target.value })}
              className={`${campo} pl-12`}
            />
          </div>
        </div>
      </Painel>

      {/* Lista de hinos */}
      <div className="space-y-3">
        {hinosFiltrados.length === 0 ? (
          <Painel className="text-center py-12">
            <Music className="mx-auto text-gray-300 mb-3" size={40} />
            <p className="text-gray-500">Nenhum hino encontrado</p>
          </Painel>
        ) : (
          hinosFiltrados.map(hino => {
            const aberto = acoesAbertas === hino.id;

            return (
              <Painel key={hino.id} className="p-3 sm:p-4 border-l-4 border-l-indigo-500">
                <div className="flex items-center gap-3">
                  <div className="shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Music2 size={26} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 break-words text-base sm:text-lg leading-tight">
                      {hino.nome}
                    </h3>

                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                        {hino.tom}
                      </span>
                      <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-gray-700">
                        {hino.cantor}
                      </span>
                    </div>

                    <p className="flex items-center gap-1.5 text-xs text-gray-500 mt-1.5">
                      <Users size={14} className="shrink-0" />
                      {hino.categoria}
                    </p>
                  </div>

                  {/* Ações principais */}
                  <div className="shrink-0 flex gap-1">
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
                      titulo="Apagar"
                      cor="bg-red-50 text-red-600 hover:bg-red-100"
                      onClick={() => setDeletePasswordModal(hino)}
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

                {/* Ações extras */}
                {aberto && (
                  <div className="mt-3 pt-3 border-t border-gray-100 flex gap-2">
                    <AcaoExtra
                      icon={Download}
                      texto="PDF"
                      cor="bg-orange-50 text-orange-700 hover:bg-orange-100"
                      onClick={() => generateHinoPdf(hino, configuracoes)}
                    />
                    <AcaoExtra
                      icon={Share2}
                      texto="Compartilhar"
                      cor="bg-green-50 text-green-700 hover:bg-green-100"
                      onClick={() =>
                        shareViaWhatsApp(
                          `Confira o hino: ${hino.nome} (Tom: ${hino.tom}, Cantor: ${hino.cantor})`
                        )
                      }
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

      {/* Modals */}
      {modalLetra && (
        <ModalVisualizaLetra
          hino={modalLetra}
          onClose={() => setModalLetra(null)}
        />
      )}

      {deletePasswordModal && (
        <DeletePasswordModal
          hinoNome={deletePasswordModal.nome}
          onConfirm={() => handleDeletar(deletePasswordModal.id)}
          onCancel={() => setDeletePasswordModal(null)}
        />
      )}
    </div>
  );
};
