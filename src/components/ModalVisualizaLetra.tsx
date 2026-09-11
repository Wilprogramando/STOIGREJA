import React, { useState } from 'react';
import { X, Plus, Minus, ChevronLeft, ChevronRight } from 'lucide-react';
import { Hino } from '../types';

// Tamanho inicial da letra (px). Ao fechar e abrir a letra, volta para este valor.
export const TAMANHO_LETRA_PADRAO = 18;
const TAMANHO_LETRA_MIN = 12;
const TAMANHO_LETRA_MAX = 40;

interface ModalVisualizaLetraProps {
  hino: Hino;
  onClose: () => void;
  /** Posição do hino dentro de uma lista (para navegar entre as letras). */
  indice?: number;
  total?: number;
  onNavegar?: (novoIndice: number) => void;
  /** Botões extras no rodapé (ex.: guardar nas anotações). */
  children?: React.ReactNode;
}

export const ModalVisualizaLetra: React.FC<ModalVisualizaLetraProps> = ({
  hino,
  onClose,
  indice,
  total,
  onNavegar,
  children
}) => {
  const [tamanhoLetra, setTamanhoLetra] = useState<number>(TAMANHO_LETRA_PADRAO);
  const temNavegacao = typeof indice === 'number' && typeof total === 'number' && total > 1 && !!onNavegar;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-auto">
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-5 sm:p-6 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-xl sm:text-2xl font-bold break-words">
              {hino?.nome || 'Hino desconhecido'}
            </h2>
            <p className="text-blue-100 text-sm mt-1">
              {[hino?.tom ? 'Tom: ' + hino.tom : null, hino?.cantor || null]
                .filter(Boolean)
                .join(' • ') || 'Letra'}
            </p>
            {temNavegacao && (
              <p className="text-blue-200 text-xs mt-1">
                Hino {(indice as number) + 1} de {total}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
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
              onClick={() => setTamanhoLetra(t => Math.max(TAMANHO_LETRA_MIN, t - 2))}
              title="Diminuir letra"
              className="p-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition disabled:opacity-40"
              disabled={tamanhoLetra <= TAMANHO_LETRA_MIN}
            >
              <Minus size={18} />
            </button>
            <span className="text-xs font-semibold text-gray-500 select-none uppercase tracking-wide">
              Tamanho da letra
            </span>
            <button
              onClick={() => setTamanhoLetra(t => Math.min(TAMANHO_LETRA_MAX, t + 2))}
              title="Aumentar letra"
              className="p-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition disabled:opacity-40"
              disabled={tamanhoLetra >= TAMANHO_LETRA_MAX}
            >
              <Plus size={18} />
            </button>
          </div>

          <div className="bg-gray-50 border border-gray-100 p-5 sm:p-6 rounded-2xl">
            <pre
              className="whitespace-pre-wrap font-sans text-gray-800 leading-relaxed"
              style={{ fontSize: tamanhoLetra + 'px' }}
            >
              {hino?.letra || 'Letra não disponível'}
            </pre>
          </div>

          {hino?.observacoes && (
            <div className="mt-5 p-4 bg-amber-50 border border-amber-100 rounded-xl">
              <h3 className="font-bold text-amber-900 mb-1 text-sm">Observações</h3>
              <pre className="whitespace-pre-wrap font-sans text-amber-900 text-sm">
                {hino.observacoes}
              </pre>
            </div>
          )}

          {temNavegacao && (
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => onNavegar!((indice as number) - 1)}
                disabled={indice === 0}
                className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition flex items-center justify-center gap-1 font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={18} /> Anterior
              </button>
              <button
                onClick={() => onNavegar!((indice as number) + 1)}
                disabled={(indice as number) >= (total as number) - 1}
                className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition flex items-center justify-center gap-1 font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Próxima <ChevronRight size={18} />
              </button>
            </div>
          )}

          {children}

          <button
            onClick={onClose}
            className="mt-2 w-full px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition font-semibold"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
