import React, { useState } from 'react';
import { RotateCcw, Check, Undo2 } from 'lucide-react';
import { MENUS, lerNomesMenus, salvarNomeMenu, limparNomesMenus } from '../services/menus';

interface NomesMenusProps {
  /** Avisa o App para redesenhar o menu com os nomes novos. */
  onNomesChange?: () => void;
}

/**
 * Troca o nome que cada tela mostra no menu ("Cadastrar Hino" pode virar
 * "Novo Louvor", por exemplo). O sistema por dentro continua o mesmo:
 * só o nome que aparece muda.
 */
export const NomesMenus: React.FC<NomesMenusProps> = ({ onNomesChange }) => {
  const [nomes, setNomes] = useState<Record<string, string>>(() => lerNomesMenus());
  const [salvo, setSalvo] = useState(false);

  const avisarSalvo = () => {
    setSalvo(true);
    setTimeout(() => setSalvo(false), 2000);
  };

  /** Enquanto digita, guarda só na tela. */
  const digitar = (id: string, valor: string) => setNomes({ ...nomes, [id]: valor });

  /** Ao sair do campo (ou apertar Enter), grava de verdade. */
  const gravar = (id: string) => {
    const atualizados = salvarNomeMenu(id, nomes[id] || '');
    setNomes(atualizados);
    onNomesChange?.();
    avisarSalvo();
  };

  const voltarUm = (id: string) => {
    const atualizados = salvarNomeMenu(id, '');
    setNomes(atualizados);
    onNomesChange?.();
    avisarSalvo();
  };

  const voltarTodos = () => {
    if (!confirm('Voltar todos os menus para os nomes originais?')) return;

    limparNomesMenus();
    setNomes({});
    onNomesChange?.();
    avisarSalvo();
  };

  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-3">
        <p className="text-sm text-gray-500">
          Escreva o nome que você quer ver no menu. Deixe em branco para usar o nome
          original.
        </p>

        {salvo && (
          <span className="shrink-0 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-2 py-1 rounded-lg flex items-center gap-1">
            <Check size={13} />
            Salvo
          </span>
        )}
      </div>

      <div className="space-y-2">
        {MENUS.map(menu => {
          const trocado = Boolean((nomes[menu.id] || '').trim());

          return (
            <div key={menu.id} className="p-3 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <p className="text-xs text-gray-500 truncate">
                  Nome original: <strong className="text-gray-700">{menu.label}</strong>
                </p>

                {trocado && (
                  <button
                    onClick={() => voltarUm(menu.id)}
                    title={`Voltar para "${menu.label}"`}
                    className="shrink-0 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 px-2 py-1 rounded-lg flex items-center gap-1"
                  >
                    <Undo2 size={13} />
                    Voltar
                  </button>
                )}
              </div>

              <input
                value={nomes[menu.id] || ''}
                onChange={e => digitar(menu.id, e.target.value)}
                onBlur={() => gravar(menu.id)}
                onKeyDown={e => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                placeholder={menu.label}
                maxLength={28}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          );
        })}
      </div>

      <button
        onClick={voltarTodos}
        className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-medium"
      >
        <RotateCcw size={16} />
        Voltar aos nomes originais
      </button>

      <p className="text-xs text-gray-500 mt-3">
        Os nomes valem para este aparelho e mudam o menu lateral, os atalhos de baixo e
        os botões do Dashboard.
      </p>
    </div>
  );
};
