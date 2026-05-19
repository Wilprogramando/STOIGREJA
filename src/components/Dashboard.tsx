import React, { useState, useEffect } from 'react';
import { Music, BookOpen, Calendar, FileText, Plus } from 'lucide-react';
import { getAllHinos, getAllRepertorios, getHinosByType } from '../services/db';
import { Hino, Repertorio } from '../types';

interface DashboardProps {
  onPageChange: (page: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onPageChange }) => {
  const [stats, setStats] = useState({
    totalHinos: 0,
    totalHarpa: 0,
    proximoRepertorio: null as Repertorio | null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const hinos = await getAllHinos();
      const harpaHinos = await getHinosByType('harpa');
      const repertorios = await getAllRepertorios();

      const hoje = new Date().toISOString().split('T')[0];
      const proximoRep = repertorios
        .filter(r => r.data >= hoje)
        .sort((a, b) => a.data.localeCompare(b.data))[0];

      setStats({
        totalHinos: hinos.filter(h => h.tipo === 'comum').length,
        totalHarpa: harpaHinos.length,
        proximoRepertorio: proximoRep || null,
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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
            value="0"
            color="border-green-500 text-green-500"
            onClick={() => onPageChange('repertorios')}
          />
          <StatCard
            icon={FileText}
            label="PDFs Gerados"
            value="0"
            color="border-orange-500 text-orange-500"
            onClick={() => onPageChange('montar-repertorio')}
          />
        </div>

        {/* Próximo Repertório */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar size={24} className="text-indigo-600" />
            Próximo Repertório
          </h3>
          {stats.proximoRepertorio ? (
            <div className="p-4 bg-indigo-50 rounded-lg">
              <h4 className="font-bold text-lg text-indigo-900">{stats.proximoRepertorio.nome}</h4>
              <p className="text-indigo-700 mt-2">
                📅 {stats.proximoRepertorio.data ? stats.proximoRepertorio.data.split('-').reverse().join('/') : 'Data não definida'}
                {stats.proximoRepertorio.horario && ` às ${stats.proximoRepertorio.horario}`}
              </p>
              <p className="text-indigo-600 text-sm mt-1">
                🎵 {stats.proximoRepertorio.hinos.length} hino(s)
              </p>
              <button
                onClick={() => onPageChange('repertorios')}
                className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm font-medium"
              >
                Ver Detalhes
              </button>
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
            onClick={() => onPageChange('harpa')}
            className="p-4 bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-lg shadow-md hover:shadow-lg transition flex items-center justify-center gap-2"
          >
            <BookOpen size={20} />
            <span>Hinos da Harpa</span>
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
        </div>
      </div>
    </div>
  );
};
