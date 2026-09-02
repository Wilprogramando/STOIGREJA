import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { CadastrarHino } from './components/CadastrarHino';
import { Harpa } from './components/Harpa';
import { MontarRepertorio } from './components/MontarRepertorio';
import { RepertoriosSalvos } from './components/RepertoriosSalvos';
import { ConfiguracoesView } from './components/Configuracoes';
import { Relatorios } from './components/Relatorios';
import { CampoHarmonico } from './components/CampoHarmonico';
import { Afinador } from './components/Afinador';
import { Anotacoes } from './components/Anotacoes';
import { StatusConexao } from './components/StatusConexao';

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

  // Botão "voltar" do celular/navegador: volta para a tela anterior do sistema
  // em vez de fechar o app.
  useEffect(() => {
    // Marca a tela inicial no histórico do navegador.
    window.history.replaceState({ page: 'dashboard' }, '');

    const aoVoltar = (evento: PopStateEvent) => {
      const pagina = evento.state?.page;
      setCurrentPage(pagina || 'dashboard');
      setSidebarOpen(false);
      if (pagina !== 'montar-repertorio') {
        setRepertorioEditar(null);
      }
    };

    window.addEventListener('popstate', aoVoltar);
    return () => window.removeEventListener('popstate', aoVoltar);
  }, []);

  /** Troca de tela guardando o passo no histórico, para o "voltar" funcionar. */
  const irPara = (page: string) => {
    if (page !== currentPage) {
      window.history.pushState({ page }, '');
    }
    setCurrentPage(page);
  };

  const initializeApp = async () => {
    try {
      await initializeHarpaBase();

      const cfg = await getConfiguracoes();

      setConfiguracoes(
        cfg || {
          nomeIgreja: '',
          responsavel: '',
          rodapePdf: '',
        }
      );
    } catch (error) {
      console.error('Erro ao inicializar app:', error);
    }
  };

  const handlePageChange = (page: string) => {
    irPara(page);

    if (page !== 'montar-repertorio') {
      setRepertorioEditar(null);
    }

    setSidebarOpen(false);
  };

  const handleEditRepertorio = (repertorio: Repertorio) => {
    console.log('🔄 Editando repertório:', repertorio.nome);

    setRepertorioEditar(repertorio);
    irPara('montar-repertorio');
  };

  const handleSaveRepertorio = () => {
    setRepertorioEditar(null);
    irPara('repertorios');
  };

  const handleConfigChange = async () => {
    const cfg = await getConfiguracoes();

    setConfiguracoes(
      cfg || {
        nomeIgreja: '',
        responsavel: '',
        rodapePdf: '',
      }
    );
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
            key={repertorioEditar?.id || 'novo'}
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

      case 'relatorios':
        return <Relatorios />;

      case 'campo-harmonico':
        return <CampoHarmonico />;

      case 'afinador':
        return <Afinador />;

      case 'anotacoes':
        return <Anotacoes />;

      case 'configuracoes':
        return (
          <ConfiguracoesView
            onConfigChange={handleConfigChange}
          />
        );

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

        <StatusConexao />

        <main className="flex-1 overflow-auto p-4 md:p-8">
          {renderPage()}
        </main>
      </div>
    </div>
  );
}
