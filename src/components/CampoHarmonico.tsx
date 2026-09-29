import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Braco, CORDAS_VIOLAO, CORDAS_BAIXO, CORDAS_BAIXO_5, notaDoAcorde } from './Braco';

const CAMPOS = {
  C: ['C', 'Dm', 'Em', 'F', 'G', 'Am', 'B°'],
  D: ['D', 'Em', 'F#m', 'G', 'A', 'Bm', 'C#°'],
  E: ['E', 'F#m', 'G#m', 'A', 'B', 'C#m', 'D#°'],
  F: ['F', 'Gm', 'Am', 'Bb', 'C', 'Dm', 'E°'],
  G: ['G', 'Am', 'Bm', 'C', 'D', 'Em', 'F#°'],
  A: ['A', 'Bm', 'C#m', 'D', 'E', 'F#m', 'G#°'],
  B: ['B', 'C#m', 'D#m', 'E', 'F#', 'G#m', 'A#°'],
};

type Tom = keyof typeof CAMPOS;

const GRAUS = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'];

/** Papel de cada grau, com a cor usada no cartão. */
const FUNCOES = [
  { nome: 'Tônica', cor: 'bg-emerald-100 border-emerald-400 text-emerald-800' },
  { nome: 'Subdominante', cor: 'bg-blue-100 border-blue-400 text-blue-800' },
  { nome: 'Tônica', cor: 'bg-emerald-100 border-emerald-400 text-emerald-800' },
  { nome: 'Subdominante', cor: 'bg-blue-100 border-blue-400 text-blue-800' },
  { nome: 'Dominante', cor: 'bg-rose-100 border-rose-400 text-rose-800' },
  { nome: 'Tônica', cor: 'bg-emerald-100 border-emerald-400 text-emerald-800' },
  { nome: 'Dominante', cor: 'bg-rose-100 border-rose-400 text-rose-800' },
];

/** As tres funcoes harmonicas, com os graus que pertencem a cada uma. */
const FUNCOES_HARMONICAS = [
  {
    nome: 'Tônica',
    sensacao: 'Repouso',
    cor: 'bg-emerald-100 border-emerald-400 text-emerald-800',
    bolinha: 'bg-emerald-500',
    graus: [0, 2, 5],
    texto:
      'Sentido conclusivo, de descanso. Geralmente é o acorde que termina a música. O principal é o I grau, que pode ser trocado pelo vi ou pelo iii.',
  },
  {
    nome: 'Subdominante',
    sensacao: 'Preparação',
    cor: 'bg-blue-100 border-blue-400 text-blue-800',
    bolinha: 'bg-blue-500',
    graus: [3, 1],
    texto:
      'Sentido meio suspensivo, dá a sensação de afastamento da tônica. O principal é o IV grau, que pode ser trocado pelo ii.',
  },
  {
    nome: 'Dominante',
    sensacao: 'Tensão',
    cor: 'bg-rose-100 border-rose-400 text-rose-800',
    bolinha: 'bg-rose-500',
    graus: [4, 6],
    texto:
      'Sentido suspensivo, pede resolução na tônica. É a sensação de que a música vai voltar para casa. O principal é o V grau, que pode ser trocado pelo vii.',
  },
];

/** Os cinco tipos de cadencia mais comuns. */
const CADENCIAS = [
  {
    nome: 'Cadência Perfeita',
    texto: 'A resolução mais forte: dominante seguida da tônica (V - I). É o final mais definitivo. Quando vem uma subdominante antes (IV ou ii), ela é chamada de "autêntica".',
    exemplo: 'G7 - C',
  },
  {
    nome: 'Cadência Imperfeita',
    texto: 'É a V7 - I com um dos acordes invertido, ou então vii - I. A resolução fica bem mais discreta.',
    exemplo: 'G/B - C  •  Bm7(b5) - C',
  },
  {
    nome: 'Cadência Plagal',
    texto: 'Também conclui, mas de forma mais suave. Usa subdominante e tônica (IV - I), invertidos ou não.',
    exemplo: 'F - C  •  Dm - C',
  },
  {
    nome: 'Meia Cadência',
    texto: 'Quando a frase termina na dominante, deixando a sensação de continuação.',
    exemplo: 'Am - G  •  Dm - G',
  },
  {
    nome: 'Cadência Interrompida',
    texto: 'Parece que vai terminar numa cadência perfeita, mas desvia para outro grau.',
    exemplo: 'Dm - G - Am  •  F - G - Em',
  },
];

/** Progressões comuns, guardadas pelo índice do grau. */
const PROGRESSOES = [
  { rotulo: 'I - V - vi - IV', graus: [0, 4, 5, 3] },
  { rotulo: 'I - IV - V', graus: [0, 3, 4] },
  { rotulo: 'vi - IV - I - V', graus: [5, 3, 0, 4] },
  { rotulo: 'I - vi - IV - V', graus: [0, 5, 3, 4] },
];

/** Tópico que abre e fecha ao clicar no título. */
const Topico: React.FC<{
  id: string;
  titulo: string;
  resumo: string;
  icone: string;
  aberto: boolean;
  onToggle: (id: string) => void;
  className?: string;
  children: React.ReactNode;
}> = ({ id, titulo, resumo, icone, aberto, onToggle, className = '', children }) => (
  <div
    className={`bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-3 ${className}`}
  >
    <button
      onClick={() => onToggle(id)}
      className="w-full p-4 flex items-center gap-3 text-left hover:bg-gray-50 transition"
    >
      <span className="shrink-0 w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-lg">
        {icone}
      </span>

      <span className="flex-1 min-w-0">
        <span className="block font-bold text-gray-900">{titulo}</span>
        <span className="block text-xs text-gray-500">{resumo}</span>
      </span>

      <ChevronDown
        size={20}
        className={`shrink-0 text-gray-400 transition-transform ${aberto ? 'rotate-180' : ''}`}
      />
    </button>

    {aberto && <div className="border-t border-gray-100">{children}</div>}
  </div>
);

export const CampoHarmonico = () => {
  const [tomSelecionado, setTomSelecionado] = useState<Tom>('C');
  const [instrumento, setInstrumento] = useState<'violao' | 'baixo' | 'baixo5'>('violao');
  /** Tópicos abertos. Todos começam fechados. */
  const [abertos, setAbertos] = useState<string[]>([]);

  const acordes = CAMPOS[tomSelecionado];

  // As 7 notas do tom, para pintar no braço do instrumento.
  const notasDoTom = acordes.map(notaDoAcorde);

  const alternarTopico = (id: string) =>
    setAbertos(atual => (atual.includes(id) ? atual.filter(t => t !== id) : [...atual, id]));

  const estaAberto = (id: string) => abertos.includes(id);

  return (
    <div className="max-w-5xl mx-auto pb-4">
      <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">💡 Dicas</h2>

      {/* Escolha do tom: vale para todos os tópicos, por isso fica sempre visível. */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4">
        <p className="text-sm font-semibold text-gray-600 mb-3">Escolha o tom</p>

        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
          {(Object.keys(CAMPOS) as Tom[]).map(tom => {
            const ativo = tom === tomSelecionado;

            return (
              <button
                key={tom}
                onClick={() => setTomSelecionado(tom)}
                className={`py-3 rounded-xl font-bold text-lg transition active:scale-95 ${
                  ativo
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {tom}
              </button>
            );
          })}
        </div>
      </div>

      {/* Acordes do tom escolhido */}
      <Topico
        id="campo"
        icone="🎹"
        titulo={`Campo harmônico de ${tomSelecionado}`}
        resumo="Os 7 acordes que combinam neste tom"
        aberto={estaAberto('campo')}
        onToggle={alternarTopico}
      >
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5 p-3">
          {acordes.map((acorde, index) => (
            <div
              key={GRAUS[index]}
              className={`rounded-lg border p-1.5 text-center ${FUNCOES[index].cor}`}
            >
              <p className="text-[10px] font-bold opacity-70">{GRAUS[index]}</p>
              <p className="text-lg font-extrabold leading-tight text-gray-900">{acorde}</p>
              <p className="text-[9px] font-medium opacity-80 leading-tight">
                {FUNCOES[index].nome}
              </p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-3 px-4 pb-4 text-[11px] text-gray-500">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Tônica (repouso)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Subdominante (preparação)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Dominante (tensão)
          </span>
        </div>
      </Topico>

      {/* Funções harmônicas: o que cada acorde faz dentro do tom */}
      <Topico
        id="funcoes"
        icone="🧭"
        titulo="Funções Harmônicas"
        resumo="O que cada acorde faz dentro do tom"
        aberto={estaAberto('funcoes')}
        onToggle={alternarTopico}
      >
        <div className="p-4 space-y-3">
          <p className="text-xs text-gray-500">
            Todo acorde do campo harmônico tem um papel. São só três: um que descansa, um que
            prepara e um que cria tensão. Abaixo, já no tom de {tomSelecionado}.
          </p>

          {FUNCOES_HARMONICAS.map(funcao => (
            <div key={funcao.nome} className={`rounded-xl border p-3 ${funcao.cor}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className={`w-2.5 h-2.5 rounded-full ${funcao.bolinha}`} />
                <p className="font-bold">{funcao.nome}</p>
                <span className="text-[10px] font-semibold uppercase tracking-wide opacity-70">
                  {funcao.sensacao}
                </span>
              </div>

              <p className="text-xs leading-relaxed text-gray-700 mb-2">{funcao.texto}</p>

              <div className="flex flex-wrap gap-2">
                {funcao.graus.map(grau => (
                  <span
                    key={grau}
                    className="px-2.5 py-1 rounded-lg bg-white/80 border border-white text-gray-900 text-sm font-bold"
                  >
                    {acordes[grau]}
                    <span className="ml-1 text-[10px] font-semibold text-gray-500">
                      {GRAUS[grau]}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          ))}

          <div className="rounded-xl bg-gray-50 border border-gray-100 p-3">
            <p className="text-xs font-semibold text-gray-500 mb-2">
              Cadências: como as funções se encaixam para encerrar uma frase
            </p>

            <div className="space-y-2.5">
              {CADENCIAS.map(cadencia => (
                <div key={cadencia.nome}>
                  <p className="text-sm font-bold text-gray-800">{cadencia.nome}</p>
                  <p className="text-xs leading-relaxed text-gray-600">{cadencia.texto}</p>
                  <p className="text-xs font-bold text-indigo-700 mt-0.5">{cadencia.exemplo}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Topico>

      {/* Progressões já com os acordes do tom escolhido */}
      <Topico
        id="progressoes"
        icone="🎵"
        titulo="Progressões mais usadas"
        resumo={`Já no tom de ${tomSelecionado}`}
        aberto={estaAberto('progressoes')}
        onToggle={alternarTopico}
      >
        <div className="space-y-3 p-4">
          {PROGRESSOES.map(prog => (
            <div key={prog.rotulo} className="rounded-xl bg-gray-50 border border-gray-100 p-3">
              <p className="text-xs font-semibold text-gray-500 mb-2">{prog.rotulo}</p>

              <div className="flex flex-wrap gap-2">
                {prog.graus.map((grau, i) => (
                  <span
                    key={i}
                    className="px-3 py-1.5 rounded-lg bg-white border border-gray-200 font-bold text-indigo-700"
                  >
                    {acordes[grau]}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Topico>

      {/* Braço do instrumento */}
      <Topico
        id="braco"
        icone="🎸"
        titulo="Notas no braço"
        resumo="Violão e baixo, com as notas do tom em destaque"
        aberto={estaAberto('braco')}
        onToggle={alternarTopico}
      >
        <div className="p-4">
          <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
            <p className="text-xs text-gray-500 flex-1 min-w-[200px]">
              Em destaque, as notas que combinam com o tom de {tomSelecionado}. Arraste para o lado
              para ver o braço inteiro.
            </p>

            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              {([
                ['violao', 'Violão'],
                ['baixo', 'Baixo 4'],
                ['baixo5', 'Baixo 5'],
              ] as const).map(([id, rotulo]) => (
                <button
                  key={id}
                  onClick={() => setInstrumento(id)}
                  className={`px-3 py-1.5 rounded-md text-sm font-semibold transition ${
                    instrumento === id ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-600'
                  }`}
                >
                  {rotulo}
                </button>
              ))}
            </div>
          </div>

          <Braco
            cordas={
              instrumento === 'violao'
                ? CORDAS_VIOLAO
                : instrumento === 'baixo5'
                  ? CORDAS_BAIXO_5
                  : CORDAS_BAIXO
            }
            notasDoTom={notasDoTom}
            tonica={notaDoAcorde(acordes[0])}
          />
        </div>
      </Topico>

      {/* Tabela completa: só faz sentido em tela grande. */}
      <Topico
        id="tabela"
        icone="📋"
        titulo="Tabela de todos os tons"
        resumo="Clique em uma linha para trocar o tom"
        aberto={estaAberto('tabela')}
        onToggle={alternarTopico}
        className="hidden lg:block"
      >
        <table className="w-full table-fixed">
          <thead className="bg-gray-50 text-gray-600 text-sm">
            <tr>
              <th className="p-3 text-left w-24">Tom</th>
              {GRAUS.map(grau => (
                <th key={grau} className="p-3 text-center font-semibold">
                  {grau}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {(Object.entries(CAMPOS) as [Tom, string[]][]).map(([tom, lista]) => (
              <tr
                key={tom}
                onClick={() => setTomSelecionado(tom)}
                className={`border-t border-gray-100 cursor-pointer transition ${
                  tom === tomSelecionado ? 'bg-indigo-50' : 'hover:bg-gray-50'
                }`}
              >
                <td className="p-3 font-bold text-indigo-600 text-left w-24">{tom}</td>

                {lista.map((acorde, index) => (
                  <td key={index} className="p-3 text-center text-gray-800">
                    {acorde}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </Topico>
    </div>
  );
};
