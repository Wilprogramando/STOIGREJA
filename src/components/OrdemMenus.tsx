import React, { useEffect, useRef, useState } from 'react';
import { GripVertical, ListOrdered, RotateCcw, Check } from 'lucide-react';
import {
  MenuDoSistema,
  menusOrdenados,
  salvarOrdemMenus,
  limparOrdemMenus,
} from '../services/menus';

interface OrdemMenusProps {
  /** Avisa o App para redesenhar a barra lateral com a ordem nova. */
  onOrdemChange?: () => void;
}

/**
 * Lista do menu que o usuário reordena arrastando.
 *
 * Usa eventos de ponteiro (e não o drag-and-drop do navegador) porque no
 * celular o arrastar nativo não funciona — aqui o dedo e o mouse são iguais.
 */
export const OrdemMenus: React.FC<OrdemMenusProps> = ({ onOrdemChange }) => {
  const [itens, setItens] = useState<MenuDoSistema[]>(() => menusOrdenados());
  /** Qual item está sendo arrastado no momento. */
  const [arrastando, setArrastando] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);

  const listaRef = useRef<HTMLDivElement>(null);
  /** Item arrastado, lido dentro dos eventos da janela. */
  const arrastandoRef = useRef<string | null>(null);
  /** Guarda a ordem durante o arraste sem depender do estado, que atrasa. */
  const ordemRef = useRef<MenuDoSistema[]>(itens);

  useEffect(() => {
    ordemRef.current = itens;
  }, [itens]);

  /** Mostra o "salvo" por alguns segundos depois de soltar. */
  const avisarSalvo = () => {
    setSalvo(true);
    setTimeout(() => setSalvo(false), 2500);
  };

  const gravar = (nova: MenuDoSistema[]) => {
    salvarOrdemMenus(nova.map(m => m.id));
    onOrdemChange?.();
    avisarSalvo();
  };

  /** Qual item da lista está embaixo do dedo/ponteiro agora? */
  const idNaPosicao = (x: number, y: number): string | null => {
    const alvo = document.elementFromPoint(x, y);
    const linha = alvo?.closest('[data-menu-id]') as HTMLElement | null;
    return linha?.dataset.menuId || null;
  };

  const aoMover = (evento: PointerEvent) => {
    const id = arrastandoRef.current;
    if (!id) return;

    // Sem isso a página rola junto no celular em vez de arrastar o item.
    evento.preventDefault();

    const sobre = idNaPosicao(evento.clientX, evento.clientY);
    if (!sobre || sobre === id) return;

    const atual = ordemRef.current;
    const de = atual.findIndex(m => m.id === id);
    const para = atual.findIndex(m => m.id === sobre);
    if (de === -1 || para === -1 || de === para) return;

    const nova = [...atual];
    const [movido] = nova.splice(de, 1);
    nova.splice(para, 0, movido);

    ordemRef.current = nova;
    setItens(nova);
  };

  const aoSoltar = () => {
    if (!arrastandoRef.current) return;

    arrastandoRef.current = null;
    setArrastando(null);
    gravar(ordemRef.current);
  };

  // Escuta o movimento na janela inteira: o dedo pode sair de cima da linha.
  useEffect(() => {
    const mover = (e: PointerEvent) => aoMover(e);
    const soltar = () => aoSoltar();

    window.addEventListener('pointermove', mover, { passive: false });
    window.addEventListener('pointerup', soltar);
    window.addEventListener('pointercancel', soltar);

    return () => {
      window.removeEventListener('pointermove', mover);
      window.removeEventListener('pointerup', soltar);
      window.removeEventListener('pointercancel', soltar);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const comecarArraste = (id: string) => (evento: React.PointerEvent) => {
    evento.preventDefault();
    arrastandoRef.current = id;
    setArrastando(id);
  };

  const restaurar = () => {
    limparOrdemMenus();
    const padrao = menusOrdenados([]);
    ordemRef.current = padrao;
    setItens(padrao);
    onOrdemChange?.();
    avisarSalvo();
  };

  /** Setas para quem preferir tocar em vez de arrastar. */
  const mover = (id: string, passo: number) => {
    const atual = ordemRef.current;
    const de = atual.findIndex(m => m.id === id);
    const para = de + passo;
    if (de === -1 || para < 0 || para >= atual.length) return;

    const nova = [...atual];
    const [movido] = nova.splice(de, 1);
    nova.splice(para, 0, movido);

    ordemRef.current = nova;
    setItens(nova);
    gravar(nova);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex items-start justify-between gap-3 mb-1">
        <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <ListOrdered size={20} className="text-indigo-600" />
          Ordem do Menu
        </h3>

        {salvo && (
          <span className="shrink-0 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-2 py-1 rounded-lg flex items-center gap-1">
            <Check size={13} />
            Salvo
          </span>
        )}
      </div>

      <p className="text-sm text-gray-500 mb-4">
        Arraste pela alcinha <GripVertical size={14} className="inline align-text-bottom" /> para
        deixar as telas mais usadas no topo do menu lateral. A ordem salva sozinha.
      </p>

      <div ref={listaRef} className="space-y-2 select-none">
        {itens.map((menu, indice) => {
          const puxando = arrastando === menu.id;

          return (
            <div
              key={menu.id}
              data-menu-id={menu.id}
              className={`flex items-center gap-3 p-3 rounded-lg border transition ${
                puxando
                  ? 'border-indigo-400 bg-indigo-50 shadow-lg scale-[1.02]'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <button
                onPointerDown={comecarArraste(menu.id)}
                title="Arrastar para mudar de lugar"
                aria-label={`Arrastar ${menu.label}`}
                className="shrink-0 p-1.5 -m-1.5 text-gray-400 hover:text-indigo-600 cursor-grab active:cursor-grabbing touch-none"
              >
                <GripVertical size={20} />
              </button>

              <span className="shrink-0 w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-extrabold flex items-center justify-center tabular-nums">
                {indice + 1}
              </span>

              <p className="flex-1 min-w-0 font-medium text-gray-800 truncate">{menu.label}</p>

              <div className="shrink-0 flex gap-1">
                <button
                  onClick={() => mover(menu.id, -1)}
                  disabled={indice === 0}
                  title="Subir"
                  className="px-2 py-1 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-30 text-sm font-bold"
                >
                  ↑
                </button>
                <button
                  onClick={() => mover(menu.id, 1)}
                  disabled={indice === itens.length - 1}
                  title="Descer"
                  className="px-2 py-1 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-30 text-sm font-bold"
                >
                  ↓
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <button
        onClick={restaurar}
        className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-medium"
      >
        <RotateCcw size={16} />
        Voltar à ordem original
      </button>
    </div>
  );
};
