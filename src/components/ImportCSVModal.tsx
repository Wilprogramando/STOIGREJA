import React, { useState } from 'react';
import { Upload, Download, AlertCircle, CheckCircle } from 'lucide-react';
import { importHinosFromCSV } from '../services/db';

interface ImportCSVModalProps {
  onClose: () => void;
  onImportSuccess: () => void;
}

export const ImportCSVModal: React.FC<ImportCSVModalProps> = ({ onClose, onImportSuccess }) => {
  const [status, setStatus] = useState<'idle' | 'importing' | 'success' | 'error'>('idle');
  const [result, setResult] = useState<{ success: number; errors: string[] } | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      alert('Por favor, selecione um arquivo CSV');
      return;
    }

    setStatus('importing');

    try {
      const content = await file.text();
      const result = await importHinosFromCSV(content);

      setResult(result);
      setStatus(result.errors.length === 0 ? 'success' : 'error');

      if (result.success > 0) {
        onImportSuccess();
      }
    } catch (error) {
      console.error('Erro ao importar:', error);
      setStatus('error');
      setResult({ success: 0, errors: [(error as Error).message] });
    }
  };

  const downloadTemplate = () => {
    const csv = `Nº do Hino\tNome do Hino\tLetra do Hino
1\tExemplo de Hino\tPrimeira estrofe aqui...\nSegunda estrofe aqui...
2\tOutro Hino\tLetra completa do segundo hino aqui...`;

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'modelo-hinos.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Cadastrar Hinos em Massa</h2>

        <div className="space-y-4">
          {status === 'idle' && (
            <>
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-bold text-blue-900 mb-2">📋 Instruções</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Baixe o modelo de arquivo CSV</li>
                  <li>• Preencha com seus hinos (número, nome, letra)</li>
                  <li>• Envie o arquivo para importar em massa</li>
                </ul>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={downloadTemplate}
                  className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2 font-medium"
                >
                  <Download size={20} />
                  Baixar Modelo CSV
                </button>
              </div>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <div className="flex flex-col items-center gap-2">
                    <Upload size={32} className="text-indigo-600" />
                    <span className="font-medium text-gray-700">Clique para selecionar arquivo CSV</span>
                    <span className="text-sm text-gray-500">ou arraste o arquivo aqui</span>
                  </div>
                </label>
              </div>

              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                <strong>Formato esperado:</strong> Coluna 1 (Número), Coluna 2 (Nome), Coluna 3 (Letra)
              </div>
            </>
          )}

          {status === 'importing' && (
            <div className="text-center py-8">
              <p className="text-gray-500">Importando hinos...</p>
            </div>
          )}

          {status === 'success' && result && (
            <div className="space-y-3">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 text-green-800 font-medium mb-2">
                  <CheckCircle size={20} />
                  Importação Concluída!
                </div>
                <p className="text-green-700">✓ {result.success} hino(s) importado(s) com sucesso</p>
                {result.errors.length > 0 && (
                  <p className="text-yellow-700 text-sm mt-2">
                    ⚠️ {result.errors.length} erro(s) ignorado(s)
                  </p>
                )}
              </div>

              {result.errors.length > 0 && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg max-h-48 overflow-y-auto">
                  <p className="font-bold text-yellow-900 mb-2">Erros encontrados:</p>
                  <ul className="text-sm text-yellow-800 space-y-1">
                    {result.errors.map((err, i) => (
                      <li key={i}>• {err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {status === 'error' && result && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 text-red-800 font-medium mb-2">
                <AlertCircle size={20} />
                Erro na Importação
              </div>
              <ul className="text-sm text-red-700 space-y-1 max-h-48 overflow-y-auto">
                {result.errors.map((err, i) => (
                  <li key={i}>• {err}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            {status !== 'success' && (
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500 transition"
              >
                Cancelar
              </button>
            )}
            {status === 'success' && (
              <button
                onClick={() => {
                  onClose();
                  onImportSuccess();
                }}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
              >
                Fechar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
