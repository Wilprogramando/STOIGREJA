import React, { useState, useEffect } from 'react';
import { Eye, Edit, Trash2, Download, Share2, Copy, Calendar, Music } from 'lucide-react';
import { getAllRepertorios, deleteRepertorio, addRepertorio, getAllHinos } from '../services/db';
import { generateRepertorioPdf, shareViaWhatsApp } from '../services/pdf';
import { Repertorio, Configuracoes, Hino } from '../types';

interface RepertoriosSalvosProps {
  configuracoes: Configuracoes | null;
  onEdit?: (repertorio: Repertorio) => void;
}

export const RepertoriosSalvos: React.FC<RepertoriosSalvosProps> = ({ configuracoes, onEdit }) => {
  const [repertorios, setRepertorios] = useState<Repertorio[]>([]);
  const [todosHinos, setTodosHinos] = useState<Hino[]>([]);
  const [filtro, setFiltro] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalAberto, setModalAberto] = useState<Repertorio | null>(null);
  const [hinoSelecionado, setHinoSelecionado] = useState<any>(null);
  const [mostrarPassados, setMostrarPassados] = useState(false);

  useEffect(() => {
    loadRepertorios();
  }, []);

  // ✅ NOVA FUNÇÃO ROBUSTA: Converter IDs em objetos de hinos
  const getHinosCompletos = (hinosData: any[]): Hino[] => {
    if (!hinosData || !Array.isArray(hinosData)) {
      console.warn('⚠️ hinosData inválido:', hinosData);
      return [];
    }
    
    const resultado: Hino[] = [];
    
    hinosData.forEach((item, idx) => {
      try {
        // Se já é um objeto completo (repertórios antigos)
        if (typeof item === 'object' && item !== null && item.nome) {
          resultado.push(item);
          return;
        }
        
        // Se é um ID (novos repertórios)
        if (typeof item === 'string') {
          const hinoCompleto = todosHinos.find(h => h.id === item);
          if (hinoCompleto) {
            resultado.push(hinoCompleto);
          } else {
            console.warn(`⚠️ Hino com ID ${item} não encontrado no banco`);
          }
          return;
        }
        
        console.warn(`⚠️ Item ${idx} tem tipo inválido:`, typeof item, item);
      } catch (error) {
        console.error(`❌ Erro ao processar item ${idx}:`, error);
      }
    });
    
    return resultado;
  };

  const loadRepertorios = async () => {
    setLoading(true);
    try {
      console.log('Carregando repertórios e hinos...');
      const hinos = await getAllHinos();
      console.log('Hinos carregados:', hinos.length);
      setTodosHinos(hinos);
      
      const todos = await getAllRepertorios();
      console.log('Repertórios carregados:', todos.length);
      setRepertorios(todos);
    } catch (error) {
      console.error('Erro ao carregar repertórios:', error);
    } finally {
      setLoading(false);
    }
  };

  // ✅ FUNÇÃO: Separar repertórios por data
  const separarPorData = () => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const futuros = repertorios.filter(rep => {
      const dataRep = new Date(rep.data);
      dataRep.setHours(0, 0, 0, 0);
      return dataRep >= hoje;
    });

    const passados = repertorios.filter(rep => {
      const dataRep = new Date(rep.data);
      dataRep.setHours(0, 0, 0, 0);
      return dataRep < hoje;
    });

    return { futuros, passados };
  };

  const { futuros, passados } = separarPorData();
  const repertoriosExibidos = mostrarPassados ? passados : futuros;

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
      console.log('🔄 INICIANDO DUPLICAÇÃO...');
      console.log('Repertório original:', repertorio);
      console.log('Hinos originais:', repertorio.hinos);

      // Extrair apenas IDs dos hinos (compatível com antigos e novos)
      const hinosIds = Array.isArray(repertorio.hinos)
        ? repertorio.hinos
            .filter(h => {
              console.log('Filtrando:', h, 'tipo:', typeof h);
              return h !== null && h !== undefined;
            })
            .map(h => {
              console.log('Mapeando:', h);
              if (typeof h === 'string') {
                console.log('  → É string (ID):', h);
                return h;
              }
              if (typeof h === 'object' && h.hinoId) {
                console.log('  → Tem hinoId:', h.hinoId);
                return h.hinoId;
              }
              if (typeof h === 'object' && h.id) {
                console.log('  → Tem id:', h.id);
                return h.id;
              }
              console.log('  → Retornando null');
              return null;
            })
            .filter(Boolean)
        : [];

      console.log('✅ IDs extraídos:', hinosIds);

      const novoRepertorio: Repertorio = {
        ...repertorio,
        id: Date.now().toString(),
        nome: `${repertorio.nome} (Cópia)`,
        hinos: hinosIds as any,
        criadoEm: new Date().toISOString(),
        atualizadoEm: new Date().toISOString()
      };

      console.log('📝 Novo repertório a salvar:', novoRepertorio);
      
      await addRepertorio(novoRepertorio);
      console.log('✅ Salvo com sucesso!');
      
      alert('Repertório duplicado com sucesso!');
      await loadRepertorios();
      console.log('✅ Repertórios recarregados');
    } catch (error) {
      console.error('❌ ERRO COMPLETO:', error);
      console.error('Stack:', error instanceof Error ? error.stack : '');
      alert(`Erro ao duplicar repertório: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleGerarPdf = async (repertorio: Repertorio) => {
    try {
      const hinosCompletos = getHinosCompletos(repertorio.hinos);
      const repertorioCompleto: Repertorio = {
        ...repertorio,
        hinos: hinosCompletos as any
      };
      await generateRepertorioPdf(repertorioCompleto, configuracoes, false, configuracoes?.logo);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Erro ao gerar PDF');
    }
  };

  const handleCompartilharWhatsApp = (repertorio: Repertorio) => {
    try {
      const hinosCompletos = getHinosCompletos(repertorio.hinos).filter(h => h !== null && h !== undefined);
      const mensagemHinos = hinosCompletos.length > 0
        ? hinosCompletos
            .map((h) => {
              if (!h || !h.nome) return '';
              return `${h.nome} (Tom: ${h.tom || '?'})`;
            })
            .filter(Boolean)
            .join('\n')
        : 'Nenhum hino adicionado';
      const message = `*${repertorio.nome}*\n\nData: ${new Date(repertorio.data).toLocaleDateString('pt-BR')}\n\nHinos:\n${mensagemHinos}`;
      shareViaWhatsApp(message);
    } catch (error) {
      console.error('Erro ao compartilhar:', error);
      alert('Erro ao compartilhar');
    }
  };

  const repertoriosFiltrados = repertoriosExibidos.filter(r =>
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
    <div className="max-w-6xl mx-auto pb-20">
      <h2 className="text-3xl font-bold text-gray-900 mb-8">Repertórios Salvos</h2>

      {/* ✅ BOTÕES DE FILTRO */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={() => setMostrarPassados(false)}
          className={`px-6 py-3 rounded-lg font-medium transition flex-1 ${
            !mostrarPassados
              ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          📅 Próximos Repertórios ({futuros.length})
        </button>
        <button
          onClick={() => setMostrarPassados(true)}
          className={`px-6 py-3 rounded-lg font-medium transition flex-1 ${
            mostrarPassados
              ? 'bg-purple-600 text-white shadow-md'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          📂 Repertórios Passados ({passados.length})
        </button>
      </div>

      {/* BARRA DE PESQUISA */}
      <div className="mb-6">
        <input
          type="text"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          placeholder="Pesquisar por nome ou data..."
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-600"
        />
      </div>

      {/* Lista */}
      <div className="space-y-4">
        {repertoriosFiltrados.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg">
            <Music className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-500 text-lg">
              {mostrarPassados ? 'Nenhum repertório passado' : 'Nenhum repertório próximo'}
            </p>
            {futuros.length === 0 && passados.length === 0 && (
              <p className="text-gray-400 text-sm mt-2">Crie um novo repertório para começar</p>
            )}
          </div>
        ) : (
          repertoriosFiltrados.map(repertorio => (
            <div key={repertorio.id} className="bg-white rounded-lg shadow-md hover:shadow-lg transition">
              <div className="p-4 md:p-6">
                <div className="flex flex-col gap-3">
                  {/* Título */}
                  <h3 className="text-xl md:text-2xl font-bold text-gray-900">{repertorio.nome}</h3>

                  {/* Info em uma linha */}
                  <div className="flex flex-wrap gap-4 text-gray-600 text-sm md:text-base">
                    <span className="flex items-center gap-1">
                      <Calendar size={16} />
                      {repertorio.data ? repertorio.data.split('-').reverse().join('/') : 'Data não definida'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Music size={16} />
                      {repertorio.hinos.length} hino(s)
                    </span>
                    {repertorio.horario && (
                      <span className="flex items-center gap-1">
                        ⏱️ {repertorio.horario}
                      </span>
                    )}
                  </div>

                  {/* Botões */}
                  <div className="flex gap-1 flex-wrap">
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

                {/* Espaçamento */}
                <div className="mt-4"></div>

                {repertorio.observacoes && (
                  <div className="bg-yellow-50 p-3 rounded-lg text-sm text-gray-700 mb-4">
                    <strong>Observações:</strong> {repertorio.observacoes}
                  </div>
                )}

                {/* Tabela de Hinos - Desktop */}
                <div className="hidden md:block overflow-x-auto">
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
                      {getHinosCompletos(repertorio.hinos)
                        .filter(h => h !== null && h !== undefined)
                        .map((hino, idx) => {
                          if (!hino) return null;
                          return (
                          <tr key={hino.id} className="border-b hover:bg-gray-50">
                            <td className="px-4 py-2 font-bold text-indigo-600">{idx + 1}</td>
                            <td className="px-4 py-2">
                              {hino?.nome || 'Hino desconhecido'}
                              {hino?.numeroHarpa && (
                                <span className="text-gray-500 text-xs ml-2">(Harpa nº {hino.numeroHarpa})</span>
                              )}
                            </td>
                            <td className="px-4 py-2">{hino?.tom || '?'}</td>
                            <td className="px-4 py-2">{hino?.cantor || '?'}</td>
                            <td className="px-4 py-2 text-center">
                              {hino?.letra && (
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
                        );
                        })}
                    </tbody>
                  </table>
                </div>

                {/* Cards de Hinos - Mobile */}
                <div className="md:hidden space-y-3">
                  {getHinosCompletos(repertorio.hinos)
                    .filter(h => h !== null && h !== undefined)
                    .map((hino, idx) => {
                      if (!hino) return null;
                      return (
                        <div key={hino.id} className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-lg border border-indigo-200">
                          <div className="flex items-center gap-3 mb-3">
                            <span className="inline-block w-7 h-7 bg-indigo-600 text-white rounded-full text-center text-xs font-bold flex-shrink-0 flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <h4 className="font-bold text-gray-900 text-sm flex-1">{hino?.nome || 'Hino desconhecido'}</h4>
                            {hino?.numeroHarpa && (
                              <p className="text-xs text-gray-500">Harpa nº {hino.numeroHarpa}</p>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-sm">
                            <div className="flex items-center gap-1">
                              <p className="text-gray-600 text-xs font-medium">Tom:</p>
                              <p className="font-bold text-gray-900">{hino?.tom || '?'}</p>
                            </div>
                            <div className="flex items-center gap-1">
                              <p className="text-gray-600 text-xs font-medium">Cantor:</p>
                              <p className="font-bold text-gray-900 truncate">{hino?.cantor || '?'}</p>
                            </div>
                            {hino?.letra && (
                              <button
                                onClick={() => setHinoSelecionado(hino)}
                                className="ml-auto px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-xs font-medium whitespace-nowrap"
                              >
                                Letra
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
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
                  {modalAberto.data ? modalAberto.data.split('-').reverse().join('/') : 'Data não definida'} • {getHinosCompletos(modalAberto.hinos).length} hino(s)
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
                    {getHinosCompletos(modalAberto.hinos)
                      .filter(h => h !== null && h !== undefined)
                      .map((hino, idx) => {
                        if (!hino) return null;
                        return (
                        <tr key={hino.id} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-2 font-bold text-indigo-600">{idx + 1}</td>
                          <td className="px-4 py-2">
                            {hino?.nome || 'Hino desconhecido'}
                            {hino?.numeroHarpa && (
                              <span className="text-gray-500 text-xs ml-2">(Harpa nº {hino.numeroHarpa})</span>
                            )}
                          </td>
                          <td className="px-4 py-2">{hino?.tom || '?'}</td>
                          <td className="px-4 py-2">{hino?.cantor || '?'}</td>
                        </tr>
                      );
                      })}
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
      {hinoSelecionado && hinoSelecionado?.nome && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">{hinoSelecionado?.nome || 'Hino desconhecido'}</h2>
                <p className="text-blue-100 mt-1">
                  Tom: {hinoSelecionado?.tom || '?'} | Cantor: {hinoSelecionado?.cantor || '?'}
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
                  {hinoSelecionado?.letra || 'Letra não disponível'}
                </pre>
              </div>

              {hinoSelecionado?.observacoes && (
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
