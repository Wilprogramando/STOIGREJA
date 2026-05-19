import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Eye, Download, Share2, Search } from 'lucide-react';
import { addHino, updateHino, deleteHino, getAllHinos } from '../services/db';
import { generateHinoPdf, shareViaWhatsApp } from '../services/pdf';
import { Hino, Configuracoes } from '../types';
import { ModalVisualizaLetra } from './ModalVisualizaLetra';
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
  const [modalLetra, setModalLetra] = useState<Hino | null>(null);
  const [deletePasswordModal, setDeletePasswordModal] = useState<Hino | null>(null);

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
    const message = `Segue o hino: *${hino.nome}*\nTom: ${hino.tom}\nCantor: ${hino.cantor}\n\n${hino.letra}`;
    shareViaWhatsApp(message);
  };

  const hinosFiltrados = hinos.filter(h => {
    if (filtros.tom && h.tom !== filtros.tom) return false;
    if (filtros.cantor && !h.cantor.toLowerCase().includes(filtros.cantor.toLowerCase())) return false;
    if (filtros.nome && !h.nome.toLowerCase().includes(filtros.nome.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-bold text-gray-900">Cadastrar Hino</h2>
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
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center gap-2"
          >
            <Plus size={20} />
            Novo Hino
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          <h3 className="text-xl font-bold text-gray-900 mb-6">
            {editando ? 'Editar Hino' : 'Novo Hino'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Hino *</label>
                <input
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-600"
                  placeholder="Digite o nome do hino"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tom *</label>
                <select
                  value={formData.tom}
                  onChange={(e) => setFormData({ ...formData, tom: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-600"
                >
                  {TONS.map(tom => (
                    <option key={tom} value={tom}>{tom}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cantor *</label>
                <input
                  type="text"
                  value={formData.cantor}
                  onChange={(e) => setFormData({ ...formData, cantor: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-600"
                  placeholder="Nome de quem vai cantar"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                <select
                  value={formData.categoria}
                  onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-600"
                >
                  {CATEGORIAS.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Letra do Hino</label>
              <textarea
                value={formData.letra}
                onChange={(e) => setFormData({ ...formData, letra: e.target.value })}
                rows={8}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-600"
                placeholder="Digite a letra completa do hino (opcional)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
              <textarea
                value={formData.observacoes}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-600"
                placeholder="Observações opcionais"
              />
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
              >
                {editando ? 'Atualizar Hino' : 'Salvar Hino'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditando(null);
                }}
                className="px-6 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500 transition"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg shadow-md mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pesquisar por nome</label>
            <input
              type="text"
              placeholder="Digite o nome do hino..."
              value={filtros.nome}
              onChange={(e) => setFiltros({ ...filtros, nome: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Filtrar por tom</label>
            <select
              value={filtros.tom}
              onChange={(e) => setFiltros({ ...filtros, tom: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-600"
            >
              <option value="">Todos os tons</option>
              {TONS.map(tom => (
                <option key={tom} value={tom}>{tom}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Filtrar por cantor</label>
            <input
              type="text"
              placeholder="Nome do cantor..."
              value={filtros.cantor}
              onChange={(e) => setFiltros({ ...filtros, cantor: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-600"
            />
          </div>
        </div>
      </div>

      {/* Lista de Hinos */}
      <div className="space-y-4">
        {hinosFiltrados.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg">
            <Music className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-500 text-lg">Nenhum hino cadastrado</p>
          </div>
        ) : (
          hinosFiltrados.map(hino => (
            <div key={hino.id} className="bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900">{hino.nome}</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 text-sm text-gray-600">
                    <p>🎵 Tom: <span className="font-medium">{hino.tom}</span></p>
                    <p>👤 Cantor: <span className="font-medium">{hino.cantor}</span></p>
                    <p>📂 Categoria: <span className="font-medium">{hino.categoria}</span></p>
                  </div>
                </div>
                
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => setModalLetra(hino)}
                    title="Visualizar letra"
                    className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition"
                  >
                    <Eye size={20} />
                  </button>
                  <button
                    onClick={() => handleGerarPdf(hino)}
                    title="Baixar PDF"
                    className="p-2 bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-100 transition"
                  >
                    <Download size={20} />
                  </button>
                  <button
                    onClick={() => handleCompartilharWhatsApp(hino)}
                    title="Compartilhar no WhatsApp"
                    className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition"
                  >
                    <Share2 size={20} />
                  </button>
                  <button
                    onClick={() => handleEditar(hino)}
                    title="Editar"
                    className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition"
                  >
                    <Edit size={20} />
                  </button>
                  <button
                    onClick={() => handleDeletar(hino)}
                    title="Deletar"
                    className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            </div>
          ))
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

const Music = Eye; // Placeholder icon
