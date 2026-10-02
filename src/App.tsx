import React, { useState, useEffect, Suspense, lazy } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { StatusConexao } from './components/StatusConexao';
import { BarraInferior } from './components/BarraInferior';

/**
 * TELAS EM ARQUIVOS SEPARADOS
 *
 * Quem abre o app cai no Dashboard - ele vem junto, pronto. As outras telas
 * ficam em arquivos próprios, para não entrarem na conta da abertura: antes as
 * dezessete vinham num arquivo só de 1,3 MB, que o celular tinha de baixar e
 * interpretar inteiro antes de desenhar qualquer coisa.
 *
 * Elas não esperam o clique: logo depois do Dashboard aparecer, enquanto o
 * app está parado, todas são buscadas em segundo plano (ver aquecerTelas).
 * Quando o usuário clica no menu, o arquivo já está na mão e a tela abre na
 * hora, sem indicação de carregamento - como era antes de dividir.
 */
const carregarTela = {
  CadastrarHino: () => import('./components/CadastrarHino'),
  HinosComuns: () => import('./components/HinosComuns'),
  Harpa: () => import('./components/Harpa'),
  BuscarMusica: () => import('./components/BuscarMusica'),
  OuvirMusica: () => import('./components/OuvirMusica'),
  MontarRepertorio: () => import('./components/MontarRepertorio'),
  RepertoriosSalvos: () => import('./components/RepertoriosSalvos'),
  Configuracoes: () => import('./components/Configuracoes'),
  Relatorios: () => import('./components/Relatorios'),
  CampoHarmonico: () => import('./components/CampoHarmonico'),
  Afinador: () => import('./components/Afinador'),
  TomDaMusica: () => import('./components/TomDaMusica'),
  Anotacoes: () => import('./components/Anotacoes')
};

const CadastrarHino = lazy(() => carregarTela.CadastrarHino().then(m => ({ default: m.CadastrarHino })));
const HinosComuns = lazy(() => carregarTela.HinosComuns().then(m => ({ default: m.HinosComuns })));
const Harpa = lazy(() => carregarTela.Harpa().then(m => ({ default: m.Harpa })));
const BuscarMusica = lazy(() => carregarTela.BuscarMusica().then(m => ({ default: m.BuscarMusica })));
const OuvirMusica = lazy(() => carregarTela.OuvirMusica().then(m => ({ default: m.OuvirMusica })));
const MontarRepertorio = lazy(() => carregarTela.MontarRepertorio().then(m => ({ default: m.MontarRepertorio })));
const RepertoriosSalvos = lazy(() => carregarTela.RepertoriosSalvos().then(m => ({ default: m.RepertoriosSalvos })));
const ConfiguracoesView = lazy(() => carregarTela.Configuracoes().then(m => ({ default: m.ConfiguracoesView })));
const Relatorios = lazy(() => carregarTela.Relatorios().then(m => ({ default: m.Relatorios })));
const CampoHarmonico = lazy(() => carregarTela.CampoHarmonico().then(m => ({ default: m.CampoHarmonico })));
const Afinador = lazy(() => carregarTela.Afinador().then(m => ({ default: m.Afinador })));
const TomDaMusica = lazy(() => carregarTela.TomDaMusica().then(m => ({ default: m.TomDaMusica })));
const Anotacoes = lazy(() => carregarTela.Anotacoes().then(m => ({ default: m.Anotacoes })));

/**
 * Busca todas as telas em segundo plano, uma atrás da outra para não disputar
 * a internet com o que o Dashboard ainda estiver carregando.
 */
function aquecerTelas() {
  const fila = Object.values(carregarTela);

  const proxima = (indice: number) => {
    if (indice >= fila.length) return;
    fila[indice]()
      .catch(() => undefined) // Sem internet: o clique tenta de novo depois.
      .then(() => proxima(indice + 1));
  };

  const comecar = () => proxima(0);

  // requestIdleCallback: só roda quando o aparelho não tem nada melhor a fazer.
  // Safari antigo não tem a função, daí o setTimeout no lugar.
  const quandoOcioso = (window as any).requestIdleCallback;

  if (typeof quandoOcioso === 'function') {
    quandoOcioso(comecar, { timeout: 2000 });
  } else {
    window.setTimeout(comecar, 800);
  }
}

import { initializeHarpaBase, getConfiguracoes } from './services/db';
import { registrarAcesso } from './services/acessos';
import { registrarAcessoDesteAparelho } from './services/aparelhos';
import { acompanharOnline } from './services/presenca';
import { menuVisivel, lerMenusOcultos, lerOrdemMenus, lerNomesMenus } from './services/menus';
import { lerTema, Tema } from './services/tema';
import { sincronizarCantoresDosHinos } from './services/cantores';
import { Configuracoes, Repertorio, Hino } from './types';

export default function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [configuracoes, setConfiguracoes] = useState<Configuracoes | null>(null);
  const [repertorioEditar, setRepertorioEditar] = useState<Repertorio | null>(null);
  /** Hino carregado no formulário de cadastro (editar ou duplicar). */
  const [hinoEditar, setHinoEditar] = useState<Hino | null>(null);
  /** Hino recém-salvo, mostrado em destaque na lista de hinos comuns. */
  const [hinoDestaque, setHinoDestaque] = useState<string | null>(null);
  const [menusOcultos, setMenusOcultos] = useState<string[]>(() => lerMenusOcultos());
  const [ordemMenus, setOrdemMenus] = useState<string[]>(() => lerOrdemMenus());
  const [tema, setTema] = useState<Tema>(() => lerTema());
  const [nomesMenus, setNomesMenus] = useState<Record<string, string>>(() => lerNomesMenus());

  useEffect(() => {
    initializeApp();
    // Deixa as outras telas prontas antes de o usuário pedir por elas.
    aquecerTelas();
  }, []);

  // Aparência escolhida nas configurações (cor, lado da logo, modo noturno).
  useEffect(() => {
    const aoMudar = () => setTema(lerTema());
    window.addEventListener('repertorio-tema-mudou', aoMudar);
    return () => window.removeEventListener('repertorio-tema-mudou', aoMudar);
  }, []);

  // Contagem de acessos por tela, mostrada nas configurações.
  useEffect(() => {
    registrarAcesso(currentPage);
    registrarAcessoDesteAparelho();
  }, [currentPage]);

  // Entra na sala de "aparelhos online" enquanto o sistema estiver aberto,
  // em qualquer tela - as Configurações só leem essa lista.
  useEffect(() => acompanharOnline(() => undefined), []);

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

      // Cantores já gravados nos hinos entram na lista das Configurações.
      sincronizarCantoresDosHinos();

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

    // Entrar pelo menu abre o cadastro em branco e tira o destaque da lista.
    if (page === 'cadastrar-hino') setHinoEditar(null);
    if (page !== 'hinos-comuns') setHinoDestaque(null);

    setSidebarOpen(false);
  };

  /** Da lista de hinos comuns para o formulário, com o hino carregado. */
  const handleEditarHino = (hino: Hino) => {
    setHinoEditar(hino);
    irPara('cadastrar-hino');
  };

  /** Duplicar: o formulário abre preenchido, mas salva como hino novo. */
  const handleDuplicarHino = (hino: Hino) => {
    setHinoEditar({ ...hino, id: '', nome: `${hino.nome} (Cópia)` });
    irPara('cadastrar-hino');
  };

  const handleNovoHino = () => {
    setHinoEditar(null);
    irPara('cadastrar-hino');
  };

  /** Salvou: volta para a lista com o hino em destaque. */
  const handleHinoSalvo = (hino: Hino) => {
    setHinoEditar(null);
    setHinoDestaque(hino.id);
    irPara('hinos-comuns');
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
    setOrdemMenus(lerOrdemMenus());
    setNomesMenus(lerNomesMenus());

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
        return (
          <CadastrarHino
            key={hinoEditar ? `${hinoEditar.id}-${hinoEditar.nome}` : 'novo'}
            configuracoes={configuracoes}
            hinoInicial={hinoEditar}
            onSalvo={handleHinoSalvo}
          />
        );

      case 'hinos-comuns':
        return (
          <HinosComuns
            configuracoes={configuracoes}
            hinoDestaque={hinoDestaque}
            onEditar={handleEditarHino}
            onDuplicar={handleDuplicarHino}
            onNovo={handleNovoHino}
          />
        );

      case 'harpa':
        return <Harpa configuracoes={configuracoes} />;

      case 'buscar-musica':
        return <BuscarMusica />;

      case 'ouvir-musica':
        return <OuvirMusica />;

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

      case 'tom-musica':
        return <TomDaMusica />;

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
        ordemMenus={ordemMenus}
        nomesMenus={nomesMenus}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          tituloSistema={configuracoes?.tituloSistema}
          logoSistema={configuracoes?.logoSistema}
          subtitulo={configuracoes?.subtitulo}
          logoADireita={tema.posicaoLogo === 'direita'}
          mostrarBusca={currentPage === 'dashboard'}
        />

        <StatusConexao />

        <main className="flex-1 overflow-auto p-4 md:p-8">
          {/*
            Sem tela de espera: as telas são aquecidas em segundo plano, então
            na prática já estão prontas no clique. Se ainda não estiverem, fica
            um instante vazio em vez de piscar um carregando no meio do app.
          */}
          <Suspense fallback={null}>
            {renderPage()}
          </Suspense>
        </main>

        <BarraInferior
          currentPage={currentPage}
          onPageChange={handlePageChange}
          menusOcultos={menusOcultos}
          nomesMenus={nomesMenus}
        />
      </div>
    </div>
  );
}
