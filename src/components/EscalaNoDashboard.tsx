import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Users } from 'lucide-react';
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
} from '../services/escala';

interface Props {
  /** Abre a tela cheia da escala. */
  onAbrir: () => void;
}

/** "Terça, 13 de Outubro" - como aparece na faixa do próximo culto. */
function dataPorExtenso(texto: string): string {
  const data = emData(texto);
  const semana = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  return `${semana[data.getDay()]}, ${data.getDate()} de ${MESES[data.getMonth()]}`;
}

/**
 * ESCALA DOS CONJUNTOS NO DASHBOARD
 *
 * Faixa de largura inteira, só para bater o olho: os dias marcados do mês em
 * fila, cada um na cor do conjunto, e à direita quem toca no próximo culto.
 * Os dias sem ninguém escalado não aparecem - o calendário completo, com as
 * casas vazias para marcar e desmarcar, fica na tela da Escala de Conjunto.
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
  const corDoProximo = corDoConjunto(porId.get(proximo?.conjuntoId || ''));

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
      {/* ===== Cabeçalho: ícone, título e navegação do mês ===== */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <button onClick={onAbrir} className="flex items-center gap-2.5 min-w-0 text-left group">
          <span className="w-10 h-10 shrink-0 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
            <CalendarDays size={20} />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-bold text-gray-900 leading-tight truncate group-hover:text-indigo-700 transition">
              Escala de Conjunto
            </span>
            <span className="block text-[11px] text-gray-500 leading-tight truncate">
              {diasMarcados.length === 0
                ? 'Nenhum dia marcado'
                : `${diasMarcados.length} dia(s) com conjunto`}
            </span>
          </span>
          {/* Risquinho que separa o título da navegação, como no desenho */}
          <span className="hidden lg:block w-px h-8 bg-gray-200 ml-2" />
        </button>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => andarMes(-1)}
            title="Mês anterior"
            className="w-8 h-8 rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100 flex items-center justify-center transition"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-xs font-bold text-gray-900 w-[4.5rem] text-center">
            {MESES[mesVisivel.mes].slice(0, 3)} {mesVisivel.ano}
          </span>
          <button
            onClick={() => andarMes(1)}
            title="Mês seguinte"
            className="w-8 h-8 rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100 flex items-center justify-center transition"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* ===== Corpo: dias à esquerda, próximo culto à direita ===== */}
      <div className="flex flex-col lg:flex-row lg:items-start gap-3">
        <div className="flex-1 min-w-0">
          {diasMarcados.length === 0 ? (
            <button
              onClick={onAbrir}
              className="w-full rounded-xl border border-dashed border-indigo-200 p-3 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 transition"
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
              {/* Casinhas dos dias marcados */}
              <div className="flex flex-wrap gap-1.5">
                {diasMarcados.map(casa => {
                  /* Um conjunto só no dia: a casinha inteira pinta na cor dele. */
                  const unico =
                    casa.dias.length === 1 ? porId.get(casa.dias[0].conjuntoId) : null;
                  const cor = unico ? corDoConjunto(unico) : null;

                  return (
                    <span
                      key={casa.data}
                      title={`${dataPorExtenso(casa.data)} • ${casa.dias
                        .map(d => porId.get(d.conjuntoId)?.nome || 'Conjunto excluído')
                        .join(', ')}`}
                      className={`w-12 rounded-xl border overflow-hidden bg-white flex flex-col items-center transition ${
                        casa.ehHoje
                          ? 'border-indigo-500 ring-1 ring-indigo-200'
                          : cor
                            ? cor.borda
                            : 'border-gray-200'
                      } ${casa.passou ? 'opacity-50' : ''}`}
                    >
                      {/* Faixinha de cima com o dia da semana */}
                      <span
                        className={`w-full text-center text-[9px] font-bold py-0.5 uppercase tracking-wide ${
                          cor ? `${cor.fraco} ${cor.texto}` : 'bg-gray-50 text-gray-500'
                        }`}
                      >
                        {casa.semana}
                      </span>

                      <span
                        className={`text-lg font-extrabold leading-none pt-1 ${
                          cor ? cor.texto : 'text-gray-700'
                        }`}
                      >
                        {casa.dia}
                      </span>

                      <span className="flex items-center gap-0.5 py-1">
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
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {conjuntos
                    .filter(c => totalDoMes.get(c.id))
                    .map(conjunto => {
                      const cor = corDoConjunto(conjunto);
                      return (
                        <span
                          key={conjunto.id}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${cor.fraco} ${cor.texto} border ${cor.borda}`}
                        >
                          <Users size={12} />
                          {conjunto.nome}
                          <span className="w-px h-3 bg-current opacity-25" />
                          <span>{totalDoMes.get(conjunto.id)}</span>
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
            className="shrink-0 lg:w-64 relative overflow-hidden rounded-xl bg-gray-50 p-2.5 pl-4 flex items-center gap-2 text-left hover:bg-gray-100 transition"
          >
            {/* Barra da cor do conjunto, na lateral esquerda */}
            <span className={`absolute left-0 top-0 bottom-0 w-1 ${corDoProximo.forte}`} />

            <span className={`w-2 h-2 rounded-full shrink-0 ${corDoProximo.forte}`} />

            <span className="flex-1 min-w-0">
              <span className="block text-[9px] font-bold text-gray-500 uppercase tracking-[0.12em] leading-tight">
                {proximo.data === hoje() ? 'Hoje toca' : 'Próximo a tocar'}
              </span>
              <span className="block text-sm font-bold text-gray-900 break-words leading-tight">
                {porId.get(proximo.conjuntoId)?.nome || 'Conjunto excluído'}
              </span>
              <span className="flex items-center gap-1 text-[11px] text-gray-600">
                <CalendarDays size={12} className="text-indigo-600 shrink-0" />
                {dataPorExtenso(proximo.data)}
                {proximo.horario && ` - ${proximo.horario}`}
              </span>
            </span>

            <ChevronRight size={18} className="text-indigo-600 shrink-0" />
          </button>
        )}
      </div>
    </div>
  );
};
