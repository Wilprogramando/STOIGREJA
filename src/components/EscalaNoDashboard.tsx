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
  diasDoCalendario,
  DIAS_SEMANA,
  MESES,
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
 * Calendário do mês só para olhar: mostra em que dias cada conjunto toca, com
 * a cor de cada um, e destaca o próximo dia escalado. Para marcar ou desmarcar
 * dias é só tocar no calendário, que leva para a tela da escala.
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

  // Outro aparelho mexeu na escala: o calendário acompanha na hora.
  useEffect(() => ouvirEscala(() => recarregar()), []);

  const porId = useMemo(() => new Map(conjuntos.map(c => [c.id, c])), [conjuntos]);

  const porDia = useMemo(() => {
    const mapa = new Map<string, DiaDaEscala[]>();
    escala.forEach(dia => mapa.set(dia.data, [...(mapa.get(dia.data) || []), dia]));
    return mapa;
  }, [escala]);

  const casas = useMemo(
    () => diasDoCalendario(mesVisivel.ano, mesVisivel.mes),
    [mesVisivel]
  );

  const andarMes = (passo: number) =>
    setMesVisivel(({ ano, mes }) => {
      const data = new Date(ano, mes + passo, 1);
      return { ano: data.getFullYear(), mes: data.getMonth() };
    });

  const proximo = useMemo(() => escala.find(d => d.data >= hoje()), [escala]);

  /** Quantos dias cada conjunto toca no mês que está na tela. */
  const totalDoMes = useMemo(() => {
    const prefixo = `${mesVisivel.ano}-${String(mesVisivel.mes + 1).padStart(2, '0')}`;
    const contagem = new Map<string, number>();
    escala
      .filter(d => d.data.startsWith(prefixo))
      .forEach(d => contagem.set(d.conjuntoId, (contagem.get(d.conjuntoId) || 0) + 1));
    return contagem;
  }, [escala, mesVisivel]);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-lg p-4 sm:p-5">
      {/* Título e navegação do mês */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <button
          onClick={onAbrir}
          className="flex items-center gap-2 min-w-0 text-left group"
        >
          <span className="bg-indigo-50 text-indigo-600 p-2 rounded-xl shrink-0">
            <CalendarDays size={20} />
          </span>
          <span className="min-w-0">
            <span className="block text-lg font-bold text-gray-900 group-hover:text-indigo-700 transition">
              Escala de Conjunto
            </span>
            <span className="block text-xs text-gray-500">
              {MESES[mesVisivel.mes]} de {mesVisivel.ano}
            </span>
          </span>
        </button>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => andarMes(-1)}
            title="Mês anterior"
            className="w-9 h-9 rounded-xl bg-gray-50 text-gray-600 hover:bg-gray-100 flex items-center justify-center"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => andarMes(1)}
            title="Mês seguinte"
            className="w-9 h-9 rounded-xl bg-gray-50 text-gray-600 hover:bg-gray-100 flex items-center justify-center"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Legenda: um conjunto por cor, com o tanto de dias no mês */}
      {conjuntos.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {conjuntos.map(conjunto => {
            const cor = corDoConjunto(conjunto);
            return (
              <span
                key={conjunto.id}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${cor.fraco} ${cor.texto} border ${cor.borda}`}
              >
                <span className={`w-2 h-2 rounded-full ${cor.forte}`} />
                {conjunto.nome}
                <span className="text-gray-500 font-semibold">
                  {totalDoMes.get(conjunto.id) || 0}
                </span>
              </span>
            );
          })}
        </div>
      )}

      {/* Calendário */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DIAS_SEMANA.map(dia => (
          <div key={dia} className="text-center text-[10px] font-bold text-gray-400 py-0.5">
            {dia}
          </div>
        ))}
      </div>

      <button onClick={onAbrir} className="w-full" title="Abrir a escala para marcar os dias">
        <div className="grid grid-cols-7 gap-1">
          {casas.map(casa => {
            const marcados = porDia.get(casa.data) || [];
            const unico = marcados.length === 1 ? porId.get(marcados[0].conjuntoId) : null;
            const corUnica = unico ? corDoConjunto(unico) : null;

            return (
              <div
                key={casa.data}
                className={`relative aspect-square rounded-lg border flex items-start justify-center ${
                  !casa.doMes
                    ? 'border-transparent'
                    : corUnica
                      ? `${corUnica.fraco} ${corUnica.borda}`
                      : marcados.length > 1
                        ? 'bg-gray-50 border-gray-200'
                        : 'border-gray-100'
                }`}
              >
                <span
                  className={`text-[11px] font-bold leading-none mt-1.5 ${
                    !casa.doMes
                      ? 'text-gray-300'
                      : casa.ehHoje
                        ? 'text-white bg-indigo-600 rounded-full w-5 h-5 flex items-center justify-center'
                        : corUnica
                          ? corUnica.texto
                          : 'text-gray-600'
                  }`}
                >
                  {casa.dia}
                </span>

                {marcados.length > 0 && (
                  <span className="absolute bottom-1 flex items-center gap-0.5">
                    {marcados.slice(0, 3).map(dia => (
                      <span
                        key={dia.id}
                        className={`w-1.5 h-1.5 rounded-full ${
                          corDoConjunto(porId.get(dia.conjuntoId)).forte
                        }`}
                      />
                    ))}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </button>

      {/* Próximo dia escalado, ou o convite para montar a escala */}
      {proximo ? (
        <button
          onClick={onAbrir}
          className="mt-3 w-full flex items-center gap-3 rounded-xl bg-indigo-50/70 border border-indigo-100 p-3 text-left hover:bg-indigo-50 transition"
        >
          <span
            className={`w-2.5 h-2.5 rounded-full shrink-0 ${
              corDoConjunto(porId.get(proximo.conjuntoId)).forte
            }`}
          />
          <span className="flex-1 min-w-0">
            <span className="block text-xs font-semibold text-gray-500">
              {proximo.data === hoje() ? 'Hoje toca' : 'Próximo a tocar'}
            </span>
            <span className="block font-bold text-gray-900 text-sm break-words">
              {porId.get(proximo.conjuntoId)?.nome || 'Conjunto excluído'}
            </span>
            <span className="block text-xs text-gray-600 capitalize">
              {porExtenso(proximo.data)}
              {proximo.horario && ` • ${proximo.horario}`}
            </span>
          </span>
          <Seta size={18} className="text-indigo-500 shrink-0" />
        </button>
      ) : (
        <button
          onClick={onAbrir}
          className="mt-3 w-full rounded-xl border border-dashed border-indigo-200 p-3 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 transition"
        >
          {conjuntos.length === 0
            ? 'Cadastrar os conjuntos e montar a escala'
            : 'Marcar os dias em que os conjuntos vão tocar'}
        </button>
      )}
    </div>
  );
};
