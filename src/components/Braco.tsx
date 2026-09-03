import React from 'react';

/**
 * BRAÇO DO INSTRUMENTO
 *
 * Desenha as casas do violão / baixo com o nome da nota em cada uma,
 * destacando as notas que pertencem ao tom escolhido.
 */

const SEMITONS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/** Nomes com bemol usados no campo harmônico, convertidos para sustenido. */
const EQUIVALENTES: Record<string, string> = {
  Bb: 'A#',
  Db: 'C#',
  Eb: 'D#',
  Gb: 'F#',
  Ab: 'G#',
};

/** Tira o "m" e o "°" do acorde, sobrando só a nota. */
export const notaDoAcorde = (acorde: string) => {
  const nota = acorde.replace(/m|°/g, '');
  return EQUIVALENTES[nota] || nota;
};

/** Casas com marcação no braço de verdade (bolinhas). */
const CASAS_MARCADAS = [3, 5, 7, 9, 12];

interface BracoProps {
  /** Cordas soltas, da mais aguda (em cima) para a mais grave (embaixo). */
  cordas: { nome: string; nota: string }[];
  casas?: number;
  /** Notas do tom escolhido, já em sustenido. */
  notasDoTom: string[];
  tonica: string;
}

export const Braco: React.FC<BracoProps> = ({ cordas, casas = 12, notasDoTom, tonica }) => {
  const listaCasas = Array.from({ length: casas + 1 }, (_, i) => i);
  const noTom = new Set(notasDoTom);

  const notaNaCasa = (cordaSolta: string, casa: number) => {
    const inicio = SEMITONS.indexOf(cordaSolta);
    return SEMITONS[(inicio + casa) % 12];
  };

  return (
    <div>
      {/* Rola na horizontal: no celular o braço inteiro não cabe na tela. */}
      <div className="overflow-x-auto -mx-1 px-1 pb-2">
        <div className="min-w-[620px]">
          {/* Número das casas */}
          <div className="flex">
            <div className="w-9 shrink-0" />
            {listaCasas.map(casa => (
              <div
                key={casa}
                className="flex-1 text-center text-[10px] font-semibold text-gray-400 pb-1"
              >
                {casa === 0 ? 'solta' : casa}
                {CASAS_MARCADAS.includes(casa) && (
                  <span className="block text-gray-300 leading-none">●</span>
                )}
              </div>
            ))}
          </div>

          {/* Uma linha por corda */}
          <div className="rounded-lg overflow-hidden border border-gray-200 bg-amber-50/40">
            {cordas.map((corda, indice) => (
              <div
                key={corda.nome}
                className={`flex items-stretch ${
                  indice > 0 ? 'border-t border-gray-200' : ''
                }`}
              >
                <div className="w-9 shrink-0 flex items-center justify-center bg-gray-100 text-[11px] font-bold text-gray-600">
                  {corda.nome}
                </div>

                {listaCasas.map(casa => {
                  const nota = notaNaCasa(corda.nota, casa);
                  const ehTonica = nota === tonica;
                  const pertence = noTom.has(nota);

                  return (
                    <div
                      key={casa}
                      className={`flex-1 py-2 flex items-center justify-center ${
                        casa === 0 ? 'bg-gray-50' : ''
                      } ${casa > 0 ? 'border-l border-gray-200' : 'border-l-4 border-l-gray-700'}`}
                    >
                      <span
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold ${
                          ehTonica
                            ? 'bg-indigo-600 text-white shadow'
                            : pertence
                              ? 'bg-indigo-100 text-indigo-700'
                              : 'text-gray-300'
                        }`}
                      >
                        {nota}
                      </span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-[11px] text-gray-500 mt-1">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-indigo-600" /> Tônica ({tonica})
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-indigo-100 border border-indigo-200" /> Nota do
          tom
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-gray-100" /> Fora do tom
        </span>
      </div>
    </div>
  );
};

/** Afinação padrão, da corda mais aguda para a mais grave. */
export const CORDAS_VIOLAO = [
  { nome: '1ª', nota: 'E' },
  { nome: '2ª', nota: 'B' },
  { nome: '3ª', nota: 'G' },
  { nome: '4ª', nota: 'D' },
  { nome: '5ª', nota: 'A' },
  { nome: '6ª', nota: 'E' },
];

export const CORDAS_BAIXO = [
  { nome: '1ª', nota: 'G' },
  { nome: '2ª', nota: 'D' },
  { nome: '3ª', nota: 'A' },
  { nome: '4ª', nota: 'E' },
];

/** Baixo de 5 cordas: igual ao de 4, com a corda Si grave a mais. */
export const CORDAS_BAIXO_5 = [
  { nome: '1ª', nota: 'G' },
  { nome: '2ª', nota: 'D' },
  { nome: '3ª', nota: 'A' },
  { nome: '4ª', nota: 'E' },
  { nome: '5ª', nota: 'B' },
];
