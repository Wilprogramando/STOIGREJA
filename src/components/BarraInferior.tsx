import React from 'react';
import { StickyNote, Guitar, List } from 'lucide-react';

interface BarraInferiorProps {
  currentPage: string;
  onPageChange: (page: string) => void;
}

/**
 * Barra fixa no rodapé com os atalhos mais usados no ensaio e no culto.
 * Repertórios fica no meio e maior, por ser o acesso principal.
 */
export const BarraInferior: React.FC<BarraInferiorProps> = ({ currentPage, onPageChange }) => {
  const Atalho = ({ id, label, icon: Icon }: { id: string; label: string; icon: any }) => {
    const ativo = currentPage === id;

    return (
      <button
        onClick={() => onPageChange(id)}
        className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 rounded-xl transition ${
          ativo ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        <Icon size={22} />
        <span className={`text-xs ${ativo ? 'font-bold' : 'font-medium'}`}>{label}</span>
      </button>
    );
  };

  const repertoriosAtivo = currentPage === 'repertorios';

  return (
    <nav className="shrink-0 bg-white border-t border-gray-200 shadow-[0_-2px_10px_rgba(0,0,0,0.06)]">
      <div className="max-w-3xl mx-auto flex items-center gap-2 px-4 py-2">
        <Atalho id="anotacoes" label="Anotações" icon={StickyNote} />

        {/* Repertórios: botão principal, maior que os outros */}
        <button
          onClick={() => onPageChange('repertorios')}
          className={`flex-[1.6] flex items-center justify-center gap-2 py-3 px-4 rounded-2xl font-bold shadow-md transition ${
            repertoriosAtivo
              ? 'bg-indigo-700 text-white'
              : 'bg-indigo-600 text-white hover:bg-indigo-700'
          }`}
        >
          <List size={22} />
          <span className="text-sm">Repertórios</span>
        </button>

        <Atalho id="afinador" label="Afinador" icon={Guitar} />
      </div>
    </nav>
  );
};
