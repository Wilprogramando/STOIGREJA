import React, { useState } from 'react';
import { Upload, Download, AlertCircle, CheckCircle } from 'lucide-react';
import { importHinosFromCSV } from '../services/db';

interface ImportCSVModalProps {
  onClose: () => void;
  onImportSuccess: () => void;
  tipoHino?: 'harpa' | 'comum';
}

export const ImportCSVModal: React.FC<ImportCSVModalProps> = ({ 
  onClose, 
  onImportSuccess,
  tipoHino = 'comum'
}) => {
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
      
      // Detectar separador (vírgula ou ponto-e-vírgula)
      const lines = content.split('\n');
      const firstLine = lines[0];
      const separator = firstLine.includes(';') ? ';' : ',';
      
      console.log('Separador detectado:', separator);
      console.log('Primeira linha:', firstLine);

      // Converter para formato padrão (vírgula) se for ponto-e-vírgula
      let processedContent = content;
      if (separator === ';') {
        processedContent = content.split('\n').map(line => {
          let result = '';
          let insideQuotes = false;
          
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
              insideQuotes = !insideQuotes;
              result += char;
            } else if (char === ';' && !insideQuotes) {
              result += ',';
            } else {
              result += char;
            }
          }
          
          return result;
        }).join('\n');
      }

      const result = await importHinosFromCSV(processedContent, tipoHino);

      setResult(result);
      setStatus(result.errors.length === 0 ? 'success' : 'error');
    } catch (error) {
      console.error('Erro ao importar:', error);
      setStatus('error');
      setResult({ success: 0, errors: [(error as Error).message] });
    }
  };

  const downloadTemplate = () => {
    let csv: string;
    
    if (tipoHino === 'harpa') {
      csv = `Numero;Nome;C;Letra do hino
1;CHUVAS DE GRAÇA;C;"1 Deus prometeu com certeza, Chuvas de graça mandar;
Ele nos dá fortaleza,
E ricas bênçãos sem par."
2;SAUDOSA LEMBRANÇA;C;"1 Oh! que saudosa lembrança Tenho de ti, ó Siâo,
Terra que eu tanto amo, Pois és do meu coração."`;
    } else {
      csv = `Nome do Hino;Tom;Cantor;Categoria;Observações
Exemplo de Hino;C;Coral;Louvor;Hino clássico
Outro Hino;G;Solo;Adoração;Letra bonita`;
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `modelo-${tipoHino}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getTituloModal = () => {
    return tipoHino === 'harpa' ? 'Importar Hinos da Harpa' : 'Importar Hinos Comuns';
  };

  const getDescricaoColunas = () => {
    if (tipoHino === 'harpa') {
      return 'Colunas esperadas: Número; Nome; Tom; Letra do hino (separadas por ;)';
    }
    return 'Colunas esperadas: Nome; Tom; Cantor; Categoria; Observações (separadas por ;)';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">{getTituloModal()}</h2>

        <div className="space-y-4">
          {status === 'idle' && (
            <>
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-bold text-blue-900 mb-2">📋 Instruções</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Baixe o modelo de arquivo CSV</li>
                  <li>• Preencha com seus {tipoHino === 'harpa' ? 'hinos da Harpa Cristã' : 'hinos comuns'}</li>
                  <li>• Use <strong>ponto-e-vírgula (;)</strong> como separador</li>
                  <li>• Envie o arquivo CSV para importar em massa</li>
                  <li>• Os hinos serão importados na aba "{tipoHino === 'harpa' ? 'Hinos da Harpa' : 'Hinos Comuns'}"</li>
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
                <strong>Formato esperado:</strong> {getDescricaoColunas()}
              </div>

              <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg text-sm text-purple-800">
                <strong>✅ O sistema detecta automaticamente:</strong> Separador (vírgula ou ponto-e-vírgula)
              </div>
            </>
          )}

          {status === 'importing' && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
              <p className="text-gray-500">Importando {tipoHino === 'harpa' ? 'hinos da Harpa' : 'hinos comuns'}...</p>
            </div>
          )}

          {status === 'success' && result && (
            <div className="space-y-3">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 text-green-800 font-medium mb-2">
                  <CheckCircle size={20} />
                  Importação Concluída!
                </div>
                <p className="text-green-700">✓ {result.success} hino(s) importado(s) com sucesso na aba "{tipoHino === 'harpa' ? 'Hinos da Harpa' : 'Hinos Comuns'}"</p>
                {result.errors.length > 0 && (
                  <p className="text-yellow-700 text-sm mt-2">
                    ⚠️ {result.errors.length} aviso(s)
                  </p>
                )}
              </div>

              {result.errors.length > 0 && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg max-h-48 overflow-y-auto">
                  <p className="font-bold text-yellow-900 mb-2">Avisos:</p>
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
            {(status === 'idle' || status === 'error') && (
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500 transition"
              >
                Cancelar
              </button>
            )}
            {status === 'success' && (
              <>
                <button
                  onClick={() => {
                    setStatus('idle');
                    setResult(null);
                  }}
                  className="flex-1 px-4 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500 transition"
                >
                  Importar Mais
                </button>
                <button
                  onClick={() => {
                    onClose();
                    onImportSuccess();
                  }}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                >
                  Fechar
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
