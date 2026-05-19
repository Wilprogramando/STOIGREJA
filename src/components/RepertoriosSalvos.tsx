import React, { useState, useEffect } from 'react';
import { Eye, Edit, Trash2, Download, Share2, Copy, Calendar, Music } from 'lucide-react';
import { getAllRepertorios, deleteRepertorio, addRepertorio } from '../services/db';
import { generateRepertorioPdf, shareViaWhatsApp } from '../services/pdf';
import { Repertorio, Configuracoes } from '../types';

interface RepertoriosSalvosProps {
  configuracoes: Configuracoes | null;
  onEdit?: (repertorio: Repertorio) => void;
}

export const RepertoriosSalvos: React.FC<RepertoriosSalvosProps> = ({ configuracoes, onEdit }) => {
  const [repertorios, setRepertorios] = useState<Repertorio[]>([]);
  const [filtro, setFiltro] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalAberto, setModalAberto] = useState<Repertorio | null>(null);
  const [hinoSelecionado, setHinoSelecionado] = useState<any>(null);

  useEffect(() => {
    loadRepertorios();
  }, []);

  const loadRepertorios = async () => {
    setLoading(true);
    try {
      const todos = await getAllRepertorios();
      setRepertorios(todos);
    } catch (error) {
      console.error('Erro ao carregar repertórios:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletar = async (id: string) => {
    if (confirm('Tem certeza que deseja deletar este repertório?')) {
      const senha = prompt('Digite a senha para confirmar a exclusão do repertório:');
      if (!senha) return;
      
      if (senha !== '523297') {
        alert('❌ Senha incorreta!');
        return;
      }
      
      try {
        await deleteRepertorio(id);
        alert('Repertório deletado com sucesso!');
        loadRepertorios();
      } catch (error) {
        console.error('Erro ao deletar:', error);
        alert('Erro ao deletar repertório');
      }
    }
  };

  const handleDuplicar = async (repertorio: Repertorio) => {
    try {
      const novoRepertorio: Repertorio = {
        ...repertorio,
        id: Date.now().toString(),
        nome: `${repertorio.nome} (Cópia)`,
        criadoEm: new Date().toISOString(),
        atualizadoEm: new Date().toISOString()
      };
      await addRepertorio(novoRepertorio);
      alert('Repertório duplicado com sucesso!');
      loadRepertorios();
    } catch (error) {
      console.error('Erro ao duplicar:', error);
      alert('Erro ao duplicar repertório');
    }
  };

  const handleGerarPdf = async (repertorio: Repertorio) => {
    try {
      await generateRepertorioPdf(repertorio, configuracoes, false, configuracoes?.logo);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Erro ao gerar PDF');
    }
  };

  const handleCompartilharWhatsApp = (repertorio: Repertorio) => {
    const message = `*${repertorio.nome}*\n\nData: ${new Date(repertorio.data).toLocaleDateString('pt-BR')}\n\nHinos:\n${repertorio.hinos.map((h, i) => `${i + 1}. ${h.nome} (Tom: ${h.tom})`).join('\n')}`;
    shareViaWhatsApp(message);
  };

  const repertoriosFiltrados = repertorios.filter(r =>
    r.nome.toLowerCase().includes(filtro.toLowerCase()) ||
    new Date(r.data).toLocaleDateString('pt-BR').includes(filtro)
  );

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto text-center py-12">
        <p className="text-gray-500">Carregando repertórios...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <h2 className="text-3xl font-bold text-gray-900 mb-8">Repertórios Salvos</h2>

      {/* Filtro */}
      <div className="bg-white p-4 rounded-lg shadow-md mb-6">
        <input
          type="text"
          placeholder="Pesquisar por nome ou data..."
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-600"
        />
      </div>

      {/* Lista */}
      <div className="space-y-4">
        {repertoriosFiltrados.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg">
            <Music className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-500 text-lg">Nenhum repertório encontrado</p>
          </div>
        ) : (
          repertoriosFiltrados.map(repertorio => (
            <div key={repertorio.id} className="bg-white rounded-lg shadow-md hover:shadow-lg transition">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-gray-900">{repertorio.nome}</h3>
                    <div className="flex flex-col md:flex-row gap-4 mt-2 text-gray-600">
                      <span className="flex items-center gap-2">
                        <Calendar size={18} />
                        {repertorio.data ? repertorio.data.split('-').reverse().join('/') : 'Data não definida'}
                      </span>
                      <span className="flex items-center gap-2">
                        <Music size={18} />
                        {repertorio.hinos.length} hino(s)
                      </span>
                      {repertorio.horario && (
                        <span className="flex items-center gap-2">
                          ⏱️ {repertorio.horario}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setModalAberto(repertorio)}
                      title="Visualizar"
                      className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition"
                    >
                      <Eye size={20} />
                    </button>
                    <button
                      onClick={() => onEdit?.(repertorio)}
                      title="Editar"
                      className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition"
                    >
                      <Edit size={20} />
                    </button>
                    <button
                      onClick={() => handleGerarPdf(repertorio)}
                      title="Baixar PDF"
                      className="p-2 bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-100 transition"
                    >
                      <Download size={20} />
                    </button>
                    <button
                      onClick={() => handleCompartilharWhatsApp(repertorio)}
                      title="Compartilhar"
                      className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition"
                    >
                      <Share2 size={20} />
                    </button>
                    <button
                      onClick={() => handleDuplicar(repertorio)}
                      title="Duplicar"
                      className="p-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition"
                    >
                      <Copy size={20} />
                    </button>
                    <button
                      onClick={() => handleDeletar(repertorio.id)}
                      title="Deletar"
                      className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>

                {repertorio.observacoes && (
                  <div className="bg-yellow-50 p-3 rounded-lg text-sm text-gray-700 mb-4">
                    <strong>Observações:</strong> {repertorio.observacoes}
                  </div>
                )}

                {/* Tabela de Hinos */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-2 text-left font-medium text-gray-700">#</th>
                        <th className="px-4 py-2 text-left font-medium text-gray-700">Hino</th>
                        <th className="px-4 py-2 text-left font-medium text-gray-700">Tom</th>
                        <th className="px-4 py-2 text-left font-medium text-gray-700">Cantor</th>
                        <th className="px-4 py-2 text-center font-medium text-gray-700">Ação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {repertorio.hinos
                        .sort((a, b) => a.ordem - b.ordem)
                        .map(hino => (
                          <tr key={hino.id} className="border-b hover:bg-gray-50">
                            <td className="px-4 py-2 font-bold text-indigo-600">{hino.ordem}</td>
                            <td className="px-4 py-2">
                              {hino.nome}
                              {hino.numeroHarpa && (
                                <span className="text-gray-500 text-xs ml-2">(Harpa nº {hino.numeroHarpa})</span>
                              )}
                            </td>
                            <td className="px-4 py-2">{hino.tom}</td>
                            <td className="px-4 py-2">{hino.cantor}</td>
                            <td className="px-4 py-2 text-center">
                              {hino.letra && (
                                <button
                                  onClick={() => setHinoSelecionado(hino)}
                                  title="Ver letra"
                                  className="px-3 py-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200 transition text-sm font-medium"
                                >
                                  Ver Letra
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal de Visualização */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">{modalAberto.nome}</h2>
                <p className="text-indigo-100 mt-1">
                  {modalAberto.data ? modalAberto.data.split('-').reverse().join('/') : 'Data não definida'} • {modalAberto.hinos.length} hino(s)
                </p>
              </div>
              <button
                onClick={() => setModalAberto(null)}
                className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition"
              >
                ✕
              </button>
            </div>

            <div className="p-6">
              {modalAberto.observacoes && (
                <div className="bg-yellow-50 p-4 rounded-lg mb-6 border border-yellow-200">
                  <h4 className="font-bold text-yellow-900 mb-2">Observações</h4>
                  <p className="text-yellow-800">{modalAberto.observacoes}</p>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">#</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">Hino</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">Tom</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">Cantor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modalAberto.hinos
                      .sort((a, b) => a.ordem - b.ordem)
                      .map(hino => (
                        <tr key={hino.id} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-2 font-bold text-indigo-600">{hino.ordem}</td>
                          <td className="px-4 py-2">
                            {hino.nome}
                            {hino.numeroHarpa && (
                              <span className="text-gray-500 text-xs ml-2">(Harpa nº {hino.numeroHarpa})</span>
                            )}
                          </td>
                          <td className="px-4 py-2">{hino.tom}</td>
                          <td className="px-4 py-2">{hino.cantor}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 flex gap-2">
                <button
                  onClick={() => {
                    handleGerarPdf(modalAberto);
                    setModalAberto(null);
                  }}
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition"
                >
                  Gerar PDF
                </button>
                <button
                  onClick={() => {
                    handleCompartilharWhatsApp(modalAberto);
                    setModalAberto(null);
                  }}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                >
                  Compartilhar
                </button>
                <button
                  onClick={() => setModalAberto(null)}
                  className="flex-1 px-4 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500 transition"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Visualização da Letra do Hino */}
      {hinoSelecionado && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">{hinoSelecionado.nome}</h2>
                <p className="text-blue-100 mt-1">
                  Tom: {hinoSelecionado.tom} | Cantor: {hinoSelecionado.cantor}
                </p>
              </div>
              <button
                onClick={() => setHinoSelecionado(null)}
                className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition text-2xl"
              >
                ✕
              </button>
            </div>

            <div className="p-6">
              <div className="bg-gray-50 p-6 rounded-lg">
                <pre className="whitespace-pre-wrap font-sans text-gray-800 leading-relaxed text-lg">
                  {hinoSelecionado.letra}
                </pre>
              </div>

              {hinoSelecionado.observacoes && (
                <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <h3 className="font-bold text-yellow-900 mb-2">Observações</h3>
                  <pre className="whitespace-pre-wrap font-sans text-yellow-800">
                    {hinoSelecionado.observacoes}
                  </pre>
                </div>
              )}

              <div className="mt-6 flex gap-2">
                <button
                  onClick={() => setHinoSelecionado(null)}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
