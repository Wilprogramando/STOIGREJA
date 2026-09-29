import React from 'react';

/**
 * DIAGRAMA DE ACORDE
 *
 * Desenha o acorde no braço do violão como nas tabelas impressas: as 6 cordas
 * em pé, as casas atravessadas, uma bolinha em cada dedo, "x" na corda que não
 * toca e "o" na corda solta.
 */

/** Onde fica cada dedo, da corda mais grave (Mi) para a mais aguda. 0 = solta, -1 = não toca. */
type Forma = {
  casas: number[];
  /** Pestana: a casa e quais cordas ela cobre (índices de 0 a 5). */
  pestana?: { casa: number; de: number; ate: number };
};

/**
 * Formas do campo harmônico maior, nos 7 tons da tela.
 * Os acordes de 7º grau (°) são tocados como m7(b5), que é o que se usa na prática.
 */
export const FORMAS: Record<string, Forma> = {
  // Maiores
  C: { casas: [-1, 3, 2, 0, 1, 0] },
  D: { casas: [-1, -1, 0, 2, 3, 2] },
  E: { casas: [0, 2, 2, 1, 0, 0] },
  F: { casas: [1, 3, 3, 2, 1, 1], pestana: { casa: 1, de: 0, ate: 5 } },
  G: { casas: [3, 2, 0, 0, 0, 3] },
  A: { casas: [-1, 0, 2, 2, 2, 0] },
  B: { casas: [-1, 2, 4, 4, 4, 2], pestana: { casa: 2, de: 1, ate: 5 } },
  Bb: { casas: [-1, 1, 3, 3, 3, 1], pestana: { casa: 1, de: 1, ate: 5 } },
  'F#': { casas: [2, 4, 4, 3, 2, 2], pestana: { casa: 2, de: 0, ate: 5 } },

  // Menores
  Am: { casas: [-1, 0, 2, 2, 1, 0] },
  Dm: { casas: [-1, -1, 0, 2, 3, 1] },
  Em: { casas: [0, 2, 2, 0, 0, 0] },
  Bm: { casas: [-1, 2, 4, 4, 3, 2], pestana: { casa: 2, de: 1, ate: 5 } },
  Gm: { casas: [3, 5, 5, 3, 3, 3], pestana: { casa: 3, de: 0, ate: 5 } },
  'F#m': { casas: [2, 4, 4, 2, 2, 2], pestana: { casa: 2, de: 0, ate: 5 } },
  'C#m': { casas: [-1, 4, 6, 6, 5, 4], pestana: { casa: 4, de: 1, ate: 5 } },
  'G#m': { casas: [4, 6, 6, 4, 4, 4], pestana: { casa: 4, de: 0, ate: 5 } },
  'D#m': { casas: [-1, 6, 8, 8, 7, 6], pestana: { casa: 6, de: 1, ate: 5 } },

  // Meio-diminutos: o 7º grau do campo harmônico
  'B°': { casas: [-1, 2, 3, 2, 3, -1] },
  'C#°': { casas: [-1, 4, 5, 4, 5, -1] },
  'D#°': { casas: [-1, 6, 7, 6, 7, -1] },
  'E°': { casas: [-1, 7, 8, 7, 8, -1] },
  'F#°': { casas: [2, -1, 2, 2, 1, -1] },
  'G#°': { casas: [4, -1, 4, 4, 3, -1] },
  'A#°': { casas: [6, -1, 6, 6, 5, -1] },
};

/** Como o acorde é escrito de verdade, quando o nome da tela é um atalho. */
export const NOME_TOCADO: Record<string, string> = {
  'B°': 'Bm7(b5)',
  'C#°': 'C#m7(b5)',
  'D#°': 'D#m7(b5)',
  'E°': 'Em7(b5)',
  'F#°': 'F#m7(b5)',
  'G#°': 'G#m7(b5)',
  'A#°': 'A#m7(b5)',
};

const CORDAS = 6;
const CASAS_VISIVEIS = 5;

// Medidas do desenho, em unidades do SVG.
const MARGEM_X = 9;
const TOPO = 17;
const ESPACO_CORDA = 11;
const ESPACO_CASA = 13;

const LARGURA = MARGEM_X * 2 + ESPACO_CORDA * (CORDAS - 1);
const ALTURA = TOPO + ESPACO_CASA * CASAS_VISIVEIS + 4;

const x = (corda: number) => MARGEM_X + corda * ESPACO_CORDA;
const y = (casa: number) => TOPO + casa * ESPACO_CASA;

interface DiagramaAcordeProps {
  /** Nome do acorde como aparece na tela (ex.: C, F#m, B°). */
  acorde: string;
  /** Texto embaixo do desenho, normalmente o grau (I, ii, V...). */
  rodape?: string;
}

export const DiagramaAcorde: React.FC<DiagramaAcordeProps> = ({ acorde, rodape }) => {
  const forma = FORMAS[acorde];
  if (!forma) return null;

  const presas = forma.casas.filter(casa => casa > 0);
  const menor = presas.length ? Math.min(...presas) : 1;

  // Se tem corda solta, o acorde é lá embaixo e o desenho começa na pestana do
  // violão. Senão, começa na casa mais baixa que o acorde usa.
  const temCordaSolta = forma.casas.some(casa => casa === 0);
  const primeiraCasa = temCordaSolta || menor === 1 ? 1 : menor;
  const relativa = (casa: number) => casa - primeiraCasa + 1;

  return (
    <div className="flex flex-col items-center shrink-0">
      <p className="text-[11px] font-bold text-gray-800 leading-none mb-0.5">
        {NOME_TOCADO[acorde] || acorde}
      </p>

      <svg
        width={LARGURA}
        height={ALTURA}
        viewBox={`0 0 ${LARGURA} ${ALTURA}`}
        role="img"
        aria-label={`Acorde ${NOME_TOCADO[acorde] || acorde} no violão`}
      >
        {/* Casas */}
        {Array.from({ length: CASAS_VISIVEIS + 1 }, (_, casa) => (
          <line
            key={`casa-${casa}`}
            x1={x(0)}
            y1={y(casa)}
            x2={x(CORDAS - 1)}
            y2={y(casa)}
            stroke="#9ca3af"
            strokeWidth={casa === 0 && primeiraCasa === 1 ? 3 : 1}
            strokeLinecap="round"
          />
        ))}

        {/* Cordas */}
        {Array.from({ length: CORDAS }, (_, corda) => (
          <line
            key={`corda-${corda}`}
            x1={x(corda)}
            y1={y(0)}
            x2={x(corda)}
            y2={y(CASAS_VISIVEIS)}
            stroke="#9ca3af"
            strokeWidth={1}
          />
        ))}

        {/* Número da casa, quando o acorde não começa no começo do braço */}
        {primeiraCasa > 1 && (
          <text x={2} y={y(0) + 10} fontSize={9} fontWeight={700} fill="#6b7280">
            {primeiraCasa}
          </text>
        )}

        {/* Pestana: o dedo deitado cobrindo várias cordas */}
        {forma.pestana && (
          <line
            x1={x(forma.pestana.de)}
            y1={y(relativa(forma.pestana.casa)) - ESPACO_CASA / 2}
            x2={x(forma.pestana.ate)}
            y2={y(relativa(forma.pestana.casa)) - ESPACO_CASA / 2}
            stroke="#1f2937"
            strokeWidth={7}
            strokeLinecap="round"
          />
        )}

        {forma.casas.map((casa, corda) => {
          // Corda que não toca
          if (casa < 0) {
            return (
              <text
                key={`marca-${corda}`}
                x={x(corda)}
                y={TOPO - 5}
                fontSize={9}
                fontWeight={700}
                fill="#9ca3af"
                textAnchor="middle"
              >
                ×
              </text>
            );
          }

          // Corda solta
          if (casa === 0) {
            return (
              <circle
                key={`marca-${corda}`}
                cx={x(corda)}
                cy={TOPO - 8}
                r={3}
                fill="none"
                stroke="#6b7280"
                strokeWidth={1.4}
              />
            );
          }

          return (
            <circle
              key={`marca-${corda}`}
              cx={x(corda)}
              cy={y(relativa(casa)) - ESPACO_CASA / 2}
              r={4}
              fill="#1f2937"
            />
          );
        })}
      </svg>

      {rodape && <p className="text-[10px] font-semibold text-gray-500 leading-none">{rodape}</p>}
    </div>
  );
};
