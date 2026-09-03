import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, BookOpen, Music2, Calendar, Table2, ChevronDown } from 'lucide-react';
import { getAllRepertorios, getAllHinos } from '../services/db';
import { Hino } from '../types';

interface HinoUsage {
  id: string;
  nome: string;
  tom: string;
  cantor: string;
  categoria: string;
  numeroHarpa?: number;
  usageCount: number;
  usos30dias: number;
  ultimoUso: string;
}

/** Data de corte: repertórios dos últimos 30 dias entram na conta do período. */
function inicioDos30Dias() {
  const limite = new Date();
  limite.setDate(limite.getDate() - 30);
  limite.setHours(0, 0, 0, 0);
  return limite;
}

/** O culto aconteceu nos últimos 30 dias? */
function dentroDos30Dias(data: string, limite: Date) {
  const [ano, mes, dia] = (data || '').split('-').map(Number);
  if (!ano || !mes || !dia) return false;
  const doCulto = new Date(ano, mes - 1, dia);
  return doCulto >= limite && doCulto.getTime() <= Date.now();
}

/** Tira acentos e maiúsculas para comparar nomes com segurança. */
function normalizar(texto: string) {
  return (texto || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

/** Hinos de saudação não entram em nenhum relatório. */
function ehSaudacao(hino: Hino) {
  return normalizar(hino.nome).includes('saudacao');
}

/** Hino da Harpa Cristã (tem tipo "harpa" ou número da harpa). */
function ehDaHarpa(hino: Hino) {
  return hino.tipo === 'harpa' || (hino.numeroHarpa !== undefined && hino.numeroHarpa !== null);
}

/** Medalha dos três primeiros; do quarto em diante, só o número. */
const MEDALHAS = ['🥇', '🥈', '🥉'];

export const Relatorios: React.FC = () => {
  const [hinosUsage, setHinosUsage] = useState<HinoUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [topHinos, setTopHinos] = useState<HinoUsage[]>([]);
  const [topHarpa, setTopHarpa] = useState<HinoUsage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [repertorios30dias, setRepertorios30dias] = useState(0);
  const [aba, setAba] = useState<'comuns' | 'harpa'>('comuns');
  const [mostrarTabela, setMostrarTabela] = useState(false);

  useEffect(() => {
    loadRelatorio();
  }, []);

  const loadRelatorio = async () => {
    try {
      setLoading(true);
      setError(null);

      const repertorios = await getAllRepertorios();
      const todosHinos = await getAllHinos();

      const limite30dias = inicioDos30Dias();

      // Repertórios (cultos) que aconteceram nos últimos 30 dias.
      setRepertorios30dias(
        repertorios.filter((rep: any) => dentroDos30Dias(rep.data, limite30dias)).length
      );

      // Conta quantas vezes cada hino apareceu nos repertórios.
      const usageMap = new Map<
        string,
        { hino: Hino; count: number; count30: number; ultimoUso: string }
      >();

      repertorios.forEach((rep: any) => {
        if (!rep.hinos || !Array.isArray(rep.hinos)) return;

        const recente = dentroDos30Dias(rep.data, limite30dias);

        rep.hinos.forEach((hinoRef: any) => {
          // O repertório guarda o hino como ID (novos) ou como objeto (antigos).
          const hinoId =
            typeof hinoRef === 'string' ? hinoRef : hinoRef?.hinoId || hinoRef?.id;
          if (!hinoId) return;

          const hino = todosHinos.find(h => h.id === hinoId);
          if (!hino) return;

          const dataUso = rep.data || new Date().toISOString();
          const atual = usageMap.get(hinoId);

          if (atual) {
            atual.count += 1;
            if (recente) atual.count30 += 1;
            if (new Date(dataUso) > new Date(atual.ultimoUso)) {
              atual.ultimoUso = dataUso;
            }
          } else {
            usageMap.set(hinoId, {
              hino,
              count: 1,
              count30: recente ? 1 : 0,
              ultimoUso: dataUso
            });
          }
        });
      });

      // Hinos de saudação ficam de fora de todos os relatórios.
      const usados = Array.from(usageMap.values()).filter(item => !ehSaudacao(item.hino));

      const paraUsage = (item: {
        hino: Hino;
        count: number;
        count30: number;
        ultimoUso: string;
      }): HinoUsage => ({
        id: item.hino.id,
        nome: item.hino.nome,
        tom: item.hino.tom || 'N/A',
        cantor: item.hino.cantor || 'N/A',
        categoria: item.hino.categoria || 'Sem categoria',
        numeroHarpa: item.hino.numeroHarpa,
        usageCount: item.count,
        usos30dias: item.count30,
        ultimoUso: item.ultimoUso
      });

      const porUso = (a: HinoUsage, b: HinoUsage) =>
        b.usageCount - a.usageCount || a.nome.localeCompare(b.nome, 'pt-BR');

      const comuns = usados.filter(item => !ehDaHarpa(item.hino)).map(paraUsage).sort(porUso);
      const harpa = usados.filter(item => ehDaHarpa(item.hino)).map(paraUsage).sort(porUso);

      setHinosUsage(comuns);
      setTopHinos(comuns.slice(0, 10));
      setTopHarpa(harpa.slice(0, 10));
    } catch (erro) {
      console.error('Erro ao carregar relatório:', erro);
      setError('Não foi possível carregar o relatório. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const formatarData = (data: string) => {
    if (!data) return 'N/A';
    try {
      return new Date(data).toLocaleDateString('pt-BR');
    } catch {
      return 'N/A';
    }
  };

  /** Card branco padrão da tela. */
  const Painel: React.FC<{ children: React.ReactNode; className?: string }> = ({
    children,
    className = ''
  }) => (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-lg ${className}`}>
      {children}
    </div>
  );

  /** Número em destaque, no mesmo estilo dos cards do Dashboard. */
  const Resumo = ({ icon: Icon, label, valor, className = '' }: any) => (
    <Painel className={`relative overflow-hidden p-4 ${className}`}>
      <Icon
        size={52}
        strokeWidth={1.5}
        className="text-indigo-600 opacity-10 absolute -right-2 -bottom-2 pointer-events-none"
      />
      <div className="relative">
        <p className="text-xs sm:text-sm font-semibold text-gray-700">{label}</p>
        <p className="text-2xl sm:text-3xl font-extrabold text-gray-900 leading-tight">{valor}</p>
      </div>
    </Painel>
  );

  /** Uma linha do ranking: posição, nome, barra e total de usos. */
  const LinhaRanking = ({
    hino,
    index,
    maior
  }: {
    hino: HinoUsage;
    index: number;
    maior: number;
  }) => {
    const largura = Math.max(8, Math.round((hino.usageCount / (maior || 1)) * 100));

    return (
      <div className="bg-indigo-50/60 rounded-2xl p-3 flex items-center gap-3">
        <span className="shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-indigo-100 text-indigo-700 font-extrabold flex items-center justify-center tabular-nums text-base">
          {MEDALHAS[index] || index + 1}
        </span>

        <div className="flex-1 min-w-0">
          <p className="text-sm sm:text-base font-bold text-gray-900 break-words">
            {hino.numeroHarpa ? `${hino.numeroHarpa} - ` : ''}
            {hino.nome}
          </p>

          <div className="flex items-center gap-2 mt-1">
            <span
              className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                hino.usos30dias > 0
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-500'
              }`}
              title="Vezes cantado nos últimos 30 dias"
            >
              {hino.usos30dias}x em 30 dias
            </span>
            <p className="text-xs text-gray-500 truncate">
              {hino.tom} • {hino.cantor} • último uso {formatarData(hino.ultimoUso)}
            </p>
          </div>

          <div className="mt-1.5 h-1.5 w-full bg-indigo-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 transition-all duration-500"
              style={{ width: `${largura}%` }}
            />
          </div>
        </div>

        <div className="shrink-0 text-right">
          <p className="text-lg sm:text-xl font-extrabold text-gray-900 tabular-nums leading-none">
            {hino.usageCount}
          </p>
          <p className="text-[11px] text-gray-500">usos</p>
        </div>
      </div>
    );
  };

  const Vazio = ({ texto }: { texto: string }) => (
    <div className="text-center py-12">
      <Music2 className="mx-auto text-gray-300 mb-3" size={40} />
      <p className="text-gray-500">{texto}</p>
    </div>
  );

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center">
        <p className="text-gray-500">Carregando relatório...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto">
        <Painel className="p-6 text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={loadRelatorio}
            className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-semibold"
          >
            Tentar novamente
          </button>
        </Painel>
      </div>
    );
  }

  const lista = aba === 'comuns' ? topHinos : topHarpa;
  const maior = lista[0]?.usageCount || 1;

  return (
    <div className="max-w-4xl mx-auto pb-20 space-y-5">
      {/* Cabeçalho */}
      <div className="flex items-start gap-3">
        <div className="bg-indigo-50 text-indigo-600 p-2.5 rounded-xl shrink-0">
          <BarChart3 size={22} />
        </div>
        <div className="min-w-0">
          <h2 className="text-2xl font-bold text-gray-900">Relatórios</h2>
          <p className="text-sm text-gray-500">
            Hinos mais usados nos repertórios • os de saudação não entram na conta
          </p>
        </div>
      </div>

      {/* Números */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Resumo icon={Music2} label="Hinos já usados" valor={hinosUsage.length} />
        <Resumo icon={TrendingUp} label="Mais usado" valor={`${topHinos[0]?.usageCount || 0}x`} />
        <Resumo
          icon={Calendar}
          label="Quantidade de Cultos tocados em 30 dias"
          valor={repertorios30dias}
          className="col-span-2 sm:col-span-1"
        />
      </div>

      {/* Ranking */}
      <Painel className="p-4 sm:p-6">
        {/* Abas */}
        <div className="flex gap-2 mb-5">
          <button
            onClick={() => setAba('comuns')}
            className={`flex-1 px-4 py-2.5 rounded-xl font-semibold text-sm transition flex items-center justify-center gap-2 ${
              aba === 'comuns'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Music2 size={16} />
            Hinos comuns
          </button>
          <button
            onClick={() => setAba('harpa')}
            className={`flex-1 px-4 py-2.5 rounded-xl font-semibold text-sm transition flex items-center justify-center gap-2 ${
              aba === 'harpa'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <BookOpen size={16} />
            Harpa Cristã
          </button>
        </div>

        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
          Top 10 mais usados
        </p>

        {lista.length === 0 ? (
          <Vazio
            texto={
              aba === 'comuns'
                ? 'Nenhum hino comum foi usado em repertórios ainda'
                : 'Nenhum hino da Harpa foi usado em repertórios ainda'
            }
          />
        ) : (
          <div className="space-y-3">
            {lista.map((hino, index) => (
              <LinhaRanking key={hino.id} hino={hino} index={index} maior={maior} />
            ))}
          </div>
        )}
      </Painel>

      {/* Ranking completo dos hinos comuns */}
      {hinosUsage.length > 10 && (
        <Painel className="overflow-hidden">
          <button
            onClick={() => setMostrarTabela(v => !v)}
            className="w-full p-4 sm:p-5 flex items-center justify-between gap-3 hover:bg-gray-50 transition"
          >
            <span className="flex items-center gap-2 font-bold text-gray-900">
              <Table2 size={18} className="text-indigo-600" />
              Ranking completo ({hinosUsage.length} hinos comuns)
            </span>
            <ChevronDown
              size={18}
              className={`text-gray-400 transition-transform ${mostrarTabela ? 'rotate-180' : ''}`}
            />
          </button>

          {mostrarTabela && (
            <div className="overflow-x-auto border-t border-gray-100">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr className="text-gray-500">
                    <th className="px-4 py-2.5 text-center font-semibold w-12">#</th>
                    <th className="px-4 py-2.5 text-left font-semibold">Hino</th>
                    <th className="px-4 py-2.5 text-center font-semibold">Tom</th>
                    <th className="px-4 py-2.5 text-left font-semibold">Cantor</th>
                    <th className="px-4 py-2.5 text-center font-semibold">Usos</th>
                    <th className="px-4 py-2.5 text-center font-semibold whitespace-nowrap">
                      30 dias
                    </th>
                    <th className="px-4 py-2.5 text-left font-semibold whitespace-nowrap">
                      <Calendar size={14} className="inline mr-1 -mt-0.5" />
                      Último uso
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {hinosUsage.map((hino, index) => (
                    <tr key={hino.id} className="border-t border-gray-100 hover:bg-indigo-50/40">
                      <td className="px-4 py-2.5 text-center font-bold text-gray-500 tabular-nums">
                        {MEDALHAS[index] || index + 1}
                      </td>
                      <td className="px-4 py-2.5 font-medium text-gray-900">{hino.nome}</td>
                      <td className="px-4 py-2.5 text-center text-gray-600">{hino.tom}</td>
                      <td className="px-4 py-2.5 text-gray-600">{hino.cantor}</td>
                      <td className="px-4 py-2.5 text-center font-bold text-indigo-600 tabular-nums">
                        {hino.usageCount}
                      </td>
                      <td className="px-4 py-2.5 text-center font-bold text-green-600 tabular-nums">
                        {hino.usos30dias}
                      </td>
                      <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">
                        {formatarData(hino.ultimoUso)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Painel>
      )}
    </div>
  );
};
