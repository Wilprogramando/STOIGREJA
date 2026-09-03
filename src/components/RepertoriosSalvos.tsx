import React, { useState, useEffect } from 'react';
import {
  Eye,
  Edit,
  Trash2,
  Download,
  Share2,
  Copy,
  Calendar,
  Music,
  Minus,
  Plus,
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  Search,
  Clock,
  X,
  Church,
  FileText,
  MoreVertical
} from 'lucide-react';
import { getAllRepertorios, deleteRepertorio, addRepertorio, getAllHinos } from '../services/db';
import { generateRepertorioPdf, shareViaWhatsApp } from '../services/pdf';
import { Repertorio, Configuracoes, Hino } from '../types';

// Tamanho inicial da letra (px). Ao fechar e abrir a letra, volta para este valor.
const TAMANHO_LETRA_PADRAO = 18;

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
  const [listaLetra, setListaLetra] = useState<Hino[]>([]);
  const [indiceLetra, setIndiceLetra] = useState(0);
  const [tamanhoLetra, setTamanhoLetra] = useState<number>(TAMANHO_LETRA_PADRAO);
  const [mostrarPassados, setMostrarPassados] = useState(false);
  /** Repertório com o painel de ações aberto (só um por vez). */
  const [acoesAbertas, setAcoesAbertas] = useState<string | null>(null);

  // Abre a letra guardando a lista do repertório, para navegar entre os hinos
  const abrirLetra = (lista: Hino[], idx: number) => {
    setTamanhoLetra(TAMANHO_LETRA_PADRAO);
    setListaLetra(lista);
    setIndiceLetra(idx);
    setHinoSelecionado(lista[idx]);
  };

  const irParaLetra = (idx: number) => {
    if (idx < 0 || idx >= listaLetra.length) return;
    setIndiceLetra(idx);
    setHinoSelecionado(listaLetra[idx]);
  };

  const fecharLetra = () => {
    setTamanhoLetra(TAMANHO_LETRA_PADRAO);
    setHinoSelecionado(null);
    setListaLetra([]);
    setIndiceLetra(0);
  };

  // Mostra "Hoje" no lugar da data quando o repertório é do dia atual
  const ehHoje = (data?: string) => {
    if (!data) return false;
    const hoje = new Date();
    const mm = String(hoje.getMonth() + 1).padStart(2, '0');
    const dd = String(hoje.getDate()).padStart(2, '0');
    return data === hoje.getFullYear() + '-' + mm + '-' + dd;
  };

  const formatarData = (data?: string) =>
    data ? data.split('-').reverse().join('/') : 'Data não definida';

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
          // Se esse hino ainda existe no cadastro, usa a versão atual dele:
          // assim uma edição de tom/cantor aparece também nos repertórios antigos.
          const idDoItem = item.hinoId || item.id;
          const atual = idDoItem ? todosHinos.find(h => h.id === idDoItem) : undefined;
          resultado.push(atual || item);
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

  // Data/hora do repertório + 24h. Sem horário, considera 00:00.
  // O repertório só sai de "Próximos" depois de completar 24h.
  const fimDaExibicao = (rep: Repertorio) => {
    const [ano, mes, dia] = (rep.data || '').split('-').map(Number);
    if (!ano || !mes || !dia) return null;
    const [hora, minuto] = (rep.horario || '00:00').split(':').map(Number);
    const inicio = new Date(ano, mes - 1, dia, hora || 0, minuto || 0, 0, 0);
    return new Date(inicio.getTime() + 24 * 60 * 60 * 1000);
  };

  // ✅ FUNÇÃO: Separar repertórios por data
  const separarPorData = () => {
    const agora = Date.now();

    const futuros = repertorios.filter(rep => {
      const fim = fimDaExibicao(rep);
      return fim !== null && fim.getTime() > agora;
    });

    const passados = repertorios.filter(rep => {
      const fim = fimDaExibicao(rep);
      return fim === null || fim.getTime() <= agora;
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

  /** Card branco padrão da tela. */
  const Painel: React.FC<{ children: React.ReactNode; className?: string }> = ({
    children,
    className = ''
  }) => (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-lg ${className}`}>
      {children}
    </div>
  );

  /** Botão de ação do card: ícone em cima, nome embaixo. */
  const BotaoAcao = ({ icon: Icon, titulo, cor, onClick }: any) => (
    <button
      onClick={onClick}
      title={titulo}
      className="flex flex-col items-center gap-1.5 min-w-0 flex-1"
    >
      <span className={`p-2.5 rounded-xl transition ${cor}`}>
        <Icon size={18} />
      </span>
      <span className="text-[10px] sm:text-xs font-medium text-gray-500 text-center leading-tight">
        {titulo}
      </span>
    </button>
  );

  return (
    <div className="max-w-6xl mx-auto pb-20">
      {/* Cabeçalho */}
      <div className="relative flex items-start gap-3 mb-5">
        <div className="bg-indigo-50 text-indigo-600 p-2.5 rounded-xl shrink-0">
          <FolderOpen size={22} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold text-gray-900">Repertórios Salvos</h2>
        </div>

        {/* Ilustração decorativa */}
        <img
          src="/ilustracao-repertorios.svg"
          alt=""
          aria-hidden="true"
          className="shrink-0 w-24 sm:w-32 -mt-3 -mr-1 pointer-events-none select-none"
        />
      </div>

      {/* Abas */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setMostrarPassados(false)}
          className={`flex-1 px-4 py-2.5 rounded-xl font-semibold text-sm transition flex items-center justify-center gap-2 ${
            !mostrarPassados
              ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Calendar size={16} />
          Próximos ({futuros.length})
        </button>
        <button
          onClick={() => setMostrarPassados(true)}
          className={`flex-1 px-4 py-2.5 rounded-xl font-semibold text-sm transition flex items-center justify-center gap-2 ${
            mostrarPassados
              ? 'bg-purple-600 text-white shadow-md'
              : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          <FolderOpen size={16} />
          Passados ({passados.length})
        </button>
      </div>

      {/* Pesquisa */}
      <div className="relative mb-5">
        <Search
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
        />
        <input
          type="text"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          placeholder="Pesquisar por nome ou data..."
          className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition"
        />
      </div>

      {/* Lista */}
      <div className="space-y-4">
        {repertoriosFiltrados.length === 0 ? (
          <Painel className="text-center py-12">
            <Music className="mx-auto text-gray-300 mb-3" size={40} />
            <p className="text-gray-500">
              {mostrarPassados ? 'Nenhum repertório passado' : 'Nenhum repertório próximo'}
            </p>
            {futuros.length === 0 && passados.length === 0 && (
              <p className="text-gray-400 text-sm mt-2">Crie um novo repertório para começar</p>
            )}
          </Painel>
        ) : (
          repertoriosFiltrados.map(repertorio => {
            const hinosDoRepertorio = getHinosCompletos(repertorio.hinos).filter(
              h => h !== null && h !== undefined
            );
            const hoje = ehHoje(repertorio.data);
            const acoesVisiveis = acoesAbertas === repertorio.id;

            return (
              <Painel key={repertorio.id} className="p-4 sm:p-6">
                {/* Título e data */}
                <div className="flex items-start gap-3 mb-4">
                  <div className="shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-700 text-white flex items-center justify-center shadow-md">
                    <Church size={26} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900 break-words">
                      {repertorio.nome}
                    </h3>

                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                          hoje ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        <Calendar size={13} />
                        {hoje ? 'Hoje' : formatarData(repertorio.data)}
                      </span>

                      {repertorio.horario && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
                          <Clock size={13} />
                          {repertorio.horario}
                        </span>
                      )}

                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700">
                        <Music size={13} />
                        {repertorio.hinos.length} hino(s)
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => setAcoesAbertas(acoesVisiveis ? null : repertorio.id)}
                    title={acoesVisiveis ? 'Esconder ações' : 'Mostrar ações'}
                    className={`shrink-0 p-2 rounded-xl border transition ${
                      acoesVisiveis
                        ? 'bg-gray-700 border-gray-700 text-white'
                        : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    <MoreVertical size={18} />
                  </button>
                </div>

                {/* Botões */}
                {acoesVisiveis && (
                <div className="flex gap-1 mb-4 p-3 rounded-2xl border border-gray-100 bg-gray-50/60">
                  <BotaoAcao
                    icon={Eye}
                    titulo="Visualizar"
                    cor="bg-blue-50 text-blue-600 hover:bg-blue-100"
                    onClick={() => setModalAberto(repertorio)}
                  />
                  <BotaoAcao
                    icon={Edit}
                    titulo="Editar"
                    cor="bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
                    onClick={() => {
                      console.log('📝 Clicando em editar - Repertório:', repertorio);
                      console.log('📝 Hinos no repertório:', repertorio.hinos);
                      onEdit?.(repertorio);
                    }}
                  />
                  <BotaoAcao
                    icon={Download}
                    titulo="Exportar PDF"
                    cor="bg-orange-50 text-orange-600 hover:bg-orange-100"
                    onClick={() => handleGerarPdf(repertorio)}
                  />
                  <BotaoAcao
                    icon={Share2}
                    titulo="Compartilhar"
                    cor="bg-green-50 text-green-600 hover:bg-green-100"
                    onClick={() => handleCompartilharWhatsApp(repertorio)}
                  />
                  <BotaoAcao
                    icon={Copy}
                    titulo="Duplicar"
                    cor="bg-purple-50 text-purple-600 hover:bg-purple-100"
                    onClick={() => handleDuplicar(repertorio)}
                  />
                  <BotaoAcao
                    icon={Trash2}
                    titulo="Excluir"
                    cor="bg-red-50 text-red-600 hover:bg-red-100"
                    onClick={() => handleDeletar(repertorio.id)}
                  />
                </div>
                )}

                {repertorio.observacoes && (
                  <div className="bg-amber-50 border border-amber-100 p-3 rounded-xl text-sm text-amber-900 mb-4">
                    <strong className="font-semibold">Observações:</strong> {repertorio.observacoes}
                  </div>
                )}

                {/* Hinos do repertório */}
                <div className="space-y-2">
                  {hinosDoRepertorio.map((hino, idx) => {
                    if (!hino) return null;

                    return (
                      <div
                        key={hino.id}
                        className="bg-gray-50 border border-gray-100 border-l-4 border-l-indigo-500 rounded-2xl p-3 flex items-center gap-3"
                      >
                        <span className="shrink-0 w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-indigo-100 text-indigo-700 font-extrabold flex items-center justify-center tabular-nums text-sm">
                          {idx + 1}
                        </span>

                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-900 text-sm break-words">
                            {hino?.nome || 'Hino desconhecido'}
                          </p>
                          <p className="text-xs text-gray-500 truncate mt-0.5">
                            {hino?.numeroHarpa ? `Harpa nº ${hino.numeroHarpa} • ` : ''}
                            Tom: {hino?.tom || '?'} • {hino?.cantor || '?'}
                          </p>
                        </div>

                        {hino?.letra && (
                          <button
                            onClick={() => abrirLetra(hinosDoRepertorio, idx)}
                            className="shrink-0 px-3.5 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition text-xs font-bold flex items-center gap-1.5 shadow-sm"
                          >
                            <FileText size={14} />
                            Letra
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Total de hinos */}
                {hinosDoRepertorio.length > 0 && (
                  <div className="mt-3 py-2.5 rounded-xl bg-indigo-50 text-indigo-700 text-sm font-bold flex items-center justify-center gap-2">
                    <Music size={15} />
                    Total: {hinosDoRepertorio.length} hinos
                  </div>
                )}
              </Painel>
            );
          })
        )}
      </div>

      {/* Modal de Visualização */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-5 sm:p-6 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-xl sm:text-2xl font-bold break-words">{modalAberto.nome}</h2>
                <p className="text-indigo-100 text-sm mt-1">
                  {ehHoje(modalAberto.data) ? 'Hoje' : formatarData(modalAberto.data)} •{' '}
                  {getHinosCompletos(modalAberto.hinos).length} hino(s)
                </p>
              </div>
              <button
                onClick={() => setModalAberto(null)}
                className="shrink-0 p-2 hover:bg-white/20 rounded-xl transition"
                title="Fechar"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-5 sm:p-6">
              {modalAberto.observacoes && (
                <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl mb-5">
                  <h4 className="font-bold text-amber-900 mb-1 text-sm">Observações</h4>
                  <p className="text-amber-900 text-sm">{modalAberto.observacoes}</p>
                </div>
              )}

              <div className="space-y-2">
                {getHinosCompletos(modalAberto.hinos)
                  .filter(h => h !== null && h !== undefined)
                  .map((hino, idx) => {
                    if (!hino) return null;
                    return (
                      <div
                        key={hino.id}
                        className="bg-indigo-50/60 rounded-2xl p-3 flex items-center gap-3"
                      >
                        <span className="shrink-0 w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 font-extrabold flex items-center justify-center tabular-nums text-sm">
                          {idx + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-900 text-sm break-words">
                            {hino?.nome || 'Hino desconhecido'}
                          </p>
                          <p className="text-xs text-gray-500 truncate mt-0.5">
                            {hino?.numeroHarpa ? `Harpa nº ${hino.numeroHarpa} • ` : ''}
                            Tom: {hino?.tom || '?'} • {hino?.cantor || '?'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
              </div>

              <div className="mt-6 grid grid-cols-3 gap-2">
                <button
                  onClick={() => {
                    handleGerarPdf(modalAberto);
                    setModalAberto(null);
                  }}
                  className="px-3 py-2.5 bg-orange-50 text-orange-700 rounded-xl hover:bg-orange-100 transition font-semibold text-sm flex items-center justify-center gap-1.5"
                >
                  <Download size={16} />
                  PDF
                </button>
                <button
                  onClick={() => {
                    handleCompartilharWhatsApp(modalAberto);
                    setModalAberto(null);
                  }}
                  className="px-3 py-2.5 bg-green-50 text-green-700 rounded-xl hover:bg-green-100 transition font-semibold text-sm flex items-center justify-center gap-1.5"
                >
                  <Share2 size={16} />
                  Enviar
                </button>
                <button
                  onClick={() => setModalAberto(null)}
                  className="px-3 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition font-semibold text-sm"
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-5 sm:p-6 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-xl sm:text-2xl font-bold break-words">
                  {hinoSelecionado?.nome || 'Hino desconhecido'}
                </h2>
                <p className="text-blue-100 text-sm mt-1">
                  Tom: {hinoSelecionado?.tom || '?'} • {hinoSelecionado?.cantor || '?'}
                </p>
                {listaLetra.length > 1 && (
                  <p className="text-blue-200 text-xs mt-1">
                    Hino {indiceLetra + 1} de {listaLetra.length}
                  </p>
                )}
              </div>
              <button
                onClick={fecharLetra}
                className="shrink-0 p-2 hover:bg-white/20 rounded-xl transition"
                title="Fechar"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-5 sm:p-6">
              {/* Controle de tamanho da letra */}
              <div className="flex items-center justify-center gap-3 mb-4">
                <button
                  onClick={() => setTamanhoLetra(t => Math.max(12, t - 2))}
                  title="Diminuir letra"
                  className="p-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition disabled:opacity-40"
                  disabled={tamanhoLetra <= 12}
                >
                  <Minus size={18} />
                </button>
                <span className="text-xs font-semibold text-gray-500 select-none uppercase tracking-wide">
                  Tamanho da letra
                </span>
                <button
                  onClick={() => setTamanhoLetra(t => Math.min(40, t + 2))}
                  title="Aumentar letra"
                  className="p-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition disabled:opacity-40"
                  disabled={tamanhoLetra >= 40}
                >
                  <Plus size={18} />
                </button>
              </div>

              <div className="bg-gray-50 border border-gray-100 p-5 sm:p-6 rounded-2xl">
                <pre
                  className="whitespace-pre-wrap font-sans text-gray-800 leading-relaxed"
                  style={{ fontSize: tamanhoLetra + 'px' }}
                >
                  {hinoSelecionado?.letra || 'Letra não disponível'}
                </pre>
              </div>

              {hinoSelecionado?.observacoes && (
                <div className="mt-5 p-4 bg-amber-50 border border-amber-100 rounded-xl">
                  <h3 className="font-bold text-amber-900 mb-1 text-sm">Observações</h3>
                  <pre className="whitespace-pre-wrap font-sans text-amber-900 text-sm">
                    {hinoSelecionado.observacoes}
                  </pre>
                </div>
              )}

              {listaLetra.length > 1 && (
                <div className="mt-5 flex gap-2">
                  <button
                    onClick={() => irParaLetra(indiceLetra - 1)}
                    disabled={indiceLetra === 0}
                    className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition flex items-center justify-center gap-1 font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={18} /> Anterior
                  </button>
                  <button
                    onClick={() => irParaLetra(indiceLetra + 1)}
                    disabled={indiceLetra >= listaLetra.length - 1}
                    className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition flex items-center justify-center gap-1 font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Próxima <ChevronRight size={18} />
                  </button>
                </div>
              )}

              <button
                onClick={fecharLetra}
                className="mt-2 w-full px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition font-semibold"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
