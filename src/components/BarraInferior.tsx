import React from 'react';
import { Home, PlusCircle, List } from 'lucide-react';
import { menuVisivel } from '../services/menus';

interface BarraInferiorProps {
  currentPage: string;
  onPageChange: (page: string) => void;
  /** Telas desligadas nas configurações. */
  menusOcultos?: string[];
}

/**
 * Barra fixa no rodapé com os atalhos mais usados no ensaio e no culto.
 * Repertórios fica no meio e maior, por ser o acesso principal.
 */
export const BarraInferior: React.FC<BarraInferiorProps> = ({
  currentPage,
  onPageChange,
  menusOcultos
}) => {
  const Atalho = ({ id, label, icon: Icon }: { id: string; label: string; icon: any }) => {
    const ativo = currentPage === id;

    return (
      <button
        onClick={() => onPageChange(id)}
        className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-lg transition active:scale-95 ${
          ativo ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'
        }`}
      >
        <Icon size={18} strokeWidth={ativo ? 2.5 : 2} />
        <span className={`text-[10px] leading-none ${ativo ? 'font-semibold' : 'font-medium'}`}>
          {label}
        </span>
      </button>
    );
  };

  const repertoriosAtivo = currentPage === 'repertorios';

  // Some da barra o atalho de uma tela desligada nas configurações.
  const mostrarRepertorios = menuVisivel('repertorios', menusOcultos);
  const mostrarCadastro = menuVisivel('cadastrar-hino', menusOcultos);

  return (
    <nav
      className="shrink-0 bg-white/95 backdrop-blur border-t border-gray-200 shadow-[0_-1px_8px_rgba(0,0,0,0.05)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="max-w-md mx-auto flex items-center gap-1 px-3 py-1.5">
        <Atalho id="dashboard" label="Home" icon={Home} />

        {/* Repertórios: botão principal, um pouco maior que os outros */}
        {mostrarRepertorios && (
        <button
          onClick={() => onPageChange('repertorios')}
          className={`flex-[1.3] flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl font-semibold shadow-sm transition active:scale-95 ${
            repertoriosAtivo
              ? 'bg-indigo-700 text-white'
              : 'bg-indigo-600 text-white hover:bg-indigo-700'
          }`}
        >
          <List size={17} />
          <span className="text-xs">Repertórios</span>
        </button>
        )}

        {mostrarCadastro && <Atalho id="cadastrar-hino" label="Novo" icon={PlusCircle} />}
      </div>
    </nav>
  );
};
