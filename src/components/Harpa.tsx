import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Eye, Download, Share2, Upload } from 'lucide-react';
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
import { Hino, HarpaItem, Configuracoes } from '../types';
import { ModalVisualizaLetra } from './ModalVisualizaLetra';
import { ImportCSVModal } from './ImportCSVModal';
import { DeletePasswordModal } from './DeletePasswordModal';

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
  const [showCSVModal, setShowCSVModal] = useState(false);
  const [deletePasswordModal, setDeletePasswordModal] = useState<Hino | null>(null);

  const [formData, setFormData] = useState({
    numeroHarpa: '',
    tom: 'C',
    cantor: '',
    letra: '',
    observacoes: ''
  });

  useEffect(() => {
    loadHinos();
  }, []);

  const loadHinos = async () => {
    const todos = await getHinosByType('harpa');
    setHinos(todos);
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

    if (!formData.numeroHarpa || !formData.cantor) {
      alert('Preencha os campos obrigatórios!');
      return;
    }

    try {
      const agora = new Date().toISOString();

      if (editando) {
        const hinoAtualizado: Hino = {
          ...editando,
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
          nome: searchResult?.nome || `Hino nº ${formData.numeroHarpa}`,
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
        await addHino(novoHino);
      }

      setFormData({
        numeroHarpa: '',
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
      tom: hino.tom,
      cantor: hino.cantor,
      letra: hino.letra,
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
    const message = `Segue o hino da Harpa nº ${hino.numeroHarpa}: *${hino.nome}*\nTom: ${hino.tom}\nCantor: ${hino.cantor}`;
    shareViaWhatsApp(message);
  };

  const hinosFiltrados = hinos.filter(h => {
    if (filtros.numero && h.numeroHarpa?.toString() !== filtros.numero) return false;
    if (filtros.nome && !h.nome.toLowerCase().includes(filtros.nome.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-bold text-gray-900">Hinos da Harpa Cristã</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCSVModal(true)}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
          >
            <Upload size={20} />
            Importar CSV
          </button>
          {!showForm && (
            <button
              onClick={() => {
                setEditando(null);
                setFormData({
                  numeroHarpa: '',
                  tom: 'C',
                  cantor: '',
                  letra: '',
                  observacoes: ''
                });
                setSearchNumber('');
                setSearchResult(null);
                setShowForm(true);
              }}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center gap-2"
            >
              <Plus size={20} />
              Novo Hino
            </button>
          )}
        </div>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          <h3 className="text-xl font-bold text-gray-900 mb-6">
            {editando ? 'Editar Hino da Harpa' : 'Cadastrar Hino da Harpa'}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Número, Tom, Cantor - Responsivo */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 lg:gap-2">
              <div className="lg:col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">📖 Número da Harpa *</label>
                <div className="flex gap-1">
                  <input
                    type="number"
                    value={formData.numeroHarpa}
                    onChange={(e) => setFormData({ ...formData, numeroHarpa: e.target.value })}
                    onBlur={(e) => handleBuscarPorNumero(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-600 text-sm"
                    placeholder="Ex: 100"
                  />
                  <button
                    type="button"
                    onClick={() => handleBuscarPorNumero(formData.numeroHarpa)}
                    className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm font-medium"
                  >
                    Buscar
                  </button>
                </div>
                {searchResult && (
                  <p className="text-green-600 text-xs mt-1">✓ {searchResult.nome}</p>
                )}
              </div>

              <div className="lg:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">🎼 Tom</label>
                <select
                  value={formData.tom}
                  onChange={(e) => setFormData({ ...formData, tom: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-600 text-sm"
                >
                  {TONS.map(tom => (
                    <option key={tom} value={tom}>{tom}</option>
                  ))}
                </select>
              </div>

              <div className="lg:col-span-7">
                <label className="block text-sm font-medium text-gray-700 mb-1">👤 Cantor *</label>
                <input
                  type="text"
                  value={formData.cantor}
                  onChange={(e) => setFormData({ ...formData, cantor: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-600 text-sm"
                  placeholder="Nome de quem vai cantar"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Letra do Hino</label>
              <textarea
                value={formData.letra}
                onChange={(e) => setFormData({ ...formData, letra: e.target.value })}
                rows={8}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-600"
                placeholder="Letra do hino (opcional)"
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pesquisar por número</label>
            <input
              type="number"
              placeholder="Digite o número..."
              value={filtros.numero}
              onChange={(e) => setFiltros({ ...filtros, numero: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-600"
            />
          </div>

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
        </div>
      </div>

      {/* Lista de Hinos */}
      <div className="space-y-2">
        {hinosFiltrados.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg">
            <p className="text-gray-500 text-lg">Nenhum hino da Harpa cadastrado</p>
          </div>
        ) : (
          hinosFiltrados.map(hino => (
            <div key={hino.id} className="bg-white p-3 rounded-lg shadow-sm border-l-4 border-indigo-600">
              <h3 className="text-lg font-bold text-gray-900 mb-2 md:mb-0">
                Harpa nº {hino.numeroHarpa} - {hino.nome}
              </h3>
              
              {/* Linha com informações e botões - Desktop em 1 linha, Mobile em 2 */}
              <div className="md:flex md:items-center md:justify-between md:gap-4">
                <div className="text-sm text-gray-600 mt-2 md:mt-0">
                  <p>🎵 <span className="font-medium">{hino.tom}</span> • 👤 <span className="font-medium">{hino.cantor}</span></p>
                </div>
                
                {/* Botões Mobile */}
                <div className="md:hidden flex gap-2 mt-3">
                  {hino.letra && (
                    <button
                      onClick={() => setModalLetra(hino)}
                      className="p-1.5 bg-blue-100 text-blue-600 rounded hover:bg-blue-200 transition flex justify-center text-sm flex-1"
                      title="Ver letra"
                    >
                      👁️
                    </button>
                  )}
                  <button
                    onClick={() => handleGerarPdf(hino)}
                    className="p-1.5 bg-green-100 text-green-600 rounded hover:bg-green-200 transition flex justify-center text-sm flex-1"
                    title="Baixar PDF"
                  >
                    📥
                  </button>
                  <button
                    onClick={() => handleCompartilharWhatsApp(hino)}
                    className="p-1.5 bg-cyan-100 text-cyan-600 rounded hover:bg-cyan-200 transition flex justify-center text-sm flex-1"
                    title="Compartilhar"
                  >
                    📤
                  </button>
                  <button
                    onClick={() => handleEditar(hino)}
                    className="p-1.5 bg-yellow-100 text-yellow-600 rounded hover:bg-yellow-200 transition flex justify-center text-sm flex-1"
                    title="Editar"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDeletar(hino)}
                    className="p-1.5 bg-red-100 text-red-600 rounded hover:bg-red-200 transition flex justify-center text-sm flex-1"
                    title="Deletar"
                  >
                    🗑️
                  </button>
                </div>
                
                {/* Botões Desktop - Na mesma linha */}
                <div className="hidden md:flex md:gap-2">
                  {hino.letra && (
                    <button
                      onClick={() => setModalLetra(hino)}
                      className="p-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200 transition flex justify-center text-base"
                      title="Ver letra"
                    >
                      👁️
                    </button>
                  )}
                  <button
                    onClick={() => handleGerarPdf(hino)}
                    className="p-1 bg-green-100 text-green-600 rounded hover:bg-green-200 transition flex justify-center text-base"
                    title="Baixar PDF"
                  >
                    📥
                  </button>
                  <button
                    onClick={() => handleCompartilharWhatsApp(hino)}
                    className="p-1 bg-cyan-100 text-cyan-600 rounded hover:bg-cyan-200 transition flex justify-center text-base"
                    title="Compartilhar"
                  >
                    📤
                  </button>
                  <button
                    onClick={() => handleEditar(hino)}
                    className="p-1 bg-yellow-100 text-yellow-600 rounded hover:bg-yellow-200 transition flex justify-center text-base"
                    title="Editar"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDeletar(hino)}
                    className="p-1 bg-red-100 text-red-600 rounded hover:bg-red-200 transition flex justify-center text-base"
                    title="Deletar"
                  >
                    🗑️
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

      {showCSVModal && (
        <ImportCSVModal
          onClose={() => setShowCSVModal(false)}
          onImportSuccess={() => {
            setShowCSVModal(false);
            loadHinos();
          }}
          tipoHino="harpa"
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
