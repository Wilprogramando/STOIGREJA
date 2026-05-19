import React from 'react';
import { X } from 'lucide-react';
import { Hino } from '../types';

interface ModalVisualizaLetraProps {
  hino: Hino;
  onClose: () => void;
}

export const ModalVisualizaLetra: React.FC<ModalVisualizaLetraProps> = ({ hino, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-auto">
        <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">{hino.nome}</h2>
            <p className="text-indigo-100 mt-1">
              Tom: {hino.tom} | Cantor: {hino.cantor}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6">
          <div className="bg-gray-50 p-6 rounded-lg">
            <pre className="whitespace-pre-wrap font-sans text-gray-800 leading-relaxed text-lg">
              {hino.letra}
            </pre>
          </div>

          {hino.observacoes && (
            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h3 className="font-bold text-yellow-900 mb-2">Observações</h3>
              <pre className="whitespace-pre-wrap font-sans text-yellow-800">
                {hino.observacoes}
              </pre>
            </div>
          )}

          <div className="mt-6 flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
