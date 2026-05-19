import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { CadastrarHino } from './components/CadastrarHino';
import { Harpa } from './components/Harpa';
import { MontarRepertorio } from './components/MontarRepertorio';
import { RepertoriosSalvos } from './components/RepertoriosSalvos';
import { ConfiguracoesView } from './components/Configuracoes';
import { initializeHarpaBase, getConfiguracoes } from './services/db';
import { Configuracoes, Repertorio } from './types';

export default function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [configuracoes, setConfiguracoes] = useState<Configuracoes | null>(null);
  const [repertorioEditar, setRepertorioEditar] = useState<Repertorio | null>(null);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      await initializeHarpaBase();
      const cfg = await getConfiguracoes();
      setConfiguracoes(cfg || {
        nomeIgreja: '',
        responsavel: '',
        rodapePdf: ''
      });
    } catch (error) {
      console.error('Erro ao inicializar app:', error);
    }
  };

  const handlePageChange = (page: string) => {
    setCurrentPage(page);
    setRepertorioEditar(null);
    setSidebarOpen(false);
  };

  const handleEditRepertorio = (repertorio: Repertorio) => {
    setRepertorioEditar(repertorio);
    setCurrentPage('montar-repertorio');
  };

  const handleSaveRepertorio = () => {
    setRepertorioEditar(null);
    setCurrentPage('repertorios');
  };

  const handleConfigChange = async () => {
    const cfg = await getConfiguracoes();
    setConfiguracoes(cfg || {
      nomeIgreja: '',
      responsavel: '',
      rodapePdf: ''
    });
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onPageChange={handlePageChange} />;
      case 'cadastrar-hino':
        return <CadastrarHino configuracoes={configuracoes} />;
      case 'harpa':
        return <Harpa configuracoes={configuracoes} />;
      case 'montar-repertorio':
        return (
          <MontarRepertorio
            repertorioAtual={repertorioEditar}
            configuracoes={configuracoes}
            onSave={handleSaveRepertorio}
          />
        );
      case 'repertorios':
        return (
          <RepertoriosSalvos
            configuracoes={configuracoes}
            onEdit={handleEditRepertorio}
          />
        );
      case 'configuracoes':
        return <ConfiguracoesView onConfigChange={handleConfigChange} />;
      default:
        return <Dashboard onPageChange={handlePageChange} />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar
        currentPage={currentPage}
        onPageChange={handlePageChange}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          currentPage={currentPage}
          onPageChange={handlePageChange}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          tituloSistema={configuracoes?.tituloSistema}
          logoSistema={configuracoes?.logoSistema}
          subtitulo={configuracoes?.subtitulo}
        />

        <main className="flex-1 overflow-auto p-4 md:p-8">
          {renderPage()}
        </main>
      </div>
    </div>
  );
}
