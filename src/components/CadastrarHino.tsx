import React, { useState, useEffect } from 'react';
import { Plus, Music } from 'lucide-react';
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

  return (
    <div className="p-4 pb-20">
      {/* Botão Novo Hino */}
      <div className="mb-4 flex gap-2">
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
            className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium flex items-center justify-center gap-2"
          >
            <Plus size={20} />
            Novo Hino
          </button>
        )}
      </div>

      {/* Formulário */}
      {showForm && (
        <div className="bg-white p-4 rounded-lg shadow-md mb-6 border-t-4 border-indigo-600">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            {editando ? 'Editar Hino' : 'Novo Hino'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Nome, Tom, Cantor, Categoria - Responsivo */}
            <div className="space-y-2">
              <input
                type="text"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-600 text-sm"
                placeholder="🎵 Nome do hino"
              />

              <div className="grid grid-cols-2 gap-2">
                <select
                  value={formData.tom}
                  onChange={(e) => setFormData({ ...formData, tom: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-600 text-sm"
                >
                  {TONS.map(ton => (
                    <option key={ton} value={ton}>{ton}</option>
                  ))}
                </select>

                <select
                  value={formData.categoria}
                  onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-600 text-sm"
                >
                  {CATEGORIAS.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <input
                type="text"
                value={formData.cantor}
                onChange={(e) => setFormData({ ...formData, cantor: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-600 text-sm"
                placeholder="👤 Cantor"
              />
            </div>

            {/* Letra */}
            <textarea
              value={formData.letra}
              onChange={(e) => setFormData({ ...formData, letra: e.target.value })}
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-600 text-sm"
              placeholder="Letra do hino (opcional)"
            />

            {/* Observações */}
            <textarea
              value={formData.observacoes}
              onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-600 text-sm"
              placeholder="Observações (opcional)"
            />

            {/* Botões */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="submit"
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium text-sm flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {editando ? 'Atualizar' : 'Salvar'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditando(null);
                }}
                className="px-4 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500 transition font-medium text-sm flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filtros - Compacto para Mobile */}
      <div className="bg-white p-3 rounded-lg shadow-md mb-4">
        <input
          type="text"
          placeholder="🔍 Pesquisar hino..."
          value={filtros.nome}
          onChange={(e) => setFiltros({ ...filtros, nome: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-600 text-sm mb-2"
        />
        
        <div className="grid grid-cols-2 gap-2">
          <select
            value={filtros.tom}
            onChange={(e) => setFiltros({ ...filtros, tom: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-600 text-sm"
          >
            <option value="">🎵 Todos tons</option>
            {TONS.map(ton => (
              <option key={ton} value={ton}>{ton}</option>
            ))}
          </select>

          <input
            type="text"
            placeholder="👤 Cantor..."
            value={filtros.cantor}
            onChange={(e) => setFiltros({ ...filtros, cantor: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-600 text-sm"
          />
        </div>
      </div>

      {/* Lista de Hinos - Mobile Friendly */}
      <div className="space-y-2">
        {hinosFiltrados.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg">
            <Music className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-500 text-base">Nenhum hino cadastrado</p>
          </div>
        ) : (
          hinosFiltrados.map(hino => (
            <div key={hino.id} className="bg-white p-3 rounded-lg shadow-sm border-l-4 border-indigo-600">
              <h3 className="text-lg font-bold text-gray-900 mb-2 md:mb-0">{hino.nome}</h3>
              
              {/* Linha com informações e botões - Desktop em 1 linha, Mobile em 2 */}
              <div className="md:flex md:items-center md:justify-between md:gap-4">
                <div className="text-sm text-gray-600 mt-2 md:mt-0">
                  <p>🎵 <span className="font-medium">{hino.tom}</span> • 👤 <span className="font-medium">{hino.cantor}</span> • 📂 <span className="font-medium">{hino.categoria}</span></p>
                </div>
                
                {/* Botões */}
                <div className="md:hidden flex gap-2 mt-3">
                  <button
                    onClick={() => setModalLetra(hino)}
                    className="p-1.5 bg-blue-100 text-blue-600 rounded hover:bg-blue-200 transition flex justify-center text-sm flex-1"
                    title="Ver letra"
                  >
                    👁️
                  </button>
                  <button
                    onClick={() => handleEditar(hino)}
                    className="p-1.5 bg-yellow-100 text-yellow-600 rounded hover:bg-yellow-200 transition flex justify-center text-sm flex-1"
                    title="Editar"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => generateHinoPdf(hino, configuracoes)}
                    className="p-1.5 bg-green-100 text-green-600 rounded hover:bg-green-200 transition flex justify-center text-sm flex-1"
                    title="Baixar PDF"
                  >
                    📥
                  </button>
                  <button
                    onClick={() => shareViaWhatsApp(`Confira o hino: ${hino.nome} (Tom: ${hino.tom}, Cantor: ${hino.cantor})`)}
                    className="p-1.5 bg-cyan-100 text-cyan-600 rounded hover:bg-cyan-200 transition flex justify-center text-sm flex-1"
                    title="Compartilhar"
                  >
                    📤
                  </button>
                  <button
                    onClick={() => setDeletePasswordModal(hino)}
                    className="p-1.5 bg-red-100 text-red-600 rounded hover:bg-red-200 transition flex justify-center text-sm flex-1"
                    title="Deletar"
                  >
                    🗑️
                  </button>
                </div>
                
                {/* Botões Desktop - Na mesma linha com ícones SVG */}
                <div className="hidden md:flex md:gap-2">
                  <button
                    onClick={() => setModalLetra(hino)}
                    className="p-2 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition flex justify-center items-center"
                    title="Ver letra"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 5C7 5 2.73 8.11 1 12.46c1.73 4.35 6 7.54 11 7.54s9.27-3.19 11-7.54C21.27 8.11 17 5 12 5m0 9c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleEditar(hino)}
                    className="p-2 bg-yellow-50 text-yellow-600 rounded hover:bg-yellow-100 transition flex justify-center items-center"
                    title="Editar"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => generateHinoPdf(hino, configuracoes)}
                    className="p-2 bg-orange-50 text-orange-600 rounded hover:bg-orange-100 transition flex justify-center items-center"
                    title="Baixar PDF"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </button>
                  <button
                    onClick={() => shareViaWhatsApp(`Confira o hino: ${hino.nome} (Tom: ${hino.tom}, Cantor: ${hino.cantor})`)}
                    className="p-2 bg-green-50 text-green-600 rounded hover:bg-green-100 transition flex justify-center items-center"
                    title="Compartilhar"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C9.589 14.06 10.717 14.534 11.968 14.534c3.59 0 6.5-2.893 6.5-6.47 0-3.577-2.91-6.469-6.5-6.469-3.59 0-6.5 2.892-6.5 6.47 0 1.251.474 2.379 1.293 3.285m0 0a6.47 6.47 0 0011.632-4.285v-2.58m0 0a6.5 6.5 0 10-9.36 5.853" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDuplicar(hino)}
                    className="p-2 bg-purple-50 text-purple-600 rounded hover:bg-purple-100 transition flex justify-center items-center"
                    title="Duplicar"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setDeletePasswordModal(hino)}
                    className="p-2 bg-red-50 text-red-600 rounded hover:bg-red-100 transition flex justify-center items-center"
                    title="Deletar"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))
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
