import React, { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Users,
  X,
  Clock,
  Pencil,
  Check,
  Repeat,
} from 'lucide-react';
import {
  Conjunto,
  DiaDaEscala,
  CORES,
  corDoConjunto,
  corLivre,
  lerConjuntos,
  carregarConjuntos,
  salvarConjunto,
  excluirConjunto,
  lerEscala,
  carregarEscala,
  salvarDia,
  salvarDias,
  excluirDia,
  ouvirEscala,
  diasDoCalendario,
  DIAS_SEMANA,
  MESES,
  emData,
  emTexto,
  hoje,
  porExtenso,
  HORARIO_PADRAO,
} from '../services/escala';

/** Quantas semanas o "repetir toda semana" agenda de uma vez. */
const SEMANAS_REPETIDAS = 8;

/**
 * ESCALA DE CONJUNTO
 *
 * Calendário do mês para marcar quais dias cada conjunto toca.
 *
 * Como funciona: escolhe o conjunto na barra de cima e toca nos dias. O dia já
 * marcado para aquele conjunto desmarca no toque seguinte, então dá para fazer
 * o mês inteiro só tocando nos dias, sem abrir formulário nenhum. O horário e
 * a observação (quando precisar) ficam no painel que abre embaixo.
 */
export const EscalaConjunto: React.FC = () => {
  const [conjuntos, setConjuntos] = useState<Conjunto[]>(() => lerConjuntos());
  const [escala, setEscala] = useState<DiaDaEscala[]>(() => lerEscala());

  /** Conjunto que recebe os toques no calendário. */
  const [conjuntoAtivo, setConjuntoAtivo] = useState<string>('');
  /** Dia aberto no painel de detalhes (AAAA-MM-DD). */
  const [diaAberto, setDiaAberto] = useState<string>('');

  const [mesVisivel, setMesVisivel] = useState(() => {
    const agora = new Date();
    return { ano: agora.getFullYear(), mes: agora.getMonth() };
  });

  // Cadastro de conjuntos
  const [gerenciando, setGerenciando] = useState(false);
  const [nomeNovo, setNomeNovo] = useState('');
  const [editando, setEditando] = useState<string>('');
  const [nomeEditado, setNomeEditado] = useState('');

  const recarregar = async () => {
    const lista = await carregarConjuntos();
    setConjuntos(lista);
    setEscala(await carregarEscala());
    setConjuntoAtivo(atual => atual || lista[0]?.id || '');
  };

  useEffect(() => {
    recarregar();
  }, []);

  // Outro aparelho mexeu na escala: atualiza sem recarregar a página.
  useEffect(() => ouvirEscala(() => recarregar()), []);

  const porId = useMemo(
    () => new Map(conjuntos.map(c => [c.id, c])),
    [conjuntos]
  );

  /** Dias marcados, agrupados por data, para o calendário desenhar rápido. */
  const porDia = useMemo(() => {
    const mapa = new Map<string, DiaDaEscala[]>();
    escala.forEach(dia => {
      mapa.set(dia.data, [...(mapa.get(dia.data) || []), dia]);
    });
    return mapa;
  }, [escala]);

  const casas = useMemo(
    () => diasDoCalendario(mesVisivel.ano, mesVisivel.mes),
    [mesVisivel]
  );

  const andarMes = (passo: number) => {
    setDiaAberto('');
    setMesVisivel(({ ano, mes }) => {
      const data = new Date(ano, mes + passo, 1);
      return { ano: data.getFullYear(), mes: data.getMonth() };
    });
  };

  const voltarParaHoje = () => {
    const agora = new Date();
    setMesVisivel({ ano: agora.getFullYear(), mes: agora.getMonth() });
    setDiaAberto(hoje());
  };

  // ==================== MARCAR E DESMARCAR ====================

  /**
   * Toque no dia: marca o conjunto ativo, ou desmarca se ele já estava ali.
   * O painel de detalhes abre junto, para ajustar horário e observação.
   */
  const aoTocarNoDia = async (data: string) => {
    setDiaAberto(data);

    if (!conjuntoAtivo) {
      setGerenciando(true);
      return;
    }

    const jaMarcado = (porDia.get(data) || []).find(d => d.conjuntoId === conjuntoAtivo);

    if (jaMarcado) {
      setEscala(await excluirDia(jaMarcado.id));
    } else {
      setEscala(await salvarDia({ conjuntoId: conjuntoAtivo, data }));
    }
  };

  /** Mesmo conjunto, mesmo dia da semana e mesmo horário, pelas próximas semanas. */
  const repetirTodaSemana = async (data: string) => {
    if (!conjuntoAtivo) return;

    const base = (porDia.get(data) || []).find(d => d.conjuntoId === conjuntoAtivo);
    const horario = base?.horario ?? HORARIO_PADRAO;

    const inicio = emData(data);
    const novos = Array.from({ length: SEMANAS_REPETIDAS }, (_, i) => {
      const proxima = new Date(
        inicio.getFullYear(),
        inicio.getMonth(),
        inicio.getDate() + (i + 1) * 7
      );
      return emTexto(proxima);
    }).filter(dia => !(porDia.get(dia) || []).some(d => d.conjuntoId === conjuntoAtivo));

    setEscala(
      await salvarDias(novos.map(dia => ({ conjuntoId: conjuntoAtivo, data: dia, horario })))
    );
  };

  const mudarDia = async (dia: DiaDaEscala, mudanca: Partial<DiaDaEscala>) => {
    setEscala(await salvarDia({ ...dia, ...mudanca }));
  };

  const tirarDia = async (id: string) => {
    setEscala(await excluirDia(id));
  };

  // ==================== CADASTRO DE CONJUNTOS ====================

  const adicionarConjunto = async (e: React.FormEvent) => {
    e.preventDefault();
    const nome = nomeNovo.trim();
    if (!nome) return;

    const lista = await salvarConjunto({ nome, cor: corLivre(conjuntos) });
    setConjuntos(lista);
    setNomeNovo('');
    if (!conjuntoAtivo) setConjuntoAtivo(lista[lista.length - 1]?.id || '');
  };

  const renomear = async (conjunto: Conjunto) => {
    const nome = nomeEditado.trim();
    if (nome && nome !== conjunto.nome) {
      setConjuntos(await salvarConjunto({ ...conjunto, nome }));
    }
    setEditando('');
  };

  const trocarCor = async (conjunto: Conjunto, cor: string) => {
    setConjuntos(await salvarConjunto({ ...conjunto, cor }));
  };

  const tirarConjunto = async (conjunto: Conjunto) => {
    const marcados = escala.filter(d => d.conjuntoId === conjunto.id).length;
    const aviso = marcados
      ? `Excluir "${conjunto.nome}"? Os ${marcados} dia(s) marcados para ele saem do calendário.`
      : `Excluir "${conjunto.nome}"?`;
    if (!window.confirm(aviso)) return;

    const lista = await excluirConjunto(conjunto.id);
    setConjuntos(lista);
    setEscala(lerEscala());
    if (conjuntoAtivo === conjunto.id) setConjuntoAtivo(lista[0]?.id || '');
  };

  // ==================== PRÓXIMOS DIAS ====================

  const proximos = useMemo(
    () => escala.filter(d => d.data >= hoje()).slice(0, 6),
    [escala]
  );

  const doDiaAberto = diaAberto ? porDia.get(diaAberto) || [] : [];
  const ativo = porId.get(conjuntoAtivo) || null;

  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-24">
      {/* Título */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CalendarDays className="text-indigo-600" size={26} />
            Escala de Conjunto
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Escolha o conjunto e toque nos dias em que ele vai tocar.
          </p>
        </div>

        <button
          onClick={() => setGerenciando(v => !v)}
          className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 shadow-sm"
        >
          <Users size={16} />
          Conjuntos
        </button>
      </div>

      {/* Cadastro dos conjuntos */}
      {gerenciando && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <Users size={18} className="text-indigo-600" />
              Conjuntos da igreja
            </h3>
            <button
              onClick={() => setGerenciando(false)}
              className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={adicionarConjunto} className="flex gap-2">
            <input
              value={nomeNovo}
              onChange={e => setNomeNovo(e.target.value)}
              placeholder="Nome do conjunto"
              className="flex-1 min-w-0 px-3 py-2.5 rounded-xl border border-gray-300 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="submit"
              disabled={!nomeNovo.trim()}
              className="shrink-0 px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1.5"
            >
              <Plus size={18} />
              Add
            </button>
          </form>

          {conjuntos.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-3">
              Nenhum conjunto cadastrado ainda.
            </p>
          ) : (
            <div className="space-y-2">
              {conjuntos.map(conjunto => {
                const cor = corDoConjunto(conjunto);
                const marcados = escala.filter(d => d.conjuntoId === conjunto.id).length;

                return (
                  <div
                    key={conjunto.id}
                    className={`rounded-xl border ${cor.borda} ${cor.fraco} p-3`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-3.5 h-3.5 rounded-full shrink-0 ${cor.forte}`} />

                      {editando === conjunto.id ? (
                        <input
                          value={nomeEditado}
                          onChange={e => setNomeEditado(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && renomear(conjunto)}
                          autoFocus
                          className="flex-1 min-w-0 px-2 py-1.5 rounded-lg border border-gray-300 text-base"
                        />
                      ) : (
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-900 text-sm break-words">
                            {conjunto.nome}
                          </p>
                          <p className="text-xs text-gray-500">{marcados} dia(s) marcados</p>
                        </div>
                      )}

                      {editando === conjunto.id ? (
                        <button
                          onClick={() => renomear(conjunto)}
                          title="Salvar nome"
                          className="shrink-0 w-9 h-9 rounded-lg bg-green-100 text-green-700 flex items-center justify-center"
                        >
                          <Check size={17} />
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setEditando(conjunto.id);
                            setNomeEditado(conjunto.nome);
                          }}
                          title="Trocar o nome"
                          className="shrink-0 w-9 h-9 rounded-lg text-gray-500 hover:bg-white flex items-center justify-center"
                        >
                          <Pencil size={16} />
                        </button>
                      )}

                      <button
                        onClick={() => tirarConjunto(conjunto)}
                        title="Excluir conjunto"
                        className="shrink-0 w-9 h-9 rounded-lg text-red-500 hover:bg-red-50 flex items-center justify-center"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    {/* Cor no calendário */}
                    <div className="flex items-center gap-1.5 mt-2.5">
                      {CORES.map(opcao => (
                        <button
                          key={opcao.id}
                          onClick={() => trocarCor(conjunto, opcao.id)}
                          title={opcao.nome}
                          className={`w-6 h-6 rounded-full ${opcao.forte} transition ${
                            conjunto.cor === opcao.id
                              ? 'ring-2 ring-offset-2 ring-gray-500'
                              : 'opacity-60 hover:opacity-100'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Nenhum conjunto: o primeiro passo é cadastrar */}
      {conjuntos.length === 0 && !gerenciando && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-lg p-8 text-center">
          <Users size={34} className="text-indigo-300 mx-auto" />
          <p className="text-gray-700 font-semibold mt-3">
            Cadastre os conjuntos da sua igreja
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Depois disso, basta tocar nos dias do calendário.
          </p>
          <button
            onClick={() => setGerenciando(true)}
            className="mt-4 px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 text-sm font-semibold"
          >
            Cadastrar conjunto
          </button>
        </div>
      )}

      {/* Barra de conjuntos: quem está recebendo os toques no calendário */}
      {conjuntos.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-lg p-3">
          <p className="text-xs font-semibold text-gray-500 mb-2 px-1">
            Marcando os dias de:
          </p>
          <div className="flex flex-wrap gap-2">
            {conjuntos.map(conjunto => {
              const cor = corDoConjunto(conjunto);
              const selecionado = conjuntoAtivo === conjunto.id;

              return (
                <button
                  key={conjunto.id}
                  onClick={() => setConjuntoAtivo(conjunto.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-bold transition ${
                    selecionado
                      ? `${cor.forte} text-white shadow-md`
                      : `${cor.fraco} ${cor.texto} border ${cor.borda} hover:brightness-95`
                  }`}
                >
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      selecionado ? 'bg-white' : cor.forte
                    }`}
                  />
                  {conjunto.nome}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ==================== CALENDÁRIO ==================== */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-lg p-3 sm:p-5">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => andarMes(-1)}
            title="Mês anterior"
            className="w-10 h-10 rounded-xl bg-gray-50 text-gray-600 hover:bg-gray-100 flex items-center justify-center"
          >
            <ChevronLeft size={20} />
          </button>

          <button
            onClick={voltarParaHoje}
            title="Voltar para o mês de hoje"
            className="text-center px-3 py-1 rounded-xl hover:bg-gray-50"
          >
            <p className="text-lg font-extrabold text-gray-900 leading-tight">
              {MESES[mesVisivel.mes]}
            </p>
            <p className="text-xs font-semibold text-gray-500">{mesVisivel.ano}</p>
          </button>

          <button
            onClick={() => andarMes(1)}
            title="Mês seguinte"
            className="w-10 h-10 rounded-xl bg-gray-50 text-gray-600 hover:bg-gray-100 flex items-center justify-center"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Cabeçalho dos dias da semana */}
        <div className="grid grid-cols-7 gap-1 sm:gap-1.5 mb-1.5">
          {DIAS_SEMANA.map(dia => (
            <div
              key={dia}
              className="text-center text-[10px] sm:text-xs font-bold text-gray-400 py-1"
            >
              {dia}
            </div>
          ))}
        </div>

        {/* As 42 casas do mês */}
        <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
          {casas.map(casa => {
            const marcados = porDia.get(casa.data) || [];
            const selecionado = diaAberto === casa.data;
            const temAtivo = marcados.some(d => d.conjuntoId === conjuntoAtivo);
            /* Um conjunto só: a casa inteira pinta na cor dele. */
            const unico = marcados.length === 1 ? porId.get(marcados[0].conjuntoId) : null;
            const corUnica = unico ? corDoConjunto(unico) : null;

            return (
              <button
                key={casa.data}
                onClick={() => aoTocarNoDia(casa.data)}
                className={`relative aspect-square rounded-xl border p-1 flex flex-col items-center justify-start transition active:scale-95 ${
                  !casa.doMes
                    ? 'border-transparent text-gray-300 hover:bg-gray-50'
                    : corUnica
                      ? `${corUnica.fraco} ${corUnica.borda} hover:brightness-95`
                      : marcados.length > 1
                        ? 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                        : 'border-gray-100 hover:bg-gray-50'
                } ${selecionado ? 'ring-2 ring-indigo-500 ring-offset-1' : ''}`}
              >
                <span
                  className={`text-xs sm:text-sm font-bold leading-none mt-1 ${
                    !casa.doMes
                      ? 'text-gray-300'
                      : casa.ehHoje
                        ? 'text-white bg-indigo-600 rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center'
                        : corUnica
                          ? corUnica.texto
                          : 'text-gray-700'
                  }`}
                >
                  {casa.dia}
                </span>

                {/* Bolinhas: uma por conjunto escalado no dia */}
                {marcados.length > 0 && (
                  <span className="absolute bottom-1 flex items-center justify-center gap-0.5">
                    {marcados.slice(0, 3).map(dia => (
                      <span
                        key={dia.id}
                        className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${
                          corDoConjunto(porId.get(dia.conjuntoId)).forte
                        }`}
                      />
                    ))}
                  </span>
                )}

                {/* Canto marcado quando o conjunto escolhido toca neste dia */}
                {temAtivo && ativo && (
                  <span
                    className={`absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full ${
                      corDoConjunto(ativo).forte
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>

        {conjuntos.length > 0 && (
          <p className="text-[11px] text-gray-400 text-center mt-3">
            Toque no dia para marcar • toque de novo para desmarcar
          </p>
        )}
      </div>

      {/* ==================== PAINEL DO DIA ESCOLHIDO ==================== */}
      {diaAberto && (
        <div className="bg-white rounded-2xl border border-indigo-200 shadow-lg p-4">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="min-w-0">
              <h3 className="font-bold text-gray-900 capitalize">{porExtenso(diaAberto)}</h3>
              <p className="text-xs text-gray-500">
                {doDiaAberto.length === 0
                  ? 'Nenhum conjunto marcado neste dia'
                  : `${doDiaAberto.length} conjunto(s) neste dia`}
              </p>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {conjuntoAtivo && (
                <button
                  onClick={() => repetirTodaSemana(diaAberto)}
                  title={`Repetir ${ativo?.nome || ''} neste dia da semana nas próximas ${SEMANAS_REPETIDAS} semanas`}
                  className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-indigo-50 text-indigo-700 text-xs font-bold hover:bg-indigo-100"
                >
                  <Repeat size={15} />
                  Toda semana
                </button>
              )}
              <button
                onClick={() => setDiaAberto('')}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {doDiaAberto.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-3">
              Toque no dia no calendário para marcar{' '}
              <strong>{ativo?.nome || 'um conjunto'}</strong>.
            </p>
          ) : (
            <div className="space-y-2">
              {doDiaAberto.map(dia => {
                const conjunto = porId.get(dia.conjuntoId);
                const cor = corDoConjunto(conjunto);

                return (
                  <div
                    key={dia.id}
                    className={`rounded-xl border ${cor.borda} ${cor.fraco} p-3`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-3 h-3 rounded-full shrink-0 ${cor.forte}`} />
                      <p className="flex-1 min-w-0 font-bold text-gray-900 text-sm break-words">
                        {conjunto?.nome || 'Conjunto excluído'}
                      </p>
                      <button
                        onClick={() => tirarDia(dia.id)}
                        title="Tirar deste dia"
                        className="shrink-0 w-9 h-9 rounded-lg text-red-500 hover:bg-white flex items-center justify-center"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="flex items-center gap-2 mt-2.5">
                      <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 shrink-0">
                        <Clock size={14} />
                        Horário
                      </label>
                      <input
                        type="time"
                        value={dia.horario}
                        onChange={e => mudarDia(dia, { horario: e.target.value })}
                        className="px-2.5 py-2 rounded-lg border border-gray-300 text-base bg-white"
                      />
                    </div>

                    <input
                      value={dia.observacoes}
                      onChange={e => mudarDia(dia, { observacoes: e.target.value })}
                      placeholder="Observação (opcional)"
                      className="mt-2 w-full px-3 py-2 rounded-lg border border-gray-300 text-base bg-white"
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ==================== PRÓXIMOS DIAS ==================== */}
      {proximos.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-lg p-4">
          <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-3">
            <CalendarDays size={18} className="text-indigo-600" />
            Próximos dias
          </h3>

          <div className="space-y-2">
            {proximos.map(dia => {
              const conjunto = porId.get(dia.conjuntoId);
              const cor = corDoConjunto(conjunto);
              const ehHoje = dia.data === hoje();

              return (
                <button
                  key={dia.id}
                  onClick={() => {
                    const data = emData(dia.data);
                    setMesVisivel({ ano: data.getFullYear(), mes: data.getMonth() });
                    setDiaAberto(dia.data);
                  }}
                  className={`w-full text-left rounded-xl border ${cor.borda} ${cor.fraco} p-3 flex items-center gap-3 hover:brightness-95 transition`}
                >
                  <div className="w-12 shrink-0 text-center">
                    <p className={`text-xl font-extrabold leading-none ${cor.texto}`}>
                      {dia.data.slice(8, 10)}
                    </p>
                    <p className="text-[10px] font-bold text-gray-500 mt-0.5 uppercase">
                      {MESES[Number(dia.data.slice(5, 7)) - 1]?.slice(0, 3)}
                    </p>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-gray-900 text-sm break-words">
                        {conjunto?.nome || 'Conjunto excluído'}
                      </p>
                      {ehHoje && (
                        <span className="shrink-0 text-[10px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                          HOJE
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 capitalize">
                      {porExtenso(dia.data)}
                      {dia.horario && ` • ${dia.horario}`}
                    </p>
                    {dia.observacoes && (
                      <p className="text-xs text-gray-500 break-words mt-0.5">
                        {dia.observacoes}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
