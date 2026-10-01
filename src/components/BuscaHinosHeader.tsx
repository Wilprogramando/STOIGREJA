import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { getAllHinos } from '../services/db';
import { Hino } from '../types';
import { ModalVisualizaLetra } from './ModalVisualizaLetra';

/** Tira acentos para comparar textos sem depender da digitação. */
const semAcento = (texto: string) =>
  (texto || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Quantos hinos aparecem na lista de resultados. */
const MAX_RESULTADOS = 8;

/**
 * Barra de pesquisa do cabeçalho: acha um hino já cadastrado e abre a letra
 * na hora, sem precisar passar pelas telas de hinos.
 */
export const BuscaHinosHeader: React.FC = () => {
  const [termo, setTermo] = useState('');
  const [hinos, setHinos] = useState<Hino[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [aberta, setAberta] = useState(false);
  const [hinoAberto, setHinoAberto] = useState<Hino | null>(null);
  const caixa = useRef<HTMLDivElement>(null);

  // Carrega os hinos uma vez, na primeira digitação, para não pesar a abertura do app.
  useEffect(() => {
    if (!termo.trim() || hinos.length > 0 || carregando) return;

    let cancelado = false;
    setCarregando(true);
    getAllHinos()
      .then(lista => {
        if (!cancelado) setHinos(lista);
      })
      .catch(erro => console.error('Erro ao carregar os hinos da busca:', erro))
      .finally(() => {
        if (!cancelado) setCarregando(false);
      });

    return () => {
      cancelado = true;
    };
  }, [termo, hinos.length, carregando]);

  // Clique fora fecha a lista de resultados.
  useEffect(() => {
    const aoClicar = (evento: MouseEvent) => {
      if (caixa.current && !caixa.current.contains(evento.target as Node)) setAberta(false);
    };
    document.addEventListener('mousedown', aoClicar);
    return () => document.removeEventListener('mousedown', aoClicar);
  }, []);

  const resultados = useMemo(() => {
    const busca = semAcento(termo).trim();
    if (!busca) return [];

    return hinos
      .filter(h =>
        semAcento(h.nome).includes(busca) ||
        semAcento(h.cantor).includes(busca) ||
        String(h.numeroHarpa ?? '').includes(busca) ||
        // Trecho da letra: só a partir de 3 letras, senão quase tudo casa.
        (busca.length >= 3 && semAcento(h.letra).includes(busca))
      )
      .slice(0, MAX_RESULTADOS);
  }, [termo, hinos]);

  const abrirLetra = (hino: Hino) => {
    setHinoAberto(hino);
    setAberta(false);
    setTermo('');
  };

  return (
    <>
      <div ref={caixa} className="relative w-full">
        <Search
          size={20}
          className="absolute left-5 top-1/2 -translate-y-1/2 text-indigo-500 pointer-events-none"
        />
        <input
          // "text" e não "search": o navegador desenharia um X próprio, ficando dois.
          type="text"
          value={termo}
          onChange={e => {
            setTermo(e.target.value);
            setAberta(true);
          }}
          onFocus={() => setAberta(true)}
          placeholder="Buscar hinos, números ou palavras..."
          aria-label="Pesquisar hino"
          className="w-full bg-white/90 text-gray-800 placeholder-gray-400 rounded-full pl-14 pr-11 py-3.5 shadow-lg outline-none transition focus:bg-white focus:ring-2 focus:ring-white"
        />
        {termo && (
          <button
            onClick={() => {
              setTermo('');
              setAberta(false);
            }}
            title="Limpar busca"
            aria-label="Limpar busca"
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
          >
            <X size={16} />
          </button>
        )}

        {aberta && termo.trim() && (
          <div className="absolute z-40 left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
            {carregando ? (
              <p className="px-4 py-3 text-sm text-gray-500">Carregando os hinos...</p>
            ) : resultados.length === 0 ? (
              <p className="px-4 py-3 text-sm text-gray-500">Nenhum hino encontrado.</p>
            ) : (
              <ul className="max-h-80 overflow-auto divide-y divide-gray-100">
                {resultados.map(hino => (
                  <li key={hino.id}>
                    <button
                      onClick={() => abrirLetra(hino)}
                      className="w-full text-left px-4 py-3 hover:bg-indigo-50 transition"
                    >
                      <p className="font-semibold text-gray-900 break-words">
                        {hino.numeroHarpa ? hino.numeroHarpa + ' - ' : ''}
                        {hino.nome}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {[hino.tom ? 'Tom: ' + hino.tom : null, hino.cantor || null]
                          .filter(Boolean)
                          .join(' • ') || 'Toque para ver a letra'}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {hinoAberto && (
        <ModalVisualizaLetra hino={hinoAberto} onClose={() => setHinoAberto(null)} />
      )}
    </>
  );
};
