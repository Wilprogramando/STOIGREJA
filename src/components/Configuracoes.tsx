import React, { useState, useEffect } from 'react';
import {
  Save, Download, Upload, Trash2, AlertCircle, Eye, EyeOff, BarChart3, Mic2,
  UserPlus, Pencil, BookOpen, Smartphone, Building2, Type, Image, ListChecks,
  ListOrdered, Database, Palette, Tag, TextCursorInput,
} from 'lucide-react';
import { getConfiguracoes, saveConfiguracoes, exportData, importData, clearAllData } from '../services/db';
import { Configuracoes } from '../types';
import { LogoUploader } from './LogoUploader';
import { ImportCSVModal } from './ImportCSVModal';
import { MENUS, lerMenusOcultos, salvarMenusOcultos, rotuloDoMenu } from '../services/menus';
import { OrdemMenus } from './OrdemMenus';
import { SecaoConfig } from './SecaoConfig';
import { Aparencia } from './Aparencia';
import { CategoriasConfig } from './CategoriasConfig';
import { NomesMenus } from './NomesMenus';
import { lerAcessos, zerarAcessos, RegistroAcessos } from '../services/acessos';
import {
  carregarAparelhos,
  nomeDesteAparelho,
  salvarNomeDesteAparelho,
  ResumoAparelho,
} from '../services/aparelhos';
import {
  lerCantores,
  adicionarCantor,
  removerCantor,
  renomearCantor,
  sincronizarCantoresDosHinos,
} from '../services/cantores';

interface ConfiguracoesProps {
  onConfigChange?: () => void;
}

export const ConfiguracoesView: React.FC<ConfiguracoesProps> = ({ onConfigChange }) => {
  const [config, setConfig] = useState<Configuracoes>({
    nomeIgreja: '',
    responsavel: '',
    rodapePdf: '',
    subtitulo: 'Gerenciador de hinos e cultos'
  });
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [autenticado, setAutenticado] = useState(false);
  const [senhaInput, setSenhaInput] = useState('');
  const [acessos, setAcessos] = useState<RegistroAcessos>(() => lerAcessos());
  const [menusOcultos, setMenusOcultos] = useState<string[]>(() => lerMenusOcultos());
  const [cantores, setCantores] = useState<string[]>(() => lerCantores());
  const [novoCantor, setNovoCantor] = useState('');
  const [showCSVModal, setShowCSVModal] = useState(false);
  const [aparelhos, setAparelhos] = useState<ResumoAparelho[]>([]);
  const [carregandoAparelhos, setCarregandoAparelhos] = useState(true);
  const [nomeAparelho, setNomeAparelho] = useState<string>(() => nomeDesteAparelho());
  /** Qual cartao esta aberto: a tela mostra so um por vez. */
  const [secaoAberta, setSecaoAberta] = useState<string | null>(null);

  useEffect(() => {
    loadConfiguracoes();
    // Traz para a lista quem já está gravado como cantor nos hinos cadastrados.
    sincronizarCantoresDosHinos().then(setCantores);
    // Acessos do último mês de todos os aparelhos.
    carregarAparelhos(30)
      .then(setAparelhos)
      .finally(() => setCarregandoAparelhos(false));
  }, []);

  const handleAdicionarCantor = () => {
    const nome = novoCantor.trim();
    if (!nome) return;
    const jaExiste = cantores.some(
      c => c.toLocaleLowerCase('pt-BR') === nome.toLocaleLowerCase('pt-BR')
    );
    if (jaExiste) {
      alert('Esse cantor já está cadastrado.');
      return;
    }
    setNovoCantor('');
    adicionarCantor(nome).then(setCantores);
  };

  const handleRenomearCantor = (nome: string) => {
    const novo = prompt('Novo nome do cantor:', nome);
    if (novo === null) return;
    if (!novo.trim()) {
      alert('O nome não pode ficar em branco.');
      return;
    }
    renomearCantor(nome, novo.trim()).then(setCantores);
  };

  const handleRemoverCantor = (nome: string) => {
    if (!confirm(`Remover "${nome}" da lista de cantores?

Os hinos já cadastrados com esse cantor não mudam.`)) return;
    removerCantor(nome).then(setCantores);
  };

  const loadConfiguracoes = async () => {
    try {
      const cfg = await getConfiguracoes();
      if (cfg) {
        setConfig(cfg);
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSalvar = async () => {
    try {
      await saveConfiguracoes(config);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      onConfigChange?.();
      alert('Configurações salvas com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      alert('Erro ao salvar configurações');
    }
  };

  /** Liga ou desliga uma tela do menu, salvando na hora. */
  const alternarMenu = (id: string) => {
    const novos = menusOcultos.includes(id)
      ? menusOcultos.filter(m => m !== id)
      : [...menusOcultos, id];

    setMenusOcultos(novos);
    salvarMenusOcultos(novos);
    onConfigChange?.();
  };

  /** Salva o apelido deste aparelho e atualiza a lista na tela. */
  const handleSalvarNomeAparelho = async () => {
    const salvo = await salvarNomeDesteAparelho(nomeAparelho);
    setNomeAparelho(salvo);
    setAparelhos(await carregarAparelhos(30));
  };

  const handleZerarAcessos = () => {
    if (!confirm('Zerar a contagem de acessos deste aparelho?')) return;
    zerarAcessos();
    setAcessos(lerAcessos());
  };

  const handleExportar = async () => {
    try {
      const data = await exportData();
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `repertorio-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      alert('Backup exportado com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar:', error);
      alert('Erro ao exportar backup');
    }
  };

  const handleImportar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      if (confirm('Deseja importar o backup? Todos os dados atuais serão substituídos!')) {
        await importData(data);
        alert('Backup importado com sucesso!');
        loadConfiguracoes();
        onConfigChange?.();
      }
    } catch (error) {
      console.error('Erro ao importar:', error);
      alert('Erro ao importar backup. Verifique o arquivo.');
    }
  };

  const handleLimpar = async () => {
    const confirma = confirm('Tem certeza? Todos os dados serão deletados permanentemente!');
    if (!confirma) return;

    const confirma2 = confirm('ÚLTIMA CONFIRMAÇÃO: Todos os hinos, repertórios e configurações serão deletados!');
    if (!confirma2) return;

    // Pedir senha
    const senha = prompt('Digite a senha para confirmar a exclusão de todos os dados:');
    if (!senha) return;

    if (senha !== '5232') {
      alert('❌ Senha incorreta!');
      return;
    }

    try {
      await clearAllData();
      setConfig({
        nomeIgreja: '',
        responsavel: '',
        rodapePdf: ''
      });
      alert('✅ Todos os dados foram deletados!');
      onConfigChange?.();
    } catch (error) {
      console.error('Erro ao limpar dados:', error);
      alert('Erro ao limpar dados');
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <p className="text-gray-500">Carregando configurações...</p>
      </div>
    );
  }

  if (!autenticado) {
    return (
      <div className="max-w-md mx-auto mt-20">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Acesso Protegido</h2>
          <p className="text-gray-600 mb-6">A tela de configurações requer autenticação</p>
          <input
            type="password"
            placeholder="Digite a senha"
            value={senhaInput}
            onChange={(e) => setSenhaInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                if (senhaInput === '523297') {
                  setAutenticado(true);
                  setSenhaInput('');
                } else {
                  alert('❌ Senha incorreta!');
                  setSenhaInput('');
                }
              }
            }}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:border-indigo-600"
          />
          <button
            onClick={() => {
              if (senhaInput === '523297') {
                setAutenticado(true);
                setSenhaInput('');
              } else {
                alert('❌ Senha incorreta!');
                setSenhaInput('');
              }
            }}
            className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium"
          >
            Entrar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-3xl font-bold text-gray-900 mb-8">Configurações</h2>

      <p className="text-sm text-gray-500 -mt-6 mb-5">
        Toque no assunto que voce quer mexer para abrir.
      </p>

      <div className="space-y-3">
        <SecaoConfig
          id="aparencia"
          titulo="Aparencia do Sistema"
          descricao="Cor, modo noturno, lado da logo e layout"
          icone={Palette}
          aberta={secaoAberta}
          onAbrir={setSecaoAberta}
        >
          <Aparencia
            tituloSistema={config.tituloSistema}
            logoSistema={config.logoSistema}
            subtitulo={config.subtitulo}
          />
        </SecaoConfig>

        <SecaoConfig
          id="categorias"
          titulo="Categorias dos Hinos"
          descricao="Manancial, Alfa, Louvor..."
          icone={Tag}
          aberta={secaoAberta}
          onAbrir={setSecaoAberta}
        >
          <CategoriasConfig />
        </SecaoConfig>

        <SecaoConfig
          id="igreja"
          titulo="Informações da Igreja"
          descricao="Nome, responsável e rodapé do PDF"
          icone={Building2}
          aberta={secaoAberta}
          onAbrir={setSecaoAberta}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome da Igreja
              </label>
              <input
                type="text"
                value={config.nomeIgreja}
                onChange={(e) => setConfig({ ...config, nomeIgreja: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-600"
                placeholder="Nome da sua igreja"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Responsável
              </label>
              <input
                type="text"
                value={config.responsavel}
                onChange={(e) => setConfig({ ...config, responsavel: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-600"
                placeholder="Nome do responsável ou música"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subtítulo do Sistema
              </label>
              <input
                type="text"
                value={config.subtitulo || 'Gerenciador de hinos e cultos'}
                onChange={(e) => setConfig({ ...config, subtitulo: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-600"
                placeholder="Ex: Gerenciador de hinos e cultos"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rodapé dos PDFs
              </label>
              <textarea
                value={config.rodapePdf}
                onChange={(e) => setConfig({ ...config, rodapePdf: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-600"
                placeholder="Texto que aparecerá no rodapé de todos os PDFs gerados"
              />
            </div>

            <button
              onClick={handleSalvar}
              className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center justify-center gap-2 font-medium"
            >
              <Save size={20} />
              Salvar Configurações
            </button>

            {saved && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
                ✓ Configurações salvas com sucesso!
              </div>
            )}
          </div>
        </SecaoConfig>

        <SecaoConfig
          id="identidade"
          titulo="Identidade do Sistema"
          descricao="Título, subtítulo e logo do cabeçalho"
          icone={Type}
          aberta={secaoAberta}
          onAbrir={setSecaoAberta}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Título do Sistema
              </label>
              <input
                type="text"
                value={config.tituloSistema || ''}
                onChange={(e) => setConfig({ ...config, tituloSistema: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-600"
                placeholder="Ex: Repertório da Igreja (deixe em branco para padrão)"
              />
              <p className="text-xs text-gray-500 mt-1">Este título aparecerá no topo da página</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Logo do Sistema
              </label>
              <LogoUploader
                logoUrl={config.logoSistema}
                onLogoChange={(logo) => setConfig({ ...config, logoSistema: logo })}
              />
              <p className="text-xs text-gray-500 mt-2">Esta logo aparecerá no topo do sistema ao lado do título</p>
            </div>

            <button
              onClick={handleSalvar}
              className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center justify-center gap-2 font-medium"
            >
              <Save size={20} />
              Salvar Personalização
            </button>
          </div>
        </SecaoConfig>

        <SecaoConfig
          id="logo"
          titulo="Logo da Igreja"
          descricao="Imagem usada nos PDFs"
          icone={Image}
          aberta={secaoAberta}
          onAbrir={setSecaoAberta}
        >
          <LogoUploader
            logoUrl={config.logo}
            onLogoChange={(logo) => setConfig({ ...config, logo })}
          />
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
            💡 A logo será exibida no topo dos PDFs gerados (hinos e repertórios).
          </div>
        </SecaoConfig>

        <SecaoConfig
          id="harpa"
          titulo="Importar Hinos da Harpa"
          descricao="Cadastro em massa por planilha CSV"
          icone={BookOpen}
          aberta={secaoAberta}
          onAbrir={setSecaoAberta}
        >
          <p className="text-sm text-gray-500 mb-4">
            Cadastre vários hinos da Harpa Cristã de uma vez, a partir de uma planilha em CSV.
            Dá para baixar um modelo pronto na própria janela de importação.
          </p>

          <button
            onClick={() => setShowCSVModal(true)}
            className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium flex items-center justify-center gap-2"
          >
            <Upload size={20} />
            Importar CSV da Harpa
          </button>
        </SecaoConfig>

        <SecaoConfig
          id="cantores"
          titulo="Cantores"
          descricao="Quem aparece para escolher ao cadastrar um hino"
          icone={Mic2}
          aberta={secaoAberta}
          onAbrir={setSecaoAberta}
        >
          <p className="text-sm text-gray-500 mb-4">
            Quem estiver nesta lista aparece para escolher no campo "Cantor" ao cadastrar
            ou editar um hino.
          </p>

          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={novoCantor}
              onChange={(e) => setNovoCantor(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAdicionarCantor();
                }
              }}
              placeholder="Nome do cantor"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-600"
            />
            <button
              onClick={handleAdicionarCantor}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center gap-2"
            >
              <UserPlus size={18} />
              Adicionar
            </button>
          </div>

          {cantores.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-4">
              Nenhum cantor cadastrado ainda.
            </p>
          ) : (
            <div className="space-y-2">
              {cantores.map(cantor => (
                <div
                  key={cantor}
                  className="flex items-center justify-between gap-3 p-3 rounded-lg border border-gray-200"
                >
                  <p className="font-medium text-gray-800 truncate">👤 {cantor}</p>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => handleRenomearCantor(cantor)}
                      title="Renomear"
                      className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => handleRemoverCantor(cantor)}
                      title="Remover"
                      className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SecaoConfig>

        <SecaoConfig
          id="menus"
          titulo="Menus do Sistema"
          descricao="Ligue e desligue as telas"
          icone={ListChecks}
          aberta={secaoAberta}
          onAbrir={setSecaoAberta}
        >
          <p className="text-sm text-gray-500 mb-4">
            Desligue o que a equipe não usa. A tela some do menu e dos atalhos, e os dados
            continuam guardados.
          </p>

          <div className="space-y-2">
            {MENUS.map(menu => {
              const oculto = menusOcultos.includes(menu.id);
              const ligado = menu.fixo || !oculto;

              return (
                <div
                  key={menu.id}
                  className={`flex items-center justify-between gap-3 p-3 rounded-lg border ${
                    ligado ? 'border-gray-200 bg-white' : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {ligado ? (
                      <Eye size={18} className="text-indigo-600 shrink-0" />
                    ) : (
                      <EyeOff size={18} className="text-gray-400 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p
                        className={`font-medium truncate ${
                          ligado ? 'text-gray-800' : 'text-gray-400'
                        }`}
                      >
                        {rotuloDoMenu(menu.id)}
                      </p>
                      {menu.fixo && (
                        <p className="text-xs text-gray-400">Sempre disponível</p>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => alternarMenu(menu.id)}
                    disabled={menu.fixo}
                    className={`relative w-12 h-6 rounded-full transition shrink-0 disabled:opacity-40 disabled:cursor-not-allowed ${
                      ligado ? 'bg-indigo-600' : 'bg-gray-300'
                    }`}
                    aria-label={`${ligado ? 'Desligar' : 'Ligar'} ${menu.label}`}
                  >
                    <span
                      className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${
                        ligado ? 'left-6' : 'left-0.5'
                      }`}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        </SecaoConfig>

        <SecaoConfig
          id="nomes"
          titulo="Nomes dos Menus"
          descricao="Troque como cada tela se chama"
          icone={TextCursorInput}
          aberta={secaoAberta}
          onAbrir={setSecaoAberta}
        >
          <NomesMenus onNomesChange={() => onConfigChange?.()} />
        </SecaoConfig>

        <SecaoConfig
          id="ordem"
          titulo="Ordem do Menu"
          descricao="Arraste para reorganizar as telas"
          icone={ListOrdered}
          aberta={secaoAberta}
          onAbrir={setSecaoAberta}
        >
          <OrdemMenus onOrdemChange={() => onConfigChange?.()} />
        </SecaoConfig>

        <SecaoConfig
          id="acessos"
          titulo="Acessos ao Sistema"
          descricao="Quantas vezes cada tela foi aberta"
          icone={BarChart3}
          aberta={secaoAberta}
          onAbrir={setSecaoAberta}
        >
          <div className="flex items-center justify-between gap-3 mb-1">
            <button
              onClick={handleZerarAcessos}
              className="text-sm text-gray-500 hover:text-red-600 underline"
            >
              Zerar
            </button>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Contagem deste aparelho, desde{' '}
            {new Date(acessos.desde).toLocaleDateString('pt-BR')}.
          </p>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-100">
              <p className="text-2xl font-extrabold text-indigo-700">{acessos.total}</p>
              <p className="text-xs text-indigo-900">Telas abertas</p>
            </div>
            <div className="p-3 rounded-lg bg-green-50 border border-green-100">
              <p className="text-2xl font-extrabold text-green-700">{acessos.dias.length}</p>
              <p className="text-xs text-green-900">Dias de uso</p>
            </div>
          </div>

          {acessos.total === 0 ? (
            <p className="text-sm text-gray-500">Nenhum acesso registrado ainda.</p>
          ) : (
            <div className="space-y-1">
              {MENUS.map(menu => ({ menu, vezes: acessos.porPagina[menu.id] || 0 }))
                .sort((a, b) => b.vezes - a.vezes)
                .map(({ menu, vezes }) => {
                  const maior = Math.max(...Object.values(acessos.porPagina), 1);
                  const ultimo = acessos.ultimoPorPagina[menu.id];

                  return (
                    <div key={menu.id} className="py-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-700">{menu.label}</span>
                        <span className="font-bold text-gray-900">{vezes}</span>
                      </div>

                      <div className="h-1.5 bg-gray-100 rounded-full mt-1 overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 rounded-full"
                          style={{ width: `${(vezes / maior) * 100}%` }}
                        />
                      </div>

                      {ultimo && (
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          Último acesso: {new Date(ultimo).toLocaleString('pt-BR')}
                        </p>
                      )}
                    </div>
                  );
                })}
            </div>
          )}
        </SecaoConfig>

        <SecaoConfig
          id="aparelhos"
          titulo="Aparelhos"
          descricao="Celulares e computadores do último mês"
          icone={Smartphone}
          aberta={secaoAberta}
          onAbrir={setSecaoAberta}
        >
          <p className="text-sm text-gray-500 mb-4">
            Acessos de todos os celulares e computadores que abriram o sistema no último mês.
          </p>

          <div className="mb-4 p-3 rounded-lg bg-gray-50 border border-gray-200">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Nome deste aparelho
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={nomeAparelho}
                onChange={e => setNomeAparelho(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                placeholder="Ex.: Celular do Daniel"
              />
              <button
                onClick={handleSalvarNomeAparelho}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
              >
                Salvar
              </button>
            </div>
          </div>

          {carregandoAparelhos ? (
            <p className="text-sm text-gray-500">Carregando aparelhos...</p>
          ) : aparelhos.length === 0 ? (
            <p className="text-sm text-gray-500">
              Nenhum acesso registrado no último mês.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-100">
                  <p className="text-2xl font-extrabold text-indigo-700">
                    {aparelhos.reduce((soma, ap) => soma + ap.acessos, 0)}
                  </p>
                  <p className="text-xs text-indigo-900">Acessos no mês</p>
                </div>
                <div className="p-3 rounded-lg bg-green-50 border border-green-100">
                  <p className="text-2xl font-extrabold text-green-700">{aparelhos.length}</p>
                  <p className="text-xs text-green-900">Aparelhos diferentes</p>
                </div>
              </div>

              <div className="space-y-1">
                {aparelhos.map(ap => {
                  const maior = Math.max(...aparelhos.map(a => a.acessos), 1);

                  return (
                    <div key={ap.aparelhoId} className="py-1.5">
                      <div className="flex items-center justify-between text-sm gap-2">
                        <span className="text-gray-700 truncate">
                          {ap.nome}
                          {ap.esteAparelho && (
                            <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 align-middle">
                              este aparelho
                            </span>
                          )}
                        </span>
                        <span className="font-bold text-gray-900">{ap.acessos}</span>
                      </div>

                      <div className="h-1.5 bg-gray-100 rounded-full mt-1 overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 rounded-full"
                          style={{ width: `${(ap.acessos / maior) * 100}%` }}
                        />
                      </div>

                      <p className="text-[11px] text-gray-400 mt-0.5">
                        {ap.dias} {ap.dias === 1 ? 'dia de uso' : 'dias de uso'}
                        {ap.ultimoAcesso &&
                          ` · último acesso: ${new Date(ap.ultimoAcesso).toLocaleString('pt-BR')}`}
                      </p>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </SecaoConfig>

        <SecaoConfig
          id="backup"
          titulo="Backup e Restauração"
          descricao="Exportar, importar e apagar dados"
          icone={Database}
          aberta={secaoAberta}
          onAbrir={setSecaoAberta}
        >
          <div className="space-y-3">
            <button
              onClick={handleExportar}
              className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2 font-medium"
            >
              <Download size={20} />
              Exportar Backup
            </button>

            <div className="relative">
              <input
                type="file"
                accept=".json"
                onChange={handleImportar}
                className="hidden"
                id="importBackup"
              />
              <label
                htmlFor="importBackup"
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2 font-medium cursor-pointer"
              >
                <Upload size={20} />
                Importar Backup
              </label>
            </div>

            <p className="text-sm text-gray-600 p-3 bg-blue-50 rounded-lg border border-blue-200">
              💡 Exporte regularmente seus dados como backup. Você pode restaurar a qualquer momento importando o arquivo JSON.
            </p>
          </div>
        </SecaoConfig>

        {/* Informações */}
        <div className="bg-indigo-50 p-6 rounded-lg border border-indigo-200">
          <h3 className="font-bold text-indigo-900 mb-3">ℹ️ Informações do Sistema</h3>
          <ul className="text-sm text-indigo-800 space-y-2">
            <li>☁️ <strong>Backup:</strong> Supabase</li>
            <li>🌐 <strong>Hospedagem:</strong> Vercel</li>
          </ul>
        </div>
      </div>

      {showCSVModal && (
        <ImportCSVModal
          onClose={() => setShowCSVModal(false)}
          onImportSuccess={() => setShowCSVModal(false)}
          tipoHino="harpa"
        />
      )}
    </div>
  );
};
