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
import { BarraInferior } from './components/BarraInferior';

import { initializeHarpaBase, getConfiguracoes } from './services/db';
import { registrarAcesso } from './services/acessos';
import { menuVisivel, lerMenusOcultos } from './services/menus';
import { Configuracoes, Repertorio } from './types';

export default function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [configuracoes, setConfiguracoes] = useState<Configuracoes | null>(null);
  const [repertorioEditar, setRepertorioEditar] = useState<Repertorio | null>(null);
  const [menusOcultos, setMenusOcultos] = useState<string[]>(() => lerMenusOcultos());

  useEffect(() => {
    initializeApp();
  }, []);

  // Contagem de acessos por tela, mostrada nas configurações.
  useEffect(() => {
    registrarAcesso(currentPage);
  }, [currentPage]);

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
    setMenusOcultos(lerMenusOcultos());

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
    // Tela desligada nas configurações: cai no Dashboard.
    if (!menuVisivel(currentPage, menusOcultos)) {
      return <Dashboard onPageChange={handlePageChange} />;
    }

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
    <div className="flex h-full bg-gray-100 overflow-hidden">
      <Sidebar
        currentPage={currentPage}
        onPageChange={handlePageChange}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        menusOcultos={menusOcultos}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          tituloSistema={configuracoes?.tituloSistema}
          logoSistema={configuracoes?.logoSistema}
          subtitulo={configuracoes?.subtitulo}
        />

        <StatusConexao />

        <main className="flex-1 overflow-auto p-4 md:p-8">
          {renderPage()}
        </main>

        <BarraInferior
          currentPage={currentPage}
          onPageChange={handlePageChange}
          menusOcultos={menusOcultos}
        />
      </div>
    </div>
  );
}
