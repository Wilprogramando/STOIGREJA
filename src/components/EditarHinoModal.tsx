import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { Hino } from '../types';
import { updateHino } from '../services/db';
import { lerCantores, sincronizarCantoresDosHinos } from '../services/cantores';

interface EditarHinoModalProps {
  hino: Hino;
  onClose: () => void;
  onSaved: (hino: Hino) => void;
}

const TONS = [
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B',
  'Cm',
  'C#m',
  'Dm',
  'D#m',
  'Em',
  'Fm',
  'F#m',
  'Gm',
  'G#m',
  'Am',
  'A#m',
  'Bm'
];

/**
 * Edição rápida do hino direto de dentro do repertório:
 * muda o tom, o cantor e o resto sem sair da tela.
 */
export const EditarHinoModal: React.FC<EditarHinoModalProps> = ({ hino, onClose, onSaved }) => {
  const [nome, setNome] = useState(hino.nome || '');
  const [tom, setTom] = useState(hino.tom || '');
  const [cantor, setCantor] = useState(hino.cantor || '');
  const [cantores, setCantores] = useState<string[]>(() => lerCantores());

  useEffect(() => {
    // Mantém a lista de cantores em dia com o gerenciador das Configurações.
    sincronizarCantoresDosHinos().then(setCantores);
  }, []);
  const [categoria, setCategoria] = useState(hino.categoria || '');
  const [observacoes, setObservacoes] = useState(hino.observacoes || '');
  const [letra, setLetra] = useState(hino.letra || '');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const salvar = async () => {
    if (!nome.trim()) {
      setErro('O nome do hino não pode ficar vazio.');
      return;
    }

    setSalvando(true);
    setErro(null);

    const atualizado: Hino = {
      ...hino,
      nome: nome.trim(),
      tom: tom.trim(),
      cantor: cantor.trim(),
      categoria: categoria.trim(),
      observacoes: observacoes.trim(),
      letra,
      atualizadoEm: new Date().toISOString()
    };

    try {
      await updateHino(atualizado);
      onSaved(atualizado);
      onClose();
    } catch (e) {
      console.error('Erro ao salvar hino:', e);
      setErro('Não foi possível salvar o hino. Tente novamente.');
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Editar hino</h3>
            {hino.numeroHarpa && (
              <p className="text-xs text-gray-500">Harpa nº {hino.numeroHarpa}</p>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" title="Fechar">
            <X size={22} />
          </button>
        </div>

        <div className="p-4 overflow-y-auto space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome do hino</label>
            <input
              value={nome}
              onChange={e => setNome(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tom</label>
              <select
                value={TONS.includes(tom) ? tom : ''}
                onChange={e => setTom(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="">Sem tom</option>
                {!TONS.includes(tom) && tom && <option value={tom}>{tom}</option>}
                {TONS.map(t => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cantor</label>
              {/* Cantores vêm do gerenciador em Configurações */}
              <select
                value={cantor}
                onChange={e => setCantor(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="">Selecione o cantor</option>
                {cantor && !cantores.includes(cantor) && <option value={cantor}>{cantor}</option>}
                {cantores.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
              <input
                value={categoria}
                onChange={e => setCategoria(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
            <input
              value={observacoes}
              onChange={e => setObservacoes(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Letra</label>
            <textarea
              value={letra}
              onChange={e => setLetra(e.target.value)}
              rows={8}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 font-mono text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          {erro && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
              {erro}
            </div>
          )}

          <p className="text-xs text-gray-500">
            A alteração vale para o hino em todos os repertórios, inclusive nos já salvos.
          </p>
        </div>

        <div className="flex justify-end gap-2 p-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={salvar}
            disabled={salvando}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            <Save size={18} />
            {salvando ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
};
