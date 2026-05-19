import React, { useState, useEffect } from 'react';
import { Save, Download, Upload, Trash2, AlertCircle } from 'lucide-react';
import { getConfiguracoes, saveConfiguracoes, exportData, importData, clearAllData } from '../services/db';
import { Configuracoes } from '../types';
import { LogoUploader } from './LogoUploader';

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

  useEffect(() => {
    loadConfiguracoes();
  }, []);

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

      <div className="space-y-6">
        {/* Configurações Gerais */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Informações da Igreja</h3>

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
        </div>

        {/* Personalização do Sistema */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Personalizar Sistema</h3>

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
        </div>

        {/* Logo */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Logo da Igreja</h3>
          <LogoUploader
            logoUrl={config.logo}
            onLogoChange={(logo) => setConfig({ ...config, logo })}
          />
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
            💡 A logo será exibida no topo dos PDFs gerados (hinos e repertórios).
          </div>
        </div>

        {/* Backup */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Backup e Restauração</h3>

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
        </div>

        {/* Informações */}
        <div className="bg-indigo-50 p-6 rounded-lg border border-indigo-200">
          <h3 className="font-bold text-indigo-900 mb-3">ℹ️ Informações do Sistema</h3>
          <ul className="text-sm text-indigo-800 space-y-2">
            <li>☁️ <strong>Backup:</strong> Supabase</li>
            <li>🌐 <strong>Hospedagem:</strong> Vercel</li>
            <li>🗂️ <strong>Versão 1.0.0</strong> - Repertório da Igreja</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
