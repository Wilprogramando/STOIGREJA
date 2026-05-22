import React, { useState, useEffect } from 'react';
import { Plus, Trash2, ArrowUp, ArrowDown, Download, Share2, Save, X } from 'lucide-react';
import { getAllHinos, addRepertorio, updateRepertorio } from '../services/db';
import { generateRepertorioPdf, shareViaWhatsApp } from '../services/pdf';
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

  useEffect(() => {
    loadHinos();
    if (repertorioAtual) {
      setFormData({
        nome: repertorioAtual.nome,
        data: repertorioAtual.data,
        horario: repertorioAtual.horario || '',
        observacoes: repertorioAtual.observacoes || ''
      });
      setHinosNoRepertorio(repertorioAtual.hinos);
    }
  }, [repertorioAtual]);

  const loadHinos = async () => {
    const todos = await getAllHinos();
    setHinos(todos);
  };

  const hinosFiltrados = hinos.filter(h =>
    h.nome.toLowerCase().includes(hinoFiltrado.toLowerCase()) ||
    h.numeroHarpa?.toString().includes(hinoFiltrado)
  );

  const handleAddHino = (hino: Hino) => {
    const novaOrdem = Math.max(...hinosNoRepertorio.map(h => h.ordem), 0) + 1;
    const novoItem: HinoNoRepertorio = {
      id: Date.now().toString(),
      hinoId: hino.id,
      ordem: novaOrdem,
      nome: hino.nome,
      tom: hino.tom,
      cantor: hino.cantor,
      letra: hino.letra,
      numeroHarpa: hino.numeroHarpa,
      observacoes: hino.observacoes
    };
    setHinosNoRepertorio([...hinosNoRepertorio, novoItem]);
    setHinoFiltrado('');
    setShowSelectHino(false);
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

  const handleAlterarTom = (id: string, novoTom: string) => {
    setHinosNoRepertorio(
      hinosNoRepertorio.map(h => h.id === id ? { ...h, tom: novoTom } : h)
    );
  };

  const handleAlterarCantor = (id: string, novoCantor: string) => {
    setHinosNoRepertorio(
      hinosNoRepertorio.map(h => h.id === id ? { ...h, cantor: novoCantor } : h)
    );
  };

  const handleSalvar = async () => {
    if (!formData.nome || hinosNoRepertorio.length === 0) {
      alert('Preencha o nome e adicione pelo menos um hino!');
      return;
    }

    try {
      const agora = new Date().toISOString();
      const repertorio: Repertorio = {
        id: repertorioAtual?.id || Date.now().toString(),
        nome: formData.nome,
        data: formData.data,
        horario: formData.horario || undefined,
        observacoes: formData.observacoes || undefined,
        hinos: hinosNoRepertorio.sort((a, b) => a.ordem - b.ordem),
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
      console.error('Erro ao salvar repertório:', error);
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

  const TONS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  return (
    <div className="max-w-6xl mx-auto">
      <h2 className="text-3xl font-bold text-gray-900 mb-8">
        {repertorioAtual ? 'Editar Repertório' : 'Montar Novo Repertório'}
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Formulário */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Informações do Repertório</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Repertório *</label>
                <input
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-600"
                  placeholder="Ex: Culto de Domingo"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data *</label>
                  <input
                    type="date"
                    value={formData.data}
                    onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Horário</label>
                  <input
                    type="time"
                    value={formData.horario}
                    onChange={(e) => setFormData({ ...formData, horario: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
                <textarea
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-600"
                  placeholder="Observações sobre o culto"
                />
              </div>
            </div>
          </div>

          {/* Lista de Hinos */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Sequência de Hinos</h3>
              <button
                onClick={() => setShowSelectHino(!showSelectHino)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center gap-2"
              >
                <Plus size={20} />
                Adicionar
              </button>
            </div>

            {showSelectHino && (
              <div className="mb-6 p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                <label className="block text-sm font-medium text-gray-700 mb-2">Buscar hino</label>
                <input
                  type="text"
                  value={hinoFiltrado}
                  onChange={(e) => setHinoFiltrado(e.target.value)}
                  placeholder="Digite o nome ou número do hino..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-600 mb-3"
                />

                {hinoFiltrado && (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {hinosFiltrados.length === 0 ? (
                      <p className="text-gray-500 text-sm">Nenhum hino encontrado</p>
                    ) : (
                      hinosFiltrados.map(h => (
                        <button
                          key={h.id}
                          onClick={() => handleAddHino(h)}
                          className="w-full text-left p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                        >
                          <div className="font-medium text-gray-900">
                            {h.numeroHarpa && `Harpa nº ${h.numeroHarpa} - `}
                            {h.nome}
                          </div>
                          <div className="text-sm text-gray-600">
                            Tom: {h.tom} | Cantor: {h.cantor}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}

            {hinosNoRepertorio.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <p className="text-gray-500">Nenhum hino adicionado. Clique em "Adicionar" para começar.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {hinosNoRepertorio
                  .sort((a, b) => a.ordem - b.ordem)
                  .map((hinoRep, index) => (
                    <div
                      key={hinoRep.id}
                      className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl font-bold text-indigo-600 w-8">{hinoRep.ordem}</span>
                            <div>
                              <p className="font-bold text-gray-900">{hinoRep.nome}</p>
                              {hinoRep.numeroHarpa && (
                                <p className="text-sm text-gray-500">Harpa nº {hinoRep.numeroHarpa}</p>
                              )}
                            </div>
                          </div>

                          <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                            <div>
                              <label className="text-sm font-medium text-gray-700">Tom</label>
                              <select
                                value={hinoRep.tom}
                                onChange={(e) => handleAlterarTom(hinoRep.id, e.target.value)}
                                className="w-full px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:border-indigo-600"
                              >
                                {TONS.map(t => (
                                  <option key={t} value={t}>{t}</option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="text-sm font-medium text-gray-700">Cantor</label>
                              <input
                                type="text"
                                value={hinoRep.cantor}
                                onChange={(e) => handleAlterarCantor(hinoRep.id, e.target.value)}
                                className="w-full px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:border-indigo-600"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-1 ml-4">
                          <button
                            onClick={() => handleMoverCima(hinoRep.id)}
                            disabled={index === 0}
                            className="p-2 hover:bg-white rounded disabled:opacity-50"
                            title="Mover para cima"
                          >
                            <ArrowUp size={18} />
                          </button>
                          <button
                            onClick={() => handleMoverBaixo(hinoRep.id)}
                            disabled={index === hinosNoRepertorio.length - 1}
                            className="p-2 hover:bg-white rounded disabled:opacity-50"
                            title="Mover para baixo"
                          >
                            <ArrowDown size={18} />
                          </button>
                          <button
                            onClick={() => handleRemoveHino(hinoRep.id)}
                            className="p-2 hover:bg-red-100 text-red-600 rounded"
                            title="Remover"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* Painel Lateral */}
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Opções de PDF</h3>

            <label className="flex items-center gap-2 mb-4 cursor-pointer">
              <input
                type="checkbox"
                checked={incluirLetras}
                onChange={(e) => setIncluirLetras(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300"
              />
              <span className="text-sm text-gray-700">Incluir letras completas no PDF</span>
            </label>

            <div className="space-y-2">
              <button
                onClick={handleGerarPdf}
                disabled={hinosNoRepertorio.length === 0}
                className="w-full px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
              >
                <Download size={20} />
                Gerar PDF
              </button>

              <button
                onClick={handleCompartilharWhatsApp}
                disabled={hinosNoRepertorio.length === 0}
                className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
              >
                <Share2 size={20} />
                Compartilhar
              </button>

              <button
                onClick={handleSalvar}
                disabled={!formData.nome || hinosNoRepertorio.length === 0}
                className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
              >
                <Save size={20} />
                Salvar Repertório
              </button>
            </div>
          </div>

          <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
            <h4 className="font-bold text-indigo-900 mb-2">Resumo</h4>
            <div className="text-sm text-indigo-800 space-y-1">
              <p>📅 Data: {new Date(formData.data).toLocaleDateString('pt-BR')}</p>
              <p>🎵 Hinos: {hinosNoRepertorio.length}</p>
              <p>⏱️ Horário: {formData.horario || 'Não definido'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
