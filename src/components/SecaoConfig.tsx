import React from 'react';
import { ChevronDown } from 'lucide-react';

interface SecaoConfigProps {
  id: string;
  titulo: string;
  descricao?: string;
  icone: React.ElementType;
  /** Qual seção está aberta agora (só uma por vez). */
  aberta: string | null;
  onAbrir: (id: string) => void;
  children: React.ReactNode;
}

/**
 * Cartão suspenso das Configurações: a tela mostra só os títulos e o conteúdo
 * aparece ao tocar no que a pessoa quer mexer, em vez de uma página enorme.
 */
export const SecaoConfig: React.FC<SecaoConfigProps> = ({
  id,
  titulo,
  descricao,
  icone: Icone,
  aberta,
  onAbrir,
  children,
}) => {
  const estaAberta = aberta === id;

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <button
        onClick={() => onAbrir(estaAberta ? '' : id)}
        aria-expanded={estaAberta}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50 transition"
      >
        <span
          className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition ${
            estaAberta ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-600'
          }`}
        >
          <Icone size={20} />
        </span>

        <span className="flex-1 min-w-0">
          <span className="block font-bold text-gray-900">{titulo}</span>
          {descricao && (
            <span className="block text-xs text-gray-500 truncate">{descricao}</span>
          )}
        </span>

        <ChevronDown
          size={20}
          className={`shrink-0 text-gray-400 transition-transform ${
            estaAberta ? 'rotate-180' : ''
          }`}
        />
      </button>

      {estaAberta && (
        <div className="px-4 pb-5 pt-1 border-t border-gray-100 animate-fade-in">{children}</div>
      )}
    </div>
  );
};
