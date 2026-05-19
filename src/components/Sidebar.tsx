import React from 'react';
import { Home, Plus, BookOpen, Music, List, Settings } from 'lucide-react';

interface SidebarProps {
  currentPage: string;
  onPageChange: (page: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, onPageChange, isOpen, onClose }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'cadastrar-hino', label: 'Cadastrar Hino', icon: Plus },
    { id: 'harpa', label: 'Hinos da Harpa', icon: BookOpen },
    { id: 'montar-repertorio', label: 'Montar Repertório', icon: Music },
    { id: 'repertorios', label: 'Repertórios Salvos', icon: List },
    { id: 'configuracoes', label: 'Configurações', icon: Settings },
  ];

  const handleItemClick = (id: string) => {
    onPageChange(id);
    onClose();
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 md:hidden z-40"
          onClick={onClose}
        />
      )}
      
      <aside className={`
        fixed md:relative w-64 h-screen bg-white border-r border-gray-200 shadow-lg
        transform transition-transform duration-300 z-50
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        overflow-y-auto
      `}>
        <nav className="p-4">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.id)}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition
                  ${isActive
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-gray-700 hover:bg-gray-100'
                  }
                `}
              >
                <Icon size={20} />
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="absolute bottom-4 left-4 right-4 p-3 bg-indigo-50 rounded-lg">
          <p className="text-xs text-gray-600">
            💡 <strong>Dica:</strong> Todos os dados são salvos automaticamente no seu navegador.
          </p>
        </div>
      </aside>
    </>
  );
};
