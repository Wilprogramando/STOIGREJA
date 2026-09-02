import React, { useState, useEffect } from 'react';
import {
  Music,
  BookOpen,
  Calendar,
  FileText,
  Plus,
  BarChart3,
  ChevronRight,
  Heart
} from 'lucide-react';
import { getAllHinos, getAllRepertorios, getHinosByType } from '../services/db';
import { Repertorio } from '../types';

interface DashboardProps {
  onPageChange: (page: string) => void;
}

const MESES = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

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
    // Reavalia periodicamente para que o repertório saia do "Próximos Repertórios"
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

  const saudacao = () => {
    const hora = new Date().getHours();
    if (hora < 12) return 'Bom dia';
    if (hora < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  /** Cartão de número, com faixa colorida na lateral e ícone em destaque. */
  const StatCard = ({ icon: Icon, label, value, rodape, cor, onClick }: any) => (
    <button
      onClick={onClick}
      className={`text-left bg-white rounded-2xl border border-gray-100 border-l-4 ${cor.borda} shadow-sm hover:shadow-md transition p-4 w-full`}
    >
      <div className="flex items-start gap-3">
        <div className={`${cor.fundo} ${cor.icone} p-3 rounded-xl shrink-0`}>
          <Icon size={22} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-700 truncate">{label}</p>
          <p className="text-3xl font-extrabold text-gray-900 leading-tight">{value}</p>
          <p className="text-xs text-gray-500 truncate">{rodape}</p>
        </div>
      </div>
    </button>
  );

  /** Botão colorido das ações rápidas. */
  const AcaoRapida = ({ icon: Icon, label, cor, onClick }: any) => (
    <button
      onClick={onClick}
      className={`${cor.fundo} ${cor.texto} rounded-2xl py-5 px-4 font-semibold flex flex-col items-center justify-center gap-2 hover:brightness-95 transition`}
    >
      <Icon size={24} />
      <span className="text-sm">{label}</span>
    </button>
  );

  const proximos = stats.proximosRepertorios;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Saudação */}
      <div>
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900">{saudacao()}! 🙌</h2>
        <p className="text-gray-500 mt-1">Que Deus abençoe o seu ministério.</p>
      </div>

      {/* Números */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <StatCard
          icon={Music}
          label="Hinos Comuns"
          value={stats.totalHinos}
          rodape="Cifrados e prontos"
          cor={{ borda: 'border-l-indigo-500', fundo: 'bg-indigo-50', icone: 'text-indigo-600' }}
          onClick={() => onPageChange('cadastrar-hino')}
        />
        <StatCard
          icon={BookOpen}
          label="Hinos da Harpa"
          value={stats.totalHarpa}
          rodape="Harpa Cristã"
          cor={{ borda: 'border-l-purple-500', fundo: 'bg-purple-50', icone: 'text-purple-600' }}
          onClick={() => onPageChange('harpa')}
        />
        <StatCard
          icon={Music}
          label="Repertórios Criados"
          value={stats.totalRepertorios}
          rodape="No total"
          cor={{ borda: 'border-l-green-500', fundo: 'bg-green-50', icone: 'text-green-600' }}
          onClick={() => onPageChange('repertorios')}
        />
        <StatCard
          icon={Calendar}
          label="Próximos Repertórios"
          value={proximos.length}
          rodape="Ainda ativos"
          cor={{ borda: 'border-l-orange-500', fundo: 'bg-orange-50', icone: 'text-orange-600' }}
          onClick={() => onPageChange('repertorios')}
        />
      </div>

      {/* Próximos Repertórios */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Calendar size={22} className="text-indigo-600" />
            Próximos Repertórios
          </h3>
          <button
            onClick={() => onPageChange('repertorios')}
            className="text-sm font-semibold text-indigo-600 hover:text-indigo-700"
          >
            Ver todos
          </button>
        </div>

        {proximos.length > 0 ? (
          <div className="space-y-3">
            {proximos.map((rep, index) => {
              const [, mes, dia] = (rep.data || '').split('-');

              return (
                <button
                  key={rep.id}
                  onClick={() => onPageChange('repertorios')}
                  className="w-full text-left bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition p-4 flex items-center gap-4"
                >
                  <div className="w-16 shrink-0 rounded-xl border border-gray-200 py-2 text-center">
                    <p className="text-2xl font-extrabold text-indigo-600 leading-none">
                      {dia || '--'}
                    </p>
                    <p className="text-xs font-bold text-gray-500 mt-1">
                      {MESES[Number(mes) - 1] || ''}
                    </p>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-gray-900 truncate">{rep.nome}</h4>
                      {index === 0 && (
                        <span className="shrink-0 text-[10px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">
                          PRÓXIMO
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      📅 {rep.data ? rep.data.split('-').reverse().join('/') : 'Data não definida'}
                      {rep.horario && ` às ${rep.horario}`}
                    </p>
                    <p className="text-sm text-gray-500">🎵 {rep.hinos.length} hino(s)</p>
                  </div>

                  <span className="shrink-0 p-2 rounded-lg bg-gray-50 text-gray-500">
                    <ChevronRight size={18} />
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
            <p className="text-gray-600">Nenhum repertório agendado</p>
            <button
              onClick={() => onPageChange('montar-repertorio')}
              className="mt-4 px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition text-sm font-semibold"
            >
              Montar Repertório
            </button>
          </div>
        )}
      </div>

      {/* Ações rápidas */}
      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-3">Ações rápidas</h3>
        <div className="grid grid-cols-2 gap-3">
          <AcaoRapida
            icon={Plus}
            label="Cadastrar Hino"
            cor={{ fundo: 'bg-indigo-50', texto: 'text-indigo-700' }}
            onClick={() => onPageChange('cadastrar-hino')}
          />
          <AcaoRapida
            icon={Music}
            label="Montar Repertório"
            cor={{ fundo: 'bg-green-50', texto: 'text-green-700' }}
            onClick={() => onPageChange('montar-repertorio')}
          />
          <AcaoRapida
            icon={FileText}
            label="Ver Repertórios"
            cor={{ fundo: 'bg-orange-50', texto: 'text-orange-700' }}
            onClick={() => onPageChange('repertorios')}
          />
          <AcaoRapida
            icon={BarChart3}
            label="Relatórios"
            cor={{ fundo: 'bg-blue-50', texto: 'text-blue-700' }}
            onClick={() => onPageChange('relatorios')}
          />
        </div>
      </div>

      {/* Chamada final */}
      <button
        onClick={() => onPageChange('montar-repertorio')}
        className="w-full text-left bg-gradient-to-r from-indigo-700 to-violet-600 text-white rounded-2xl p-5 flex items-center gap-4 shadow-md hover:shadow-lg transition"
      >
        <Heart size={40} className="shrink-0 opacity-90" />
        <div className="flex-1">
          <p className="font-bold">Prepare-se para o próximo culto!</p>
          <p className="text-indigo-100 text-sm">
            Monte seu repertório e leve adoração com excelência.
          </p>
        </div>
        <ChevronRight size={22} className="shrink-0" />
      </button>
    </div>
  );
};
