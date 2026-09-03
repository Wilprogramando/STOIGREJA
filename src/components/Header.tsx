import React, { useState } from 'react';
import { Music, Menu, RefreshCw, Settings as SettingsIcon } from 'lucide-react';

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
  const [atualizando, setAtualizando] = useState(false);

  /**
   * Recarrega o app buscando a versao mais nova: limpa o cache do service worker
   * (PWA) antes do reload, senao o celular continua abrindo a versao antiga.
   */
  const atualizarPagina = async () => {
    setAtualizando(true);

    try {
      if ('caches' in window) {
        const nomes = await caches.keys();
        await Promise.all(nomes.map(nome => caches.delete(nome)));
      }

      const registros = await navigator.serviceWorker?.getRegistrations?.();
      await Promise.all((registros || []).map(r => r.update()));
    } catch (erro) {
      console.error('Erro ao limpar o cache antes de atualizar:', erro);
    }

    window.location.reload();
  };

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
        
        <div className="flex items-center gap-1">
          <button
            onClick={atualizarPagina}
            disabled={atualizando}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition disabled:opacity-70"
            title="Atualizar página"
            aria-label="Atualizar página"
          >
            <RefreshCw size={24} className={atualizando ? 'animate-spin' : undefined} />
          </button>

          <button
            onClick={() => onPageChange('configuracoes')}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition"
            title="Configurações"
            aria-label="Configurações"
          >
            <SettingsIcon size={24} />
          </button>
        </div>
      </div>
    </header>
  );
};
