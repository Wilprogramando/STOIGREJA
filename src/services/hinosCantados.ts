/**
 * HINOS JÁ CANTADOS
 *
 * Marcação dos hinos que já foram cantados em cada repertório. Fica na tabela
 * "hinos_cantados" do Supabase, então todos os aparelhos veem a mesma marcação.
 * Uma cópia local mantém a tela funcionando sem internet e é reenviada quando
 * a conexão volta.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY || '';
const configurado = !!(supabaseUrl && supabaseKey && supabaseUrl.includes('supabase'));

let supabase: any = null;
if (configurado) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
  } catch (erro) {
    console.error('❌ Erro ao conectar Supabase (hinos cantados):', erro);
  }
}

const CHAVE_LOCAL = 'hinosCantados';

/** Chave de um hino dentro de um repertório. */
export const chaveCantado = (repertorioId: string, hinoId: string) =>
  `${repertorioId}|${hinoId}`;

export type MapaCantados = Record<string, boolean>;

function lerLocal(): MapaCantados {
  try {
    return JSON.parse(localStorage.getItem(CHAVE_LOCAL) || '{}');
  } catch {
    return {};
  }
}

function guardarLocal(mapa: MapaCantados) {
  try {
    localStorage.setItem(CHAVE_LOCAL, JSON.stringify(mapa));
  } catch {
    /* armazenamento indisponível: segue só na tela */
  }
}

/** Marcações guardadas no aparelho (resposta imediata ao abrir a tela). */
export function carregarCantadosLocal(): MapaCantados {
  return lerLocal();
}

/** Busca as marcações no Supabase. Sem internet, devolve a cópia local. */
export async function carregarCantados(): Promise<MapaCantados> {
  if (!supabase) return lerLocal();
  try {
    const { data, error } = await supabase
      .from('hinos_cantados')
      .select('repertorio_id, hino_id');
    if (error) throw error;

    const mapa: MapaCantados = {};
    (data || []).forEach((linha: any) => {
      mapa[chaveCantado(linha.repertorio_id, linha.hino_id)] = true;
    });
    guardarLocal(mapa);
    return mapa;
  } catch (erro) {
    console.error('❌ Erro ao carregar hinos cantados:', erro);
    return lerLocal();
  }
}

/** Marca ou desmarca um hino. Devolve o mapa já atualizado. */
export async function alternarCantado(
  repertorioId: string,
  hinoId: string,
  atual: MapaCantados
): Promise<MapaCantados> {
  const chave = chaveCantado(repertorioId, hinoId);
  const marcando = !atual[chave];

  const novo = { ...atual };
  if (marcando) novo[chave] = true;
  else delete novo[chave];
  guardarLocal(novo);

  if (supabase) {
    try {
      if (marcando) {
        const { error } = await supabase
          .from('hinos_cantados')
          .upsert(
            { repertorio_id: repertorioId, hino_id: hinoId },
            { onConflict: 'repertorio_id,hino_id' }
          );
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('hinos_cantados')
          .delete()
          .eq('repertorio_id', repertorioId)
          .eq('hino_id', hinoId);
        if (error) throw error;
      }
    } catch (erro) {
      console.error('❌ Erro ao salvar hino cantado:', erro);
    }
  }

  return novo;
}

/** Apaga as marcações de um repertório (usado ao excluir o repertório). */
export async function limparCantadosDoRepertorio(repertorioId: string): Promise<void> {
  const mapa = lerLocal();
  Object.keys(mapa)
    .filter(chave => chave.startsWith(`${repertorioId}|`))
    .forEach(chave => delete mapa[chave]);
  guardarLocal(mapa);

  if (!supabase) return;
  try {
    const { error } = await supabase
      .from('hinos_cantados')
      .delete()
      .eq('repertorio_id', repertorioId);
    if (error) throw error;
  } catch (erro) {
    console.error('❌ Erro ao limpar hinos cantados:', erro);
  }
}
