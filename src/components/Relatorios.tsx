import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp } from 'lucide-react';
import { getAllRepertorios, getAllHinos } from '../services/db';
import { Hino } from '../types';

interface HinoUsage {
  id: string;
  nome: string;
  tom: string;
  cantor: string;
  categoria: string;
  usageCount: number;
  ultimoUso: string;
}

export const Relatorios: React.FC = () => {
  const [hinosUsage, setHinosUsage] = useState<HinoUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [topHinos, setTopHinos] = useState<HinoUsage[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRelatorio();
  }, []);

  const loadRelatorio = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Carregando repertórios...');
      const repertorios = await getAllRepertorios();
      console.log('Repertórios carregados:', repertorios.length);

      console.log('Carregando hinos...');
      const todosHinos = await getAllHinos();
      console.log('Hinos carregados:', todosHinos.length);

      // Contar uso de cada hino
      const usageMap = new Map<string, { hino: Hino; count: number; ultimoUso: string }>();

      repertorios.forEach((rep: any) => {
        console.log('Processando repertório:', rep.nome, 'Hinos:', rep.lista_hinos?.length || 0);
        
        if (rep.lista_hinos && Array.isArray(rep.lista_hinos)) {
          rep.lista_hinos.forEach((hinoRef: any) => {
            // Tentar pegar o ID do hino (pode ser string ou objeto)
            const hinoId = typeof hinoRef === 'string' ? hinoRef : hinoRef.id;
            
            if (!hinoId) return;

            const hino = todosHinos.find(h => h.id === hinoId);
            
            if (hino) {
              const dataUso = rep.data_culto || rep.data || new Date().toISOString();
              const current = usageMap.get(hinoId);
              
              if (current) {
                current.count += 1;
                // Atualizar para data mais recente
                if (new Date(dataUso) > new Date(current.ultimoUso)) {
                  current.ultimoUso = dataUso;
                }
              } else {
                usageMap.set(hinoId, {
                  hino,
                  count: 1,
                  ultimoUso: dataUso
                });
              }
            }
          });
        }
      });

      console.log('Hinos únicos usados:', usageMap.size);

      // Converter para array e ordenar
      const hinoUsageArray: HinoUsage[] = Array.from(usageMap.values()).map(item => ({
        id: item.hino.id,
        nome: item.hino.nome,
        tom: item.hino.tom || 'N/A',
        cantor: item.hino.cantor || 'N/A',
        categoria: item.hino.categoria || 'Sem categoria',
        usageCount: item.count,
        ultimoUso: item.ultimoUso
      }));

      // Ordenar por uso (decrescente)
      hinoUsageArray.sort((a, b) => b.usageCount - a.usageCount);

      console.log('Relatório processado:', hinoUsageArray.length, 'hinos');

      setHinosUsage(hinoUsageArray);
      setTopHinos(hinoUsageArray.slice(0, 10));
    } catch (error) {
      console.error('Erro ao carregar relatório:', error);
      setError('Erro ao carregar relatório. Verifique o console para mais detalhes.');
    } finally {
      setLoading(false);
    }
  };

  const formatarData = (data: string) => {
    if (!data) return 'N/A';
    try {
      const date = new Date(data);
      return date.toLocaleDateString('pt-BR');
    } catch {
      return 'N/A';
    }
  };

  const getColorByRank = (index: number) => {
    if (index === 0) return 'border-t-4 border-yellow-400 bg-yellow-50';
    if (index === 1) return 'border-t-4 border-gray-400 bg-gray-50';
    if (index === 2) return 'border-t-4 border-orange-400 bg-orange-50';
    return 'border-t-4 border-blue-400 bg-blue-50';
  };

  if (loading) {
    return (
      <div className="p-4 text-center">
        <p className="text-gray-500">Carregando relatório...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
        <p>{error}</p>
        <button
          onClick={() => loadRelatorio()}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Tentar Novamente
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 pb-20">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <BarChart3 size={28} className="text-indigo-600" />
          <h1 className="text-2xl font-bold text-gray-900">Relatório de Hinos</h1>
        </div>
        <p className="text-gray-600">Hinos mais usados em repertórios (Top 10)</p>
      </div>

      {/* Stats */}
      <div className="mb-6 p-4 bg-indigo-50 rounded-lg border border-indigo-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-indigo-600 font-medium">Total de Hinos Usados</p>
            <p className="text-2xl font-bold text-indigo-900">{hinosUsage.length}</p>
          </div>
          <div>
            <p className="text-sm text-indigo-600 font-medium">Total de Usos</p>
            <p className="text-2xl font-bold text-indigo-900">
              {hinosUsage.reduce((sum, h) => sum + h.usageCount, 0)}
            </p>
          </div>
          <div>
            <p className="text-sm text-indigo-600 font-medium">Hino Mais Usado</p>
            <p className="text-2xl font-bold text-indigo-900">
              {topHinos[0]?.usageCount || 0}x
            </p>
          </div>
        </div>
      </div>

      {/* Top 10 Cards */}
      {topHinos.length > 0 ? (
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <TrendingUp size={20} />
            Top 10 Hinos Mais Usados
          </h2>
          
          {topHinos.map((hino, index) => (
            <div
              key={hino.id}
              className={`p-4 rounded-lg shadow-sm ${getColorByRank(index)}`}
            >
              {/* Posição e Medalha */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="text-3xl font-bold text-gray-600 w-12 text-center">
                    {index === 0 && '🥇'}
                    {index === 1 && '🥈'}
                    {index === 2 && '🥉'}
                    {index > 2 && `#${index + 1}`}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900">{hino.nome}</h3>
                    <p className="text-xs text-gray-600">
                      🎵 {hino.tom} • 👤 {hino.cantor}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-indigo-600">{hino.usageCount}x</p>
                  <p className="text-xs text-gray-500">usos</p>
                </div>
              </div>

              {/* Informações Adicionais */}
              <div className="flex items-center justify-between text-xs text-gray-600 pt-2 border-t border-gray-200">
                <span>📂 {hino.categoria}</span>
                <span>📅 Último uso: {formatarData(hino.ultimoUso)}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-lg">
          <p className="text-gray-500 text-lg">Nenhum hino foi usado em repertórios ainda</p>
          <p className="text-sm text-gray-400 mt-2">Crie um repertório e adicione hinos para ver aqui!</p>
        </div>
      )}

      {/* Tabela Completa (opcional, hidden no mobile) */}
      {hinosUsage.length > 10 && (
        <div className="mt-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Ranking Completo</h2>
          <div className="overflow-x-auto bg-white rounded-lg shadow">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="px-4 py-2 text-left">#</th>
                  <th className="px-4 py-2 text-left">Hino</th>
                  <th className="px-4 py-2 text-center">Tom</th>
                  <th className="px-4 py-2 text-left">Cantor</th>
                  <th className="px-4 py-2 text-center">Usos</th>
                  <th className="px-4 py-2 text-left">Último Uso</th>
                </tr>
              </thead>
              <tbody>
                {hinosUsage.map((hino, index) => (
                  <tr key={hino.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-2 font-bold text-center text-gray-600">
                      {index === 0 && '🥇'}
                      {index === 1 && '🥈'}
                      {index === 2 && '🥉'}
                      {index > 2 && index + 1}
                    </td>
                    <td className="px-4 py-2 font-medium text-gray-900">{hino.nome}</td>
                    <td className="px-4 py-2 text-center">{hino.tom}</td>
                    <td className="px-4 py-2 text-gray-600">{hino.cantor}</td>
                    <td className="px-4 py-2 text-center font-bold text-indigo-600">
                      {hino.usageCount}x
                    </td>
                    <td className="px-4 py-2 text-gray-600">
                      {formatarData(hino.ultimoUso)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
