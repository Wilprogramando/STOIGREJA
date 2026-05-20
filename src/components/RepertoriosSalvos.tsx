import React, { useState, useEffect } from 'react';
import { Edit, Trash2, Download, Share2, Eye, EyeOff } from 'lucide-react';
import { getAllRepertorios, deleteRepertorio, getAllHinos } from '../services/db';
import { generateRepertorioPdf, shareViaWhatsApp } from '../services/pdf';
import { Repertorio, Hino, Configuracoes } from '../types';

interface RepertoriosSalvosProps {
  configuracoes: Configuracoes | null;
  onEdit?: (repertorio: Repertorio) => void;
}

export const RepertoriosSalvos: React.FC<RepertoriosSalvosProps> = ({ configuracoes, onEdit }) => {
  const [repertorios, setRepertorios] = useState<Repertorio[]>([]);
  const [todosHinos, setTodosHinos] = useState<Hino[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletePasswordModal, setDeletePasswordModal] = useState<Repertorio | null>(null);
  const [senha, setSenha] = useState('');
  const [modalAberto, setModalAberto] = useState<Repertorio | null>(null);
  const [showDetails, setShowDetails] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const reps = await getAllRepertorios();
      const hinos = await getAllHinos();
      setRepertorios(reps);
      setTodosHinos(hinos);
    } catch (error) {
      console.error('Erro ao carregar:', error);
    } finally {
      setLoading(false);
    }
  };

  // ✅ NOVA FUNÇÃO: Converter IDs em objetos de hinos
  const getHinosDoRepertorio = (listaHinosIds: any[]): Hino[] => {
    if (!listaHinosIds || !Array.isArray(listaHinosIds)) return [];
    
    return listaHinosIds
      .map(hinoId => {
        // Se já é um objeto (repertórios antigos), retorna como está
        if (typeof hinoId === 'object' && hinoId.nome) {
          return hinoId;
        }
        // Se é um ID (string), procura no banco
        const hinoCompleto = todosHinos.find(h => h.id === hinoId);
        return hinoCompleto || null;
      })
      .filter(Boolean) as Hino[];
  };

  const handleCompartilhar = (repertorio: Repertorio) => {
    const hinosDoRep = getHinosDoRepertorio(repertorio.hinos);
    const message = `*${repertorio.nome}*\n\nData: ${new Date(repertorio.data).toLocaleDateString('pt-BR')}\n\nHinos:\n${hinosDoRep.map((h, i) => `${i + 1}. ${h.nome} (Tom: ${h.tom})`).join('\n')}`;
    shareViaWhatsApp(message);
  };

  const handleDeletar = async () => {
    if (senha !== '523297') {
      alert('Senha incorreta!');
      return;
    }

    if (deletePasswordModal) {
      try {
        await deleteRepertorio(deletePasswordModal.id);
        setRepertorios(repertorios.filter(r => r.id !== deletePasswordModal.id));
        setDeletePasswordModal(null);
        setSenha('');
        alert('Repertório deletado!');
      } catch (error) {
        console.error('Erro ao deletar:', error);
        alert('Erro ao deletar repertório');
      }
    }
  };

  const handleGerarPdf = async (repertorio: Repertorio) => {
    const hinosDoRep = getHinosDoRepertorio(repertorio.hinos);
    
    const repertorioCompleto: Repertorio = {
      ...repertorio,
      hinos: hinosDoRep as any
    };

    try {
      await generateRepertorioPdf(repertorioCompleto, configuracoes, false, configuracoes?.logo);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Erro ao gerar PDF');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-500 text-lg">Carregando repertórios...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <h2 className="text-3xl font-bold text-gray-900 mb-8">Repertórios Salvos</h2>

      {repertorios.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-md">
          <p className="text-gray-500 text-lg">Nenhum repertório salvo</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {repertorios.map(repertorio => {
            const hinosDoRep = getHinosDoRepertorio(repertorio.hinos);
            const isExpanded = showDetails === repertorio.id;

            return (
              <div key={repertorio.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition">
                {/* Cabeçalho */}
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6">
                  <h3 className="text-xl font-bold mb-2">{repertorio.nome}</h3>
                  <p className="text-sm text-indigo-100">
                    📅 {new Date(repertorio.data).toLocaleDateString('pt-BR')}
                    {repertorio.horario && ` • ⏰ ${repertorio.horario}`}
                  </p>
                  <p className="text-sm text-indigo-100 mt-1">
                    🎵 {hinosDoRep.length} hino(s)
                  </p>
                </div>

                {/* Lista de Hinos */}
                <div className="p-6">
                  {hinosDoRep.length > 0 ? (
                    <>
                      <div className={`max-h-48 overflow-hidden transition-all ${isExpanded ? '' : ''}`}>
                        <ul className="space-y-2">
                          {hinosDoRep.slice(0, isExpanded ? hinosDoRep.length : 3).map((hino, idx) => (
                            <li key={idx} className="text-sm text-gray-700">
                              <span className="font-medium">{idx + 1}.</span> {hino.nome}
                              <span className="text-gray-500 text-xs ml-2">({hino.tom})</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {hinosDoRep.length > 3 && (
                        <button
                          onClick={() => setShowDetails(isExpanded ? null : repertorio.id)}
                          className="mt-3 text-indigo-600 hover:text-indigo-700 text-sm font-medium flex items-center gap-1"
                        >
                          {isExpanded ? (
                            <>
                              <EyeOff size={16} />
                              Ver menos
                            </>
                          ) : (
                            <>
                              <Eye size={16} />
                              Ver todos ({hinosDoRep.length})
                            </>
                          )}
                        </button>
                      )}
                    </>
                  ) : (
                    <p className="text-gray-500 text-sm">Nenhum hino neste repertório</p>
                  )}

                  {repertorio.observacoes && (
                    <p className="text-sm text-gray-600 mt-4 p-3 bg-gray-50 rounded italic">
                      📝 {repertorio.observacoes}
                    </p>
                  )}
                </div>

                {/* Botões */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex gap-2">
                  <button
                    onClick={() => onEdit?.(repertorio)}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2 text-sm font-medium"
                  >
                    <Edit size={18} />
                    Editar
                  </button>
                  <button
                    onClick={() => handleGerarPdf(repertorio)}
                    className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition flex items-center justify-center gap-2 text-sm font-medium"
                  >
                    <Download size={18} />
                    PDF
                  </button>
                  <button
                    onClick={() => handleCompartilhar(repertorio)}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2 text-sm font-medium"
                  >
                    <Share2 size={18} />
                    Compartilhar
                  </button>
                  <button
                    onClick={() => setDeletePasswordModal(repertorio)}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center justify-center gap-2 text-sm font-medium"
                  >
                    <Trash2 size={18} />
                    Deletar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Deletar */}
      {deletePasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-sm w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Deletar Repertório</h3>
            <p className="text-gray-600 mb-4">
              Tem certeza que deseja deletar "{deletePasswordModal.nome}"?
            </p>
            <p className="text-sm text-gray-600 mb-4">
              Digite a senha para confirmar:
            </p>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="Senha"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-red-600 mb-4"
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setDeletePasswordModal(null);
                  setSenha('');
                }}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeletar}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium"
              >
                Deletar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
