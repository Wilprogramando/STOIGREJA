import React, { useEffect, useState } from 'react';
import { StickyNote, Plus, Trash2, Pencil, Search, X, Music } from 'lucide-react';
import { Anotacao, listarAnotacoes, salvarAnotacao, excluirAnotacao } from '../services/anotacoes';

const TONS = ['', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const VAZIO = { id: '', hino: '', cantor: '', tom: '', observacoes: '' };

/**
 * Bloco de anotações para sugestões de hinos ouvidas no ensaio:
 * nome do hino, cantor, tom e um comentário.
 */
export const Anotacoes: React.FC = () => {
  const [anotacoes, setAnotacoes] = useState<Anotacao[]>([]);
  const [form, setForm] = useState(VAZIO);
  const [busca, setBusca] = useState('');
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    setAnotacoes(listarAnotacoes());
  }, []);

  const editando = form.id !== '';

  const salvar = () => {
    if (!form.hino.trim()) {
      setAviso('Escreva pelo menos o nome do hino.');
      return;
    }

    salvarAnotacao({
      ...form,
      id: form.id || undefined,
      hino: form.hino.trim(),
      cantor: form.cantor.trim(),
      tom: form.tom.trim(),
      observacoes: form.observacoes.trim(),
      criadoEm: editando
        ? anotacoes.find(a => a.id === form.id)?.criadoEm || new Date().toISOString()
        : new Date().toISOString()
    });

    setAnotacoes(listarAnotacoes());
    setForm(VAZIO);
    setAviso(null);
  };

  const editar = (anotacao: Anotacao) => {
    setForm({
      id: anotacao.id,
      hino: anotacao.hino,
      cantor: anotacao.cantor,
      tom: anotacao.tom,
      observacoes: anotacao.observacoes
    });
    setAviso(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const excluir = (anotacao: Anotacao) => {
    if (!confirm(`Apagar a anotação "${anotacao.hino}"?`)) return;
    excluirAnotacao(anotacao.id);
    setAnotacoes(listarAnotacoes());
    if (form.id === anotacao.id) setForm(VAZIO);
  };

  const termo = busca.trim().toLowerCase();
  const filtradas = termo
    ? anotacoes.filter(a =>
        [a.hino, a.cantor, a.observacoes].some(campo => (campo || '').toLowerCase().includes(termo))
      )
    : anotacoes;

  const formatarData = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('pt-BR');
    } catch {
      return '';
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-800 flex items-center gap-2">
          <StickyNote size={28} className="text-indigo-600" />
          Anotações
        </h2>
        <p className="text-gray-500">
          Anote sugestões de hinos durante o ensaio para não esquecer depois.
        </p>
      </div>

      {/* Formulário */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <h3 className="font-semibold text-gray-800 mb-3">
          {editando ? 'Editar anotação' : 'Nova anotação'}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Hino *</label>
            <input
              value={form.hino}
              onChange={e => setForm({ ...form, hino: e.target.value })}
              placeholder="Nome do hino"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tom</label>
            <select
              value={form.tom}
              onChange={e => setForm({ ...form, tom: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              {TONS.map(t => (
                <option key={t || 'sem'} value={t}>
                  {t || 'Não sei ainda'}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Cantor</label>
            <input
              value={form.cantor}
              onChange={e => setForm({ ...form, cantor: e.target.value })}
              placeholder="Quem canta / de quem é o hino"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="md:col-span-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
            <textarea
              value={form.observacoes}
              onChange={e => setForm({ ...form, observacoes: e.target.value })}
              rows={3}
              placeholder="Ex.: bom para abertura, ensaiar com o coral, achei no YouTube..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        {aviso && <p className="mt-2 text-sm text-red-600">{aviso}</p>}

        <div className="flex gap-2 mt-4">
          <button
            onClick={salvar}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700"
          >
            <Plus size={18} />
            {editando ? 'Salvar alteração' : 'Adicionar anotação'}
          </button>

          {editando && (
            <button
              onClick={() => {
                setForm(VAZIO);
                setAviso(null);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              <X size={18} /> Cancelar
            </button>
          )}
        </div>
      </div>

      {/* Busca */}
      {anotacoes.length > 0 && (
        <div className="relative mb-4">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Procurar por hino, cantor ou observação"
            className="w-full border border-gray-300 rounded-lg pl-10 pr-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>
      )}

      {/* Lista */}
      {filtradas.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-500">
          {anotacoes.length === 0
            ? 'Nenhuma anotação ainda. Anote a primeira sugestão de hino acima.'
            : 'Nenhuma anotação encontrada com essa busca.'}
        </div>
      ) : (
        <div className="space-y-3">
          {filtradas.map(anotacao => (
            <div
              key={anotacao.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex items-start gap-3"
            >
              <Music size={20} className="text-indigo-500 mt-1 shrink-0" />

              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-gray-900">{anotacao.hino}</h4>
                <p className="text-sm text-gray-600">
                  {anotacao.cantor && <>👤 {anotacao.cantor}</>}
                  {anotacao.cantor && anotacao.tom && ' • '}
                  {anotacao.tom && <>🎵 Tom {anotacao.tom}</>}
                </p>
                {anotacao.observacoes && (
                  <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">
                    {anotacao.observacoes}
                  </p>
                )}
                <p className="text-xs text-gray-400 mt-2">
                  Anotado em {formatarData(anotacao.criadoEm)}
                </p>
              </div>

              <div className="flex gap-1">
                <button
                  onClick={() => editar(anotacao)}
                  title="Editar anotação"
                  className="p-2 text-indigo-600 hover:bg-indigo-50 rounded"
                >
                  <Pencil size={18} />
                </button>
                <button
                  onClick={() => excluir(anotacao)}
                  title="Apagar anotação"
                  className="p-2 text-red-600 hover:bg-red-50 rounded"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-500 mt-4">
        As anotações ficam salvas neste aparelho, e continuam disponíveis sem internet.
      </p>
    </div>
  );
};
