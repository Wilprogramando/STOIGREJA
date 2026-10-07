import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, ChevronRight as Seta } from 'lucide-react';
import {
  Conjunto,
  DiaDaEscala,
  corDoConjunto,
  lerConjuntos,
  carregarConjuntos,
  lerEscala,
  carregarEscala,
  ouvirEscala,
  DIAS_SEMANA,
  MESES,
  emData,
  hoje,
  porExtenso,
} from '../services/escala';

interface Props {
  /** Abre a tela cheia da escala. */
  onAbrir: () => void;
}

/**
 * ESCALA DOS CONJUNTOS NO DASHBOARD
 *
 * Cartão pequeno, encostado à direita, só para bater o olho: mostra apenas os
 * dias marcados do mês, cada um na cor do conjunto. Os dias sem ninguém
 * escalado não aparecem - o calendário inteiro, com as casas vazias para
 * marcar e desmarcar, fica na tela da Escala de Conjunto.
 */
export const EscalaNoDashboard: React.FC<Props> = ({ onAbrir }) => {
  const [conjuntos, setConjuntos] = useState<Conjunto[]>(() => lerConjuntos());
  const [escala, setEscala] = useState<DiaDaEscala[]>(() => lerEscala());
  const [mesVisivel, setMesVisivel] = useState(() => {
    const agora = new Date();
    return { ano: agora.getFullYear(), mes: agora.getMonth() };
  });

  const recarregar = async () => {
    setConjuntos(await carregarConjuntos());
    setEscala(await carregarEscala());
  };

  useEffect(() => {
    recarregar();
  }, []);

  // Outro aparelho mexeu na escala: o cartão acompanha na hora.
  useEffect(() => ouvirEscala(() => recarregar()), []);

  const porId = useMemo(() => new Map(conjuntos.map(c => [c.id, c])), [conjuntos]);

  const andarMes = (passo: number) =>
    setMesVisivel(({ ano, mes }) => {
      const data = new Date(ano, mes + passo, 1);
      return { ano: data.getFullYear(), mes: data.getMonth() };
    });

  /**
   * Só os dias marcados do mês na tela, um por data: a bolinha de cada
   * conjunto que toca naquele dia fica junta na mesma casa.
   */
  const diasMarcados = useMemo(() => {
    const prefixo = `${mesVisivel.ano}-${String(mesVisivel.mes + 1).padStart(2, '0')}`;
    const mapa = new Map<string, DiaDaEscala[]>();

    escala
      .filter(d => d.data.startsWith(prefixo))
      .forEach(d => mapa.set(d.data, [...(mapa.get(d.data) || []), d]));

    return Array.from(mapa.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([data, dias]) => ({
        data,
        dias,
        dia: Number(data.slice(8, 10)),
        semana: DIAS_SEMANA[emData(data).getDay()],
        ehHoje: data === hoje(),
      }));
  }, [escala, mesVisivel]);

  const proximo = useMemo(() => escala.find(d => d.data >= hoje()), [escala]);

  return (
    // Cartão estreito e encostado na direita (ml-auto).
    <div className="w-full sm:max-w-xs sm:ml-auto bg-white rounded-2xl border border-gray-100 shadow-lg p-3">
      {/* Título e navegação do mês */}
      <div className="flex items-center justify-between gap-1 mb-2.5">
        <button onClick={onAbrir} className="flex items-center gap-2 min-w-0 text-left group">
          <span className="bg-indigo-50 text-indigo-600 p-1.5 rounded-lg shrink-0">
            <CalendarDays size={16} />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-bold text-gray-900 leading-tight group-hover:text-indigo-700 transition">
              Escala
            </span>
            <span className="block text-[11px] text-gray-500 leading-tight">
              {MESES[mesVisivel.mes]}
            </span>
          </span>
        </button>

        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={() => andarMes(-1)}
            title="Mês anterior"
            className="w-7 h-7 rounded-lg bg-gray-50 text-gray-500 hover:bg-gray-100 flex items-center justify-center"
          >
            <ChevronLeft size={15} />
          </button>
          <button
            onClick={() => andarMes(1)}
            title="Mês seguinte"
            className="w-7 h-7 rounded-lg bg-gray-50 text-gray-500 hover:bg-gray-100 flex items-center justify-center"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      {/* Só os dias marcados */}
      {diasMarcados.length === 0 ? (
        <button
          onClick={onAbrir}
          className="w-full rounded-xl border border-dashed border-indigo-200 p-3 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 transition"
        >
          {conjuntos.length === 0
            ? 'Cadastrar os conjuntos'
            : `Nenhum dia marcado em ${MESES[mesVisivel.mes].toLowerCase()}`}
        </button>
      ) : (
        <button
          onClick={onAbrir}
          className="w-full"
          title="Abrir a escala para marcar os dias"
        >
          <div className="flex flex-wrap gap-1.5">
            {diasMarcados.map(casa => {
              /* Um conjunto só no dia: a casinha inteira pinta na cor dele. */
              const unico =
                casa.dias.length === 1 ? porId.get(casa.dias[0].conjuntoId) : null;
              const cor = unico ? corDoConjunto(unico) : null;

              return (
                <span
                  key={casa.data}
                  title={`${porExtenso(casa.data)} • ${casa.dias
                    .map(d => porId.get(d.conjuntoId)?.nome || 'Conjunto excluído')
                    .join(', ')}`}
                  className={`w-9 rounded-lg border py-1 flex flex-col items-center gap-0.5 ${
                    casa.ehHoje
                      ? 'border-indigo-500 ring-1 ring-indigo-300'
                      : cor
                        ? `${cor.fraco} ${cor.borda}`
                        : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <span className="text-[9px] font-bold text-gray-400 leading-none uppercase">
                    {casa.semana}
                  </span>
                  <span
                    className={`text-sm font-extrabold leading-none ${
                      cor ? cor.texto : 'text-gray-700'
                    }`}
                  >
                    {casa.dia}
                  </span>
                  <span className="flex items-center gap-0.5">
                    {casa.dias.slice(0, 3).map(d => (
                      <span
                        key={d.id}
                        className={`w-1.5 h-1.5 rounded-full ${
                          corDoConjunto(porId.get(d.conjuntoId)).forte
                        }`}
                      />
                    ))}
                  </span>
                </span>
              );
            })}
          </div>
        </button>
      )}

      {/* Próximo dia escalado */}
      {proximo && (
        <button
          onClick={onAbrir}
          className="mt-2.5 w-full flex items-center gap-2 rounded-xl bg-indigo-50/70 border border-indigo-100 p-2.5 text-left hover:bg-indigo-50 transition"
        >
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              corDoConjunto(porId.get(proximo.conjuntoId)).forte
            }`}
          />
          <span className="flex-1 min-w-0">
            <span className="block text-[10px] font-semibold text-gray-500 leading-tight">
              {proximo.data === hoje() ? 'Hoje toca' : 'Próximo'}
            </span>
            <span className="block font-bold text-gray-900 text-xs break-words leading-tight">
              {porId.get(proximo.conjuntoId)?.nome || 'Conjunto excluído'}
            </span>
            <span className="block text-[11px] text-gray-600 capitalize leading-tight">
              {porExtenso(proximo.data)}
              {proximo.horario && ` • ${proximo.horario}`}
            </span>
          </span>
          <Seta size={15} className="text-indigo-500 shrink-0" />
        </button>
      )}
    </div>
  );
};
