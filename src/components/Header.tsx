import React from 'react';
import { Music, Menu, Settings as SettingsIcon } from 'lucide-react';

interface HeaderProps {
  currentPage: string;
  onPageChange: (page: string) => void;
  onToggleSidebar: () => void;
  tituloSistema?: string;
  logoSistema?: string;
  subtitulo?: string;
}

export const Header: React.FC<HeaderProps> = ({ 
  currentPage, 
  onPageChange, 
  onToggleSidebar,
  tituloSistema,
  logoSistema,
  subtitulo
}) => {
  return (
    <header className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="md:hidden p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition"
          >
            <Menu size={24} />
          </button>
          <div className="flex items-center gap-2">
            {logoSistema ? (
              <img 
                src={logoSistema} 
                alt="Logo" 
                style={{ height: '40px', borderRadius: '4px' }}
              />
            ) : (
              <Music size={32} className="text-white" />
            )}
            <div>
              <h1 className="text-2xl font-bold">{tituloSistema || 'Repertório da Igreja'}</h1>
              <p className="text-sm text-indigo-100">{subtitulo || 'Gerenciador de hinos e cultos'}</p>
            </div>
          </div>
        </div>
        
        <button
          onClick={() => onPageChange('configuracoes')}
          className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition"
          title="Configurações"
        >
          <SettingsIcon size={24} />
        </button>
      </div>
    </header>
  );
};
