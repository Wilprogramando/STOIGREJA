import React, { useState, useEffect } from 'react';
import {
  Music,
  BookOpen,
  Calendar,
  FileText,
  Plus,
  BarChart3,
  ChevronRight,
  TrendingUp,
  Music2
} from 'lucide-react';
import { getAllHinos, getAllRepertorios, getHinosByType } from '../services/db';
import { Repertorio, Hino } from '../types';

interface DashboardProps {
  onPageChange: (page: string) => void;
}

const FRASES = [
  "O Senhor é o meu pastor, nada me faltará. (Sl 23:1)",
  "Tudo posso naquele que me fortalece. (Fp 4:13)",
  "Cantai ao Senhor um cântico novo. (Sl 96:1)",
  "O choro pode durar uma noite, mas a alegria vem pela manhã. (Sl 30:5)",
  "Entrega o teu caminho ao Senhor. (Sl 37:5)",
  "Louvai ao Senhor, porque ele é bom. (Sl 136:1)",
  "A alegria do Senhor é a vossa força. (Ne 8:10)",
  "Deus é o nosso refúgio e fortaleza. (Sl 46:1)",
  "Este é o dia que o Senhor fez. (Sl 118:24)",
  "Servi ao Senhor com alegria. (Sl 100:2)",
  "Eu e a minha casa serviremos ao Senhor. (Js 24:15)",
  "Tudo o que tem fôlego louve ao Senhor. (Sl 150:6)",
  "As misericórdias do Senhor se renovam a cada manhã. (Lm 3:23)",
  "Buscai primeiro o Reino de Deus. (Mt 6:33)",
  "Lâmpada para os meus pés é a tua palavra. (Sl 119:105)",
];

/**
 * Escreve e apaga as frases uma a uma, em ciclo (efeito máquina de escrever).
 */
const useFraseAnimada = () => {
  const [indice, setIndice] = useState(0);
  const [texto, setTexto] = useState("");
  const [apagando, setApagando] = useState(false);

  useEffect(() => {
    const frase = FRASES[indice % FRASES.length];

    // Pausa com a frase inteira na tela antes de começar a apagar.
    if (!apagando && texto === frase) {
      const espera = setTimeout(() => setApagando(true), 2500);
      return () => clearTimeout(espera);
    }

    // Terminou de apagar: passa para a próxima frase.
    if (apagando && texto === "") {
      setApagando(false);
      setIndice(i => (i + 1) % FRASES.length);
      return;
    }

    const passo = setTimeout(
      () => setTexto(apagando ? frase.slice(0, texto.length - 1) : frase.slice(0, texto.length + 1)),
      apagando ? 25 : 45
    );
    return () => clearTimeout(passo);
  }, [texto, apagando, indice]);

  return texto;
};

const MESES = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

/** Quantos hinos aparecem no gráfico dos mais cantados. */
const TOP_MAIS_CANTADOS = 8;

/** Tira acentos para comparar textos sem depender da digitação. */
const semAcento = (texto: string) =>
  (texto || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Hinos de saudação não entram na conta: são cantados quase sempre. */
const ehSaudacao = (nome: string) => semAcento(nome).includes('saudacao');

interface HinoContado {
  nome: string;
  total: number;
}

/**
 * Conta quantas vezes cada hino comum entrou nos repertórios dos últimos 30 dias.
 * Fora da conta: hinos da Harpa e os que têm "saudação" no nome.
 */
function contarMaisCantados(repertorios: Repertorio[], hinos: Hino[]): HinoContado[] {
  const limite = new Date();
  limite.setDate(limite.getDate() - 30);
  limite.setHours(0, 0, 0, 0);

  const porId = new Map(hinos.map(h => [h.id, h]));
  const contagem = new Map<string, number>();

  repertorios.forEach(rep => {
    const [ano, mes, dia] = (rep.data || '').split('-').map(Number);
    if (!ano || !mes || !dia) return;
    const data = new Date(ano, mes - 1, dia);
    if (data < limite || data.getTime() > Date.now()) return;

    (rep.hinos || []).forEach((item: any) => {
      const id = typeof item === 'string' ? item : item?.hinoId || item?.id;
      const hino = id ? porId.get(id) : undefined;
      if (!hino) return;
      if (hino.tipo === 'harpa' || hino.numeroHarpa) return;
      if (ehSaudacao(hino.nome)) return;
      contagem.set(hino.nome, (contagem.get(hino.nome) || 0) + 1);
    });
  });

  return Array.from(contagem.entries())
    .map(([nome, total]) => ({ nome, total }))
    .sort((a, b) => b.total - a.total || a.nome.localeCompare(b.nome, 'pt-BR'))
    .slice(0, TOP_MAIS_CANTADOS);
}

export const Dashboard: React.FC<DashboardProps> = ({ onPageChange }) => {
  const [stats, setStats] = useState({
    totalHinos: 0,
    totalHarpa: 0,
    proximosRepertorios: [] as Repertorio[],
    maisCantados: [] as HinoContado[],
  });
  const [loading, setLoading] = useState(true);
  const frase = useFraseAnimada();

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

  // Mostra "Hoje" no lugar da data quando o repertório é do dia atual
  const ehHoje = (data?: string) => {
    if (!data) return false;
    const hoje = new Date();
    const mm = String(hoje.getMonth() + 1).padStart(2, '0');
    const dd = String(hoje.getDate()).padStart(2, '0');
    return data === hoje.getFullYear() + '-' + mm + '-' + dd;
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
        proximosRepertorios: ativos,
        maisCantados: contarMaisCantados(repertorios, hinos),
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
      className={`relative overflow-hidden text-left bg-white rounded-2xl border border-gray-100 border-l-4 ${cor.borda} shadow-lg hover:shadow-xl transition p-3 sm:p-4 w-full`}
    >
      {/* Marca d'água: o próprio ícone do card, grande e bem apagado */}
      <Icon
        size={110}
        className={`${cor.icone} opacity-10 absolute -right-4 -bottom-4 pointer-events-none`}
        strokeWidth={1.5}
      />

      <div className="relative flex items-start gap-2 sm:gap-3">
        <div className={`${cor.fundo} ${cor.icone} p-2 sm:p-3 rounded-xl shrink-0`}>
          <Icon size={20} />
        </div>
        <div className="min-w-0">
          <p className="text-xs sm:text-sm font-semibold text-gray-700 truncate">{label}</p>
          <p className="text-2xl sm:text-3xl font-extrabold text-gray-900 leading-tight">{value}</p>
          <p className="text-xs text-gray-500 truncate">{rodape}</p>
        </div>
      </div>
    </button>
  );

  /** Botão colorido das ações rápidas. */
  const AcaoRapida = ({ icon: Icon, label, cor, onClick }: any) => (
    <button
      onClick={onClick}
      className={`${cor.fundo} ${cor.texto} rounded-2xl py-5 px-4 font-semibold flex flex-col items-center justify-center gap-2 shadow-lg hover:shadow-xl hover:brightness-95 transition`}
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
        <p className="text-gray-500 mt-1 min-h-[1.5rem] text-sm md:text-base">
          {frase}
          <span className="inline-block w-[2px] h-4 align-middle ml-0.5 bg-indigo-500 animate-pulse" />
        </p>
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
              const hoje = ehHoje(rep.data);

              return (
                <button
                  key={rep.id}
                  onClick={() => onPageChange('repertorios')}
                  className="w-full text-left bg-white rounded-2xl border border-gray-100 shadow-lg hover:shadow-xl transition p-4 flex items-center gap-4"
                >
                  <div className={`w-16 shrink-0 rounded-xl border py-2 text-center ${
                    hoje ? 'border-green-300 bg-green-50' : 'border-gray-200'
                  }`}>
                    <p className={`text-2xl font-extrabold leading-none ${
                      hoje ? 'text-green-600' : 'text-indigo-600'
                    }`}>
                      {dia || '--'}
                    </p>
                    <p className="text-xs font-bold text-gray-500 mt-1">
                      {MESES[Number(mes) - 1] || ''}
                    </p>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-gray-900 truncate">{rep.nome}</h4>
                      {hoje ? (
                        <span className="shrink-0 text-[10px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                          HOJE
                        </span>
                      ) : index === 0 ? (
                        <span className="shrink-0 text-[10px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">
                          PRÓXIMO
                        </span>
                      ) : null}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      📅 {hoje
                        ? 'Hoje'
                        : rep.data
                          ? rep.data.split('-').reverse().join('/')
                          : 'Data não definida'}
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
          <div className="bg-white rounded-2xl border border-gray-100 shadow-lg p-8 text-center">
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

      {/* Números */}
      <div className="grid grid-cols-2 gap-3">
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
      </div>

      {/* Mais cantados nos últimos 30 dias */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-lg p-4 sm:p-6">
        <div className="flex items-start gap-3 mb-1">
          <div className="bg-indigo-50 text-indigo-600 p-2 rounded-xl shrink-0">
            <TrendingUp size={20} />
          </div>
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-gray-900">Mais cantados</h3>
            <p className="text-xs text-gray-500">
              Últimos 30 dias • hinos comuns, sem os de saudação
            </p>
          </div>
        </div>

        {stats.maisCantados.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-8">
            Nenhum hino cantado nos últimos 30 dias.
          </p>
        ) : (
          <div className="mt-5 space-y-3">
            {stats.maisCantados.map((item, index) => {
              const maior = stats.maisCantados[0].total || 1;
              const largura = Math.max(8, Math.round((item.total / maior) * 100));

              return (
                <div
                  key={item.nome}
                  title={`${item.nome}: ${item.total} vez(es)`}
                  className="bg-indigo-50/60 rounded-2xl p-3 flex items-center gap-3"
                >
                  {/* Posição no ranking */}
                  <span className="shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-indigo-100 text-indigo-700 font-extrabold flex items-center justify-center tabular-nums">
                    {index + 1}
                  </span>

                  <Music2 size={18} className="text-indigo-500 shrink-0 hidden sm:block" />

                  {/* Nome e barra */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm sm:text-base font-bold text-gray-900 truncate">
                      {item.nome}
                    </p>
                    <div className="mt-1.5 h-1.5 w-full bg-indigo-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 transition-all duration-500"
                        style={{ width: `${largura}%` }}
                      />
                    </div>
                  </div>

                  {/* Quantidade */}
                  <span className="shrink-0 text-lg sm:text-xl font-extrabold text-gray-900 tabular-nums">
                    {item.total}
                  </span>

                  <span className="shrink-0 w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
                    <Music2 size={15} />
                  </span>
                </div>
              );
            })}
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

    </div>
  );
};
