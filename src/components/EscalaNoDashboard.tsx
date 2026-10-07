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
 * Faixa de largura inteira, só para bater o olho: os dias marcados do mês em
 * fila, cada um na cor do conjunto, e à direita quem toca no próximo culto.
 * Os dias sem ninguém escalado não aparecem - o calendário completo, com as
 * casas vazias para marcar e desmarcar, fica na tela da Escala de Conjunto.
 *
 * Por que uma faixa e não um quadrado no canto: assim ela acompanha a largura
 * da tela sem deixar buraco do lado, e os dias crescem em fila à medida que o
 * mês é preenchido.
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

  // Outro aparelho mexeu na escala: a faixa acompanha na hora.
  useEffect(() => ouvirEscala(() => recarregar()), []);

  const porId = useMemo(() => new Map(conjuntos.map(c => [c.id, c])), [conjuntos]);

  const andarMes = (passo: number) =>
    setMesVisivel(({ ano, mes }) => {
      const data = new Date(ano, mes + passo, 1);
      return { ano: data.getFullYear(), mes: data.getMonth() };
    });

  /**
   * Só os dias marcados do mês na tela, um por data: as bolinhas de todos os
   * conjuntos que tocam naquele dia ficam juntas na mesma casa.
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
        passou: data < hoje(),
      }));
  }, [escala, mesVisivel]);

  const proximo = useMemo(() => escala.find(d => d.data >= hoje()), [escala]);

  /** Quantos dias cada conjunto toca no mês que está na tela. */
  const totalDoMes = useMemo(() => {
    const contagem = new Map<string, number>();
    diasMarcados.forEach(casa =>
      casa.dias.forEach(d =>
        contagem.set(d.conjuntoId, (contagem.get(d.conjuntoId) || 0) + 1)
      )
    );
    return contagem;
  }, [diasMarcados]);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-lg p-4">
      {/* Cabeçalho da faixa: título à esquerda, mês à direita */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <button onClick={onAbrir} className="flex items-center gap-2 min-w-0 text-left group">
          <span className="bg-indigo-50 text-indigo-600 p-2 rounded-xl shrink-0">
            <CalendarDays size={18} />
          </span>
          <span className="min-w-0">
            <span className="block font-bold text-gray-900 leading-tight group-hover:text-indigo-700 transition">
              Escala de Conjunto
            </span>
            <span className="block text-xs text-gray-500 leading-tight">
              {diasMarcados.length === 0
                ? 'Nenhum dia marcado'
                : `${diasMarcados.length} dia(s) com conjunto`}
            </span>
          </span>
        </button>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => andarMes(-1)}
            title="Mês anterior"
            className="w-8 h-8 rounded-lg bg-gray-50 text-gray-500 hover:bg-gray-100 flex items-center justify-center"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-xs font-bold text-gray-700 w-20 text-center leading-tight">
            {MESES[mesVisivel.mes].slice(0, 3)} {mesVisivel.ano}
          </span>
          <button
            onClick={() => andarMes(1)}
            title="Mês seguinte"
            className="w-8 h-8 rounded-lg bg-gray-50 text-gray-500 hover:bg-gray-100 flex items-center justify-center"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Corpo: dias em fila e, no computador, o próximo culto do lado */}
      <div className="flex flex-col lg:flex-row lg:items-stretch gap-3">
        {/* Dias marcados */}
        <div className="flex-1 min-w-0">
          {diasMarcados.length === 0 ? (
            <button
              onClick={onAbrir}
              className="w-full h-full min-h-[4.5rem] rounded-xl border border-dashed border-indigo-200 p-3 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 transition"
            >
              {conjuntos.length === 0
                ? 'Cadastrar os conjuntos e montar a escala'
                : `Marcar os dias de ${MESES[mesVisivel.mes].toLowerCase()}`}
            </button>
          ) : (
            <button
              onClick={onAbrir}
              className="w-full text-left"
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
                      className={`w-10 rounded-xl border py-1.5 flex flex-col items-center gap-0.5 transition ${
                        casa.ehHoje
                          ? 'border-indigo-500 ring-1 ring-indigo-300'
                          : cor
                            ? `${cor.fraco} ${cor.borda}`
                            : 'bg-gray-50 border-gray-200'
                      } ${casa.passou ? 'opacity-45' : ''}`}
                    >
                      <span className="text-[9px] font-bold text-gray-400 leading-none uppercase">
                        {casa.semana}
                      </span>
                      <span
                        className={`text-base font-extrabold leading-none ${
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

              {/* Legenda: quem é cada cor, com o tanto de dias no mês */}
              {conjuntos.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {conjuntos
                    .filter(c => totalDoMes.get(c.id))
                    .map(conjunto => {
                      const cor = corDoConjunto(conjunto);
                      return (
                        <span
                          key={conjunto.id}
                          className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold ${cor.fraco} ${cor.texto} border ${cor.borda}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${cor.forte}`} />
                          {conjunto.nome}
                          <span className="text-gray-500 font-semibold">
                            {totalDoMes.get(conjunto.id)}
                          </span>
                        </span>
                      );
                    })}
                </div>
              )}
            </button>
          )}
        </div>

        {/* Próximo culto: embaixo no celular, na lateral no computador */}
        {proximo && (
          <button
            onClick={onAbrir}
            className="shrink-0 lg:w-60 flex items-center gap-2.5 rounded-xl bg-indigo-50/70 border border-indigo-100 p-3 text-left hover:bg-indigo-50 transition"
          >
            <span
              className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                corDoConjunto(porId.get(proximo.conjuntoId)).forte
              }`}
            />
            <span className="flex-1 min-w-0">
              <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide leading-tight">
                {proximo.data === hoje() ? 'Hoje toca' : 'Próximo a tocar'}
              </span>
              <span className="block font-bold text-gray-900 text-sm break-words leading-tight">
                {porId.get(proximo.conjuntoId)?.nome || 'Conjunto excluído'}
              </span>
              <span className="block text-xs text-gray-600 capitalize leading-tight">
                {porExtenso(proximo.data)}
                {proximo.horario && ` • ${proximo.horario}`}
              </span>
            </span>
            <Seta size={16} className="text-indigo-500 shrink-0" />
          </button>
        )}
      </div>
    </div>
  );
};
