import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Braco, CORDAS_VIOLAO, CORDAS_BAIXO, notaDoAcorde } from './Braco';

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
  { nome: 'Tônica', cor: 'bg-indigo-50 border-indigo-200 text-indigo-700' },
  { nome: 'Subdominante', cor: 'bg-sky-50 border-sky-200 text-sky-700' },
  { nome: 'Tônica', cor: 'bg-indigo-50 border-indigo-200 text-indigo-700' },
  { nome: 'Subdominante', cor: 'bg-sky-50 border-sky-200 text-sky-700' },
  { nome: 'Dominante', cor: 'bg-amber-50 border-amber-200 text-amber-700' },
  { nome: 'Tônica', cor: 'bg-indigo-50 border-indigo-200 text-indigo-700' },
  { nome: 'Dominante', cor: 'bg-amber-50 border-amber-200 text-amber-700' },
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
  const [instrumento, setInstrumento] = useState<'violao' | 'baixo'>('violao');
  /** Tópicos abertos. O campo harmônico já começa aberto. */
  const [abertos, setAbertos] = useState<string[]>(['campo']);

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
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-400" /> Tônica (repouso)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400" /> Subdominante (preparação)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> Dominante (tensão)
          </span>
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
                ['baixo', 'Baixo'],
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
            cordas={instrumento === 'violao' ? CORDAS_VIOLAO : CORDAS_BAIXO}
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
        <table className="w-full">
          <thead className="bg-gray-50 text-gray-600 text-sm">
            <tr>
              <th className="p-3 text-left">Tom</th>
              {GRAUS.map(grau => (
                <th key={grau} className="p-3">
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
                <td className="p-3 font-bold text-indigo-600">{tom}</td>

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
