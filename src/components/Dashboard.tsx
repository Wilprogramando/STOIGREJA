import React, { useState, useEffect } from 'react';
import { Music, BookOpen, Calendar, FileText, Plus, BarChart3 } from 'lucide-react';
import { getAllHinos, getAllRepertorios, getHinosByType } from '../services/db';
import { Hino, Repertorio } from '../types';
import { Relatorios } from './Relatorios';

interface DashboardProps {
  onPageChange: (page: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onPageChange }) => {
  const [stats, setStats] = useState({
    totalHinos: 0,
    totalHarpa: 0,
    totalRepertorios: 0,
    proximosRepertorios: [] as Repertorio[],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
    // Reavalia periodicamente para que o repertório saia do "Próximo Repertório"
    // assim que completar 24h da data/horário informado.
    const timer = setInterval(loadStats, 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  // Data/hora do repertório + 24h. Sem horário, considera 00:00.
  const fimDaExibicao = (rep: Repertorio) => {
    const [ano, mes, dia] = (rep.data || '').split('-').map(Number);
    if (!ano || !mes || !dia) return null;
    const [hora, minuto] = (rep.horario || '00:00').split(':').map(Number);
    const inicio = new Date(ano, mes - 1, dia, hora || 0, minuto || 0, 0, 0);
    return new Date(inicio.getTime() + 24 * 60 * 60 * 1000);
  };

  const loadStats = async () => {
    try {
      const hinos = await getAllHinos();
      const harpaHinos = await getHinosByType('harpa');
      const repertorios = await getAllRepertorios();

      const agora = new Date();
      // Todos os repertórios ativos: os que ainda não completaram 24h.
      const ativos = repertorios
        .filter(r => {
          const fim = fimDaExibicao(r);
          return fim !== null && fim.getTime() > agora.getTime();
        })
        .sort((a, b) =>
          a.data.localeCompare(b.data) || (a.horario || '').localeCompare(b.horario || '')
        );

      setStats({
        totalHinos: hinos.filter(h => h.tipo === 'comum').length,
        totalHarpa: harpaHinos.length,
        totalRepertorios: repertorios.length,
        proximosRepertorios: ativos,
      });
    } catch (error) {
      console.error('Erro ao carregar stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-500 text-lg">Carregando dashboard...</p>
      </div>
    );
  }

  const StatCard = ({ icon: Icon, label, value, color, onClick }: any) => (
    <div 
      onClick={onClick}
      className={`bg-white p-6 rounded-lg shadow-md border-l-4 ${color} cursor-pointer hover:shadow-lg transition transform hover:scale-105`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-sm font-medium">{label}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
        </div>
        <Icon className={color.replace('border-', 'text-')} size={32} />
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto">
      <h2 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h2>

      <div className="space-y-8">
        {/* Cards Principais */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <StatCard
            icon={Music}
            label="Hinos Comuns"
            value={stats.totalHinos}
            color="border-blue-500 text-blue-500"
            onClick={() => onPageChange('cadastrar-hino')}
          />
          <StatCard
            icon={BookOpen}
            label="Hinos da Harpa"
            value={stats.totalHarpa}
            color="border-purple-500 text-purple-500"
            onClick={() => onPageChange('harpa')}
          />
          <StatCard
            icon={Calendar}
            label="Total de Repertórios"
            value={stats.totalRepertorios}
            color="border-green-500 text-green-500"
            onClick={() => onPageChange('repertorios')}
          />
        </div>

        {/* Próximos Repertórios */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar size={24} className="text-indigo-600" />
            Próximos Repertórios
            {stats.proximosRepertorios.length > 0 && (
              <span className="text-sm font-medium text-gray-500">
                ({stats.proximosRepertorios.length})
              </span>
            )}
          </h3>
          {stats.proximosRepertorios.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {stats.proximosRepertorios.map((rep, index) => (
                <div
                  key={rep.id}
                  className={`p-4 rounded-lg ${
                    index === 0 ? 'bg-indigo-50 border-2 border-indigo-300' : 'bg-gray-50 border border-gray-200'
                  }`}
                >
                  {index === 0 && (
                    <span className="inline-block mb-1 text-xs font-bold text-indigo-600 uppercase">
                      Próximo
                    </span>
                  )}
                  <h4 className="font-bold text-lg text-indigo-900">{rep.nome}</h4>
                  <p className="text-indigo-700 mt-2">
                    📅 {rep.data ? rep.data.split('-').reverse().join('/') : 'Data não definida'}
                    {rep.horario && ` às ${rep.horario}`}
                  </p>
                  <p className="text-indigo-600 text-sm mt-1">🎵 {rep.hinos.length} hino(s)</p>
                  <button
                    onClick={() => onPageChange('repertorios')}
                    className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm font-medium"
                  >
                    Ver Detalhes
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 bg-gray-50 rounded-lg text-gray-600 text-center">
              <p>Nenhum repertório agendado</p>
              <button
                onClick={() => onPageChange('montar-repertorio')}
                className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm font-medium"
              >
                Montar Repertório
              </button>
            </div>
          )}
        </div>

        {/* Botões de Ação */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={() => onPageChange('cadastrar-hino')}
            className="p-4 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg shadow-md hover:shadow-lg transition flex items-center justify-center gap-2"
          >
            <Plus size={20} />
            <span>Cadastrar Hino</span>
          </button>
          <button
            onClick={() => onPageChange('montar-repertorio')}
            className="p-4 bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg shadow-md hover:shadow-lg transition flex items-center justify-center gap-2"
          >
            <Music size={20} />
            <span>Montar Repertório</span>
          </button>
          <button
            onClick={() => onPageChange('repertorios')}
            className="p-4 bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-lg shadow-md hover:shadow-lg transition flex items-center justify-center gap-2"
          >
            <FileText size={20} />
            <span>Ver Repertórios</span>
          </button>
          <button
            onClick={() => onPageChange('relatorios')}
            className="p-4 bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-lg shadow-md hover:shadow-lg transition flex items-center justify-center gap-2"
          >
            <BarChart3 size={20} />
            <span>Relatórios</span>
          </button>
        </div>
      </div>
    </div>
  );
};
