import React, { useState } from 'react';
import { Eye, EyeOff, RotateCcw } from 'lucide-react';
import {
  BLOCOS,
  lerBlocosOcultos,
  alternarBloco,
  limparBlocos,
} from '../services/dashboard';

/**
 * O QUE APARECE NO DASHBOARD
 *
 * Uma chavinha por pedaço da tela inicial. Desmarcou, some na hora; marcou,
 * volta. A escolha é deste aparelho (fica no localStorage), então cada um da
 * equipe pode deixar a tela inicial do jeito que preferir.
 */
export const DashboardConfig: React.FC = () => {
  const [ocultos, setOcultos] = useState<string[]>(() => lerBlocosOcultos());

  const alternar = (id: string) => setOcultos(alternarBloco(id));

  const ligados = BLOCOS.filter(b => !ocultos.includes(b.id)).length;

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">
        Marque o que você quer ver na tela inicial. {ligados} de {BLOCOS.length} ligados.
      </p>

      <div className="space-y-2">
        {BLOCOS.map(bloco => {
          const visivel = !ocultos.includes(bloco.id);

          return (
            <button
              key={bloco.id}
              onClick={() => alternar(bloco.id)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition ${
                visivel
                  ? 'bg-indigo-50 border-indigo-200'
                  : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
              }`}
            >
              <span
                className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${
                  visivel ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-500'
                }`}
              >
                {visivel ? <Eye size={18} /> : <EyeOff size={18} />}
              </span>

              <span className="flex-1 min-w-0">
                <span
                  className={`block font-bold text-sm ${
                    visivel ? 'text-gray-900' : 'text-gray-500'
                  }`}
                >
                  {bloco.nome}
                </span>
                <span className="block text-xs text-gray-500 break-words">
                  {bloco.descricao}
                </span>
              </span>

              {/* Chavinha de liga/desliga */}
              <span
                className={`shrink-0 w-11 h-6 rounded-full p-0.5 transition ${
                  visivel ? 'bg-indigo-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`block w-5 h-5 rounded-full bg-white shadow transition-transform ${
                    visivel ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </span>
            </button>
          );
        })}
      </div>

      <button
        onClick={() => setOcultos(limparBlocos())}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 transition text-sm font-semibold"
      >
        <RotateCcw size={16} />
        Voltar ao padrão
      </button>

      <p className="text-xs text-gray-400">
        A escolha vale só neste aparelho — no celular de cada um da equipe a tela
        inicial pode ser diferente.
      </p>
    </div>
  );
};
