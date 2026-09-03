import React, { useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Download,
  Share2,
  Save,
  X,
  Pencil,
  ListMusic,
  BookOpen,
  Music2,
  Search
} from 'lucide-react';
import { getAllHinos, addRepertorio, updateRepertorio } from '../services/db';
import { generateRepertorioPdf, shareViaWhatsApp } from '../services/pdf';
import { EditarHinoModal } from './EditarHinoModal';
import { Hino, HinoNoRepertorio, Repertorio, Configuracoes } from '../types';

interface MontarRepertorioProps {
  repertorioAtual?: Repertorio | null;
  configuracoes: Configuracoes | null;
  onSave?: () => void;
}

export const MontarRepertorio: React.FC<MontarRepertorioProps> = ({
  repertorioAtual,
  configuracoes,
  onSave
}) => {
  const [hinos, setHinos] = useState<Hino[]>([]);
  const [hinosNoRepertorio, setHinosNoRepertorio] = useState<HinoNoRepertorio[]>([]);
  const [formData, setFormData] = useState({
    nome: '',
    data: new Date().toISOString().split('T')[0],
    horario: '',
    observacoes: ''
  });
  const [incluirLetras, setIncluirLetras] = useState(false);
  const [hinoFiltrado, setHinoFiltrado] = useState('');
  const [showSelectHino, setShowSelectHino] = useState(false);
  const [tipoSelecionado, setTipoSelecionado] = useState<'comum' | 'harpa' | null>(null);
  const [repertorioCarregado, setRepertorioCarregado] = useState(false);
  const [hinoEditando, setHinoEditando] = useState<Hino | null>(null);

  useEffect(() => {
    loadHinos();
  }, []);

  useEffect(() => {
    if (repertorioAtual?.id) {
      console.log('✏️ Editando repertório:', repertorioAtual.nome);
      console.log('📋 Hinos recebidos:', repertorioAtual.hinos);

      setFormData({
        nome: repertorioAtual.nome,
        data: repertorioAtual.data,
        horario: repertorioAtual.horario || '',
        observacoes: repertorioAtual.observacoes || ''
      });

      const hinosProcessados = (repertorioAtual.hinos || []).map((h: any, idx: number) => {
        // Se h é string (ID), buscar dados do hino
        if (typeof h === 'string') {
          const hinoCompleto = hinos.find(hi => hi.id === h);
          return {
            id: `hino-rep-${idx}-${Date.now()}`,
            hinoId: h,
            ordem: idx + 1,
            nome: hinoCompleto?.nome || '(Hino não encontrado)',
            tom: hinoCompleto?.tom || 'C',
            cantor: hinoCompleto?.cantor || '',
            letra: hinoCompleto?.letra || '',
            numeroHarpa: hinoCompleto?.numeroHarpa || null,
            observacoes: hinoCompleto?.observacoes || ''
          };
        }

        // Se h é objeto (dados completos)
        const hinoIdReal = h.hinoId && !h.hinoId.startsWith('hino-')
          ? h.hinoId
          : (h.id && !h.id.startsWith('hino-') ? h.id : '');

        return {
          id: h.id || `hino-rep-${idx}-${Date.now()}`,
          hinoId: hinoIdReal,
          ordem: h.ordem ?? idx + 1,
          nome: h.nome || '',
          tom: h.tom || 'C',
          cantor: h.cantor || '',
          letra: h.letra || '',
          numeroHarpa: h.numeroHarpa || null,
          observacoes: h.observacoes || ''
        };
      });

      console.log('✅ Hinos processados:', hinosProcessados.length);
      setHinosNoRepertorio(hinosProcessados);
      setRepertorioCarregado(true);
    } else if (repertorioAtual === null || repertorioAtual === undefined) {
      if (repertorioCarregado) {
        console.log('🔄 Limpando formulário');
        setFormData({
          nome: '',
          data: new Date().toISOString().split('T')[0],
          horario: '',
          observacoes: ''
        });
        setHinosNoRepertorio([]);
        setRepertorioCarregado(false);
      }
    }
  }, [repertorioAtual?.id, repertorioAtual?.hinos?.length, hinos]);

  const loadHinos = async () => {
    const todos = await getAllHinos();
    setHinos(todos);
  };

  const hinosFiltrados = hinos
    .filter(h => {
      // Se tipo selecionado, filtrar por tipo
      if (tipoSelecionado === 'harpa') {
        return h.tipo === 'harpa' && (h.nome.toLowerCase().includes(hinoFiltrado.toLowerCase()) || h.numeroHarpa?.toString().includes(hinoFiltrado));
      } else if (tipoSelecionado === 'comum') {
        return h.tipo !== 'harpa' && h.nome.toLowerCase().includes(hinoFiltrado.toLowerCase());
      }
      // Se nenhum tipo selecionado, mostrar todos
      return h.nome.toLowerCase().includes(hinoFiltrado.toLowerCase()) || h.numeroHarpa?.toString().includes(hinoFiltrado);
    })
    // Harpa em ordem de numero; os comuns em ordem alfabetica.
    .sort((a, b) => {
      if (a.numeroHarpa && b.numeroHarpa) return a.numeroHarpa - b.numeroHarpa;
      return a.nome.localeCompare(b.nome, 'pt-BR');
    });

  /** Ids dos hinos que ja estao no repertorio, para marcar na lista. */
  const idsJaAdicionados = new Set(
    hinosNoRepertorio.map(h => (h.hinoId && !h.hinoId.startsWith('hino-') ? h.hinoId : h.id))
  );

  const handleAddHino = (hino: Hino) => {
    const novaOrdem = Math.max(...hinosNoRepertorio.map(h => h.ordem), 0) + 1;
    const novoItem: HinoNoRepertorio = {
      id: `${hino.id}-${Date.now()}`, // ID único para o item
      hinoId: hino.id, // SEMPRE o ID real do hino
      ordem: novaOrdem,
      nome: hino.nome,
      tom: hino.tom,
      cantor: hino.cantor,
      letra: hino.letra,
      numeroHarpa: hino.numeroHarpa,
      observacoes: hino.observacoes
    };
    console.log('➕ Adicionando hino:', novoItem);
    const novaLista = [...hinosNoRepertorio, novoItem];
    // Ordenar: hinos comuns primeiro (sem numeroHarpa), depois harpa
    novaLista.sort((a, b) => {
      const aEhComum = !a.numeroHarpa;
      const bEhComum = !b.numeroHarpa;
      if (aEhComum && !bEhComum) return -1; // a é comum, b é harpa
      if (!aEhComum && bEhComum) return 1;  // a é harpa, b é comum
      return a.ordem - b.ordem; // mesmo tipo, manter ordem
    });
    // Reordenar números após sort
    novaLista.forEach((h, idx) => h.ordem = idx + 1);
    setHinosNoRepertorio(novaLista);
    // Mantem o painel aberto para adicionar varios hinos seguidos.
    setHinoFiltrado('');
  };

  const handleRemoveHino = (id: string) => {
    setHinosNoRepertorio(hinosNoRepertorio.filter(h => h.id !== id));
  };

  const handleMoverCima = (id: string) => {
    const index = hinosNoRepertorio.findIndex(h => h.id === id);
    if (index > 0) {
      const novaLista = [...hinosNoRepertorio];
      [novaLista[index - 1].ordem, novaLista[index].ordem] = [novaLista[index].ordem, novaLista[index - 1].ordem];
      novaLista.sort((a, b) => a.ordem - b.ordem);
      setHinosNoRepertorio(novaLista);
    }
  };

  const handleMoverBaixo = (id: string) => {
    const index = hinosNoRepertorio.findIndex(h => h.id === id);
    if (index < hinosNoRepertorio.length - 1) {
      const novaLista = [...hinosNoRepertorio];
      [novaLista[index].ordem, novaLista[index + 1].ordem] = [novaLista[index + 1].ordem, novaLista[index].ordem];
      novaLista.sort((a, b) => a.ordem - b.ordem);
      setHinosNoRepertorio(novaLista);
    }
  };

  /** Abre a edição do cadastro do hino a partir da linha do repertório. */
  const abrirEdicaoDoHino = (hinoRep: HinoNoRepertorio) => {
    const idReal = hinoRep.hinoId && !hinoRep.hinoId.startsWith('hino-') ? hinoRep.hinoId : hinoRep.id;
    const cadastro = hinos.find(h => h.id === idReal);

    if (!cadastro) {
      alert('Este hino não foi encontrado no cadastro, então não dá para editar por aqui.');
      return;
    }

    setHinoEditando(cadastro);
  };

  /** Depois de salvar o hino, atualiza o que está na tela. */
  const aplicarHinoEditado = (hinoAtualizado: Hino) => {
    setHinos(anteriores =>
      anteriores.map(h => (h.id === hinoAtualizado.id ? hinoAtualizado : h))
    );

    setHinosNoRepertorio(anteriores =>
      anteriores.map(h => {
        const idReal = h.hinoId && !h.hinoId.startsWith('hino-') ? h.hinoId : h.id;
        if (idReal !== hinoAtualizado.id) return h;
        return {
          ...h,
          nome: hinoAtualizado.nome,
          tom: hinoAtualizado.tom,
          cantor: hinoAtualizado.cantor,
          letra: hinoAtualizado.letra,
          observacoes: hinoAtualizado.observacoes
        };
      })
    );
  };

  const handleSalvar = async () => {
    if (!formData.nome || hinosNoRepertorio.length === 0) {
      alert('Preencha o nome e adicione pelo menos um hino!');
      return;
    }

    try {
      const agora = new Date().toISOString();

      // Validar que todos os hinos têm hinoId válido
      const hinosComIds = hinosNoRepertorio.map(h => {
        const hinoIdFinal = h.hinoId && !h.hinoId.startsWith('hino-') ? h.hinoId : h.id;
        return {
          ...h,
          hinoId: hinoIdFinal
        };
      });

      // Verificar se algum hino ainda tem ID temporário
      const temIdTemporario = hinosComIds.some(h => h.hinoId.startsWith('hino-'));
      if (temIdTemporario) {
        alert('Erro: Alguns hinos não foram adicionados corretamente. Tente remover e adicionar novamente.');
        return;
      }

      console.log('📝 Salvando repertório:', {
        nome: formData.nome,
        data: formData.data,
        total_hinos: hinosComIds.length,
        hinos: hinosComIds.map(h => ({ id: h.id, hinoId: h.hinoId, nome: h.nome, ordem: h.ordem }))
      });

      const repertorio: Repertorio = {
        id: repertorioAtual?.id || Date.now().toString(),
        nome: formData.nome,
        data: formData.data,
        horario: formData.horario || undefined,
        observacoes: formData.observacoes || undefined,
        hinos: hinosComIds.sort((a, b) => a.ordem - b.ordem),
        criadoEm: repertorioAtual?.criadoEm || agora,
        atualizadoEm: agora
      };

      if (repertorioAtual) {
        await updateRepertorio(repertorio);
        alert('Repertório atualizado com sucesso!');
      } else {
        await addRepertorio(repertorio);
        alert('Repertório salvo com sucesso!');
      }

      if (onSave) onSave();
    } catch (error) {
      console.error('❌ Erro ao salvar repertório:', error);
      alert('Erro ao salvar repertório');
    }
  };

  const handleGerarPdf = async () => {
    if (hinosNoRepertorio.length === 0) {
      alert('Adicione pelo menos um hino!');
      return;
    }

    try {
      const agora = new Date().toISOString();
      const repertorio: Repertorio = {
        id: Date.now().toString(),
        nome: formData.nome || 'Repertório',
        data: formData.data,
        horario: formData.horario || undefined,
        observacoes: formData.observacoes || undefined,
        hinos: hinosNoRepertorio.sort((a, b) => a.ordem - b.ordem),
        criadoEm: agora,
        atualizadoEm: agora
      };

      await generateRepertorioPdf(repertorio, configuracoes, incluirLetras, configuracoes?.logo);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Erro ao gerar PDF');
    }
  };

  const handleCompartilharWhatsApp = async () => {
    if (hinosNoRepertorio.length === 0) {
      alert('Adicione pelo menos um hino!');
      return;
    }

    const agora = new Date().toISOString();
    const repertorio: Repertorio = {
      id: Date.now().toString(),
      nome: formData.nome || 'Repertório',
      data: formData.data,
      horario: formData.horario || undefined,
      observacoes: formData.observacoes || undefined,
      hinos: hinosNoRepertorio.sort((a, b) => a.ordem - b.ordem),
      criadoEm: agora,
      atualizadoEm: agora
    };

    const message = `*${formData.nome || 'Repertório'}*\n\nData: ${formData.data}\n${formData.horario ? `Horário: ${formData.horario}\n` : ''}\nHinos:\n${hinosNoRepertorio.map((h, i) => `${i + 1}. ${h.nome} (Tom: ${h.tom})`).join('\n')}`;
    shareViaWhatsApp(message);
  };

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
    'w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition';

  return (
    <div className="max-w-6xl mx-auto pb-20">
      {/* Cabeçalho */}
      <div className="flex items-start gap-3 mb-5">
        <div className="bg-indigo-50 text-indigo-600 p-2.5 rounded-xl shrink-0">
          <ListMusic size={22} />
        </div>
        <div className="min-w-0">
          <h2 className="text-2xl font-bold text-gray-900">
            {repertorioAtual ? 'Editar Repertório' : 'Montar Novo Repertório'}
          </h2>
          <p className="text-sm text-gray-500">
            Preencha os dados do culto e monte a sequência de hinos
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Coluna principal */}
        <div className="lg:col-span-2 space-y-5">
          {/* Informações do repertório */}
          <Painel className="p-4 sm:p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Informações do Repertório</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Nome do Repertório *
                </label>
                <input
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className={campo}
                  placeholder="Ex: Culto de Domingo"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Data *</label>
                  <input
                    type="date"
                    value={formData.data}
                    onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                    className={campo}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Horário</label>
                  <input
                    type="time"
                    value={formData.horario}
                    onChange={(e) => setFormData({ ...formData, horario: e.target.value })}
                    className={campo}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Observações</label>
                <textarea
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  rows={3}
                  className={campo}
                  placeholder="Observações sobre o culto"
                />
              </div>
            </div>
          </Painel>

          {/* Sequência de hinos */}
          <Painel className="p-4 sm:p-6">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h3 className="text-lg font-bold text-gray-900">Sequência de Hinos</h3>
              <span className="shrink-0 text-xs font-bold text-indigo-700 bg-indigo-100 px-2.5 py-1 rounded-full">
                {hinosNoRepertorio.length} hino(s)
              </span>
            </div>

            {/* Botões de adicionar */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <button
                onClick={() => {
                  setTipoSelecionado('comum');
                  setShowSelectHino(true);
                }}
                className={`px-3 py-3 rounded-xl font-semibold text-sm transition flex items-center justify-center gap-2 ${
                  tipoSelecionado === 'comum'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                }`}
              >
                <Plus size={18} />
                Hinos Comuns
              </button>
              <button
                onClick={() => {
                  setTipoSelecionado('harpa');
                  setShowSelectHino(true);
                }}
                className={`px-3 py-3 rounded-xl font-semibold text-sm transition flex items-center justify-center gap-2 ${
                  tipoSelecionado === 'harpa'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                }`}
              >
                <Plus size={18} />
                Hinos da Harpa
              </button>
            </div>

            {/* Painel de busca */}
            {showSelectHino && (
              <div className="mb-5 p-4 bg-gray-50 rounded-2xl border border-gray-200">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <p className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    {tipoSelecionado === 'harpa' ? (
                      <BookOpen size={16} className="text-purple-600" />
                    ) : (
                      <Music2 size={16} className="text-indigo-600" />
                    )}
                    {tipoSelecionado === 'harpa' ? 'Buscar Hino da Harpa' : 'Buscar Hino Comum'}
                  </p>
                  <button
                    onClick={() => {
                      setShowSelectHino(false);
                      setTipoSelecionado(null);
                      setHinoFiltrado('');
                    }}
                    className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition"
                    title="Fechar"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="relative mb-3">
                  <Search
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                  />
                  <input
                    type="text"
                    value={hinoFiltrado}
                    onChange={(e) => setHinoFiltrado(e.target.value)}
                    placeholder={
                      tipoSelecionado === 'harpa'
                        ? 'Digite o nome ou número da Harpa...'
                        : 'Digite o nome do hino...'
                    }
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl bg-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition"
                    autoFocus
                  />
                </div>

                <p className="text-xs text-gray-500 mb-2">
                  {hinosFiltrados.length} hino(s) — toque para adicionar
                </p>

                {/* A lista fica sempre visivel: da para escolher sem digitar nada. */}
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {hinosFiltrados.length === 0 ? (
                    <p className="text-gray-500 text-sm py-3">Nenhum hino encontrado</p>
                  ) : (
                    hinosFiltrados.map(h => {
                      const jaAdicionado = idsJaAdicionados.has(h.id);

                      return (
                        <button
                          key={h.id}
                          onClick={() => handleAddHino(h)}
                          className={`w-full text-left p-3 rounded-xl border transition ${
                            jaAdicionado
                              ? 'bg-indigo-50 border-indigo-200'
                              : 'bg-white border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/50'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="font-semibold text-gray-900 break-words">
                              {h.numeroHarpa && `Harpa nº ${h.numeroHarpa} - `}
                              {h.nome}
                            </div>
                            {jaAdicionado && (
                              <span className="shrink-0 text-[10px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">
                                JÁ ADICIONADO
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            Tom: {h.tom}{h.cantor && ` • Cantor: ${h.cantor}`}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* Lista do repertório */}
            {hinosNoRepertorio.length === 0 ? (
              <div className="text-center py-10 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                <Music2 className="mx-auto text-gray-300 mb-3" size={36} />
                <p className="text-gray-500 text-sm">
                  Nenhum hino adicionado ainda.
                </p>
                <p className="text-gray-400 text-xs mt-1">
                  Use os botões acima para escolher os hinos.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {hinosNoRepertorio
                  .sort((a, b) => a.ordem - b.ordem)
                  .map((hinoRep, index) => (
                    <div
                      key={hinoRep.id}
                      className="bg-indigo-50/60 rounded-2xl p-3 flex items-center gap-3"
                    >
                      <span className="shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-indigo-100 text-indigo-700 font-extrabold flex items-center justify-center tabular-nums">
                        {hinoRep.ordem}
                      </span>

                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-900 text-sm sm:text-base break-words">
                          {hinoRep.nome}
                        </p>
                        <p className="text-xs text-gray-500 truncate mt-0.5">
                          {hinoRep.numeroHarpa ? `Harpa nº ${hinoRep.numeroHarpa} • ` : ''}
                          Tom: {hinoRep.tom}
                          {hinoRep.cantor && ` • ${hinoRep.cantor}`}
                        </p>
                      </div>

                      <div className="shrink-0 flex gap-0.5">
                        <button
                          onClick={() => abrirEdicaoDoHino(hinoRep)}
                          className="p-2 text-indigo-600 hover:bg-white rounded-lg transition"
                          title="Editar o cadastro do hino (nome, tom, cantor, letra...)"
                        >
                          <Pencil size={17} />
                        </button>
                        <button
                          onClick={() => handleMoverCima(hinoRep.id)}
                          disabled={index === 0}
                          className="p-2 text-gray-600 hover:bg-white rounded-lg transition disabled:opacity-30 disabled:hover:bg-transparent"
                          title="Mover para cima"
                        >
                          <ArrowUp size={17} />
                        </button>
                        <button
                          onClick={() => handleMoverBaixo(hinoRep.id)}
                          disabled={index === hinosNoRepertorio.length - 1}
                          className="p-2 text-gray-600 hover:bg-white rounded-lg transition disabled:opacity-30 disabled:hover:bg-transparent"
                          title="Mover para baixo"
                        >
                          <ArrowDown size={17} />
                        </button>
                        <button
                          onClick={() => handleRemoveHino(hinoRep.id)}
                          className="p-2 text-red-600 hover:bg-white rounded-lg transition"
                          title="Remover"
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </Painel>
        </div>

        {/* Painel lateral */}
        <div className="space-y-5 lg:sticky lg:top-4 lg:self-start">
          {/* Ações */}
          <Painel className="p-4 sm:p-5">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-3">
              Ações
            </h3>

            <label className="flex items-center gap-2.5 mb-4 cursor-pointer p-2.5 rounded-xl hover:bg-gray-50 transition">
              <input
                type="checkbox"
                checked={incluirLetras}
                onChange={(e) => setIncluirLetras(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-700">Incluir letras completas no PDF</span>
            </label>

            <div className="space-y-2">
              <button
                onClick={handleSalvar}
                disabled={!formData.nome || hinosNoRepertorio.length === 0}
                className="w-full px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-semibold shadow-md"
              >
                <Save size={19} />
                Salvar Repertório
              </button>

              <button
                onClick={handleGerarPdf}
                disabled={hinosNoRepertorio.length === 0}
                className="w-full px-4 py-3 bg-orange-50 text-orange-700 rounded-xl hover:bg-orange-100 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-semibold"
              >
                <Download size={19} />
                Gerar PDF
              </button>

              <button
                onClick={handleCompartilharWhatsApp}
                disabled={hinosNoRepertorio.length === 0}
                className="w-full px-4 py-3 bg-green-50 text-green-700 rounded-xl hover:bg-green-100 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-semibold"
              >
                <Share2 size={19} />
                Compartilhar
              </button>
            </div>
          </Painel>
        </div>
      </div>

      {hinoEditando && (
        <EditarHinoModal
          hino={hinoEditando}
          onClose={() => setHinoEditando(null)}
          onSaved={aplicarHinoEditado}
        />
      )}
    </div>
  );
};
