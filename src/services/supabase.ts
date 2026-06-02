import { createClient } from '@supabase/supabase-js';
import { Hino, Repertorio, Configuracoes, HarpaItem } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY || '';

// Verificar se Supabase está configurado
const isSupabaseConfigured = supabaseUrl && supabaseKey && supabaseUrl.includes('supabase');

console.log('Supabase URL:', supabaseUrl ? '✅ Configurado' : '❌ Não configurado');

// Criar cliente Supabase apenas se estiver configurado
let supabase: any = null;
if (isSupabaseConfigured) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('✅ Supabase conectado com sucesso');
  } catch (error) {
    console.error('❌ Erro ao conectar Supabase:', error);
  }
}

// ==================== HINOS ====================

export async function addHinoSupabase(hino: Hino) {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('hinos')
      .insert([hino])
      .select();
    if (error) throw error;
    console.log('✅ Hino salvo em Supabase');
    return data?.[0];
  } catch (error) {
    console.error('❌ Erro ao salvar hino:', error);
    return null;
  }
}

export async function updateHinoSupabase(hino: Hino) {
  if (!supabase) return null;
  try {
    const { error } = await supabase
      .from('hinos')
      .update(hino)
      .eq('id', hino.id);
    if (error) throw error;
    console.log('✅ Hino atualizado em Supabase');
    return true;
  } catch (error) {
    console.error('❌ Erro ao atualizar hino:', error);
    return false;
  }
}

export async function deleteHinoSupabase(id: string) {
  if (!supabase) return null;
  try {
    const { error } = await supabase
      .from('hinos')
      .delete()
      .eq('id', id);
    if (error) throw error;
    console.log('✅ Hino deletado em Supabase');
    return true;
  } catch (error) {
    console.error('❌ Erro ao deletar hino:', error);
    return false;
  }
}

export async function getAllHinosSupabase(): Promise<Hino[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('hinos')
      .select('*');
    if (error) throw error;
    console.log('✅ Hinos carregados do Supabase:', data?.length || 0);
    return data || [];
  } catch (error) {
    console.error('❌ Erro ao carregar hinos:', error);
    return [];
  }
}

// ==================== CONFIGURAÇÕES ====================

export async function getConfiguracoesupabase(): Promise<Configuracoes | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('configuracoes')
      .select('*')
      .eq('id', 'config')
      .maybeSingle();
    if (error && error.code !== 'PGRST116') throw error;
    if (data) {
      console.log('✅ Configurações carregadas do Supabase');
    }
    return data || null;
  } catch (error) {
    console.error('❌ Erro ao carregar configurações:', error);
    return null;
  }
}

export async function saveConfiguracoeSupabase(config: Configuracoes) {
  if (!supabase) return null;
  try {
    config.id = 'config';
    const { data, error } = await supabase
      .from('configuracoes')
      .upsert([config])
      .select();
    if (error) throw error;
    console.log('✅ Configurações salvas em Supabase');
    return data?.[0];
  } catch (error) {
    console.error('❌ Erro ao salvar configurações:', error);
    return null;
  }
}

// ==================== REPERTÓRIOS ====================

export async function addRepertorioSupabase(repertorio: Repertorio) {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('repertorios')
      .insert([repertorio])
      .select();
    if (error) throw error;
    console.log('✅ Repertório salvo em Supabase');
    return data?.[0];
  } catch (error) {
    console.error('❌ Erro ao salvar repertório:', error);
    return null;
  }
}

export async function updateRepertorioSupabase(repertorio: Repertorio) {
  if (!supabase) return null;
  try {
    const { error } = await supabase
      .from('repertorios')
      .update(repertorio)
      .eq('id', repertorio.id);
    if (error) throw error;
    console.log('✅ Repertório atualizado em Supabase');
    return true;
  } catch (error) {
    console.error('❌ Erro ao atualizar repertório:', error);
    return false;
  }
}

export async function deleteRepertorioSupabase(id: string) {
  if (!supabase) return null;
  try {
    const { error } = await supabase
      .from('repertorios')
      .delete()
      .eq('id', id);
    if (error) throw error;
    console.log('✅ Repertório deletado em Supabase');
    return true;
  } catch (error) {
    console.error('❌ Erro ao deletar repertório:', error);
    return false;
  }
}

export async function getAllRepertoriosSupabase(): Promise<Repertorio[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('repertorios')
      .select('*')
      .order('data', { ascending: false });
    if (error) throw error;
    console.log('✅ Repertórios carregados do Supabase:', data?.length || 0);
    return data || [];
  } catch (error) {
    console.error('❌ Erro ao carregar repertórios:', error);
    return [];
  }
}

// ==================== FAVORITOS ====================

export async function carregarFavoritosSupabase(usuarioId: string): Promise<string[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('hinos_favoritos')
      .select('hino_id')
      .eq('usuario_id', usuarioId);

    if (error) throw error;
    const favoritosIds = data?.map((item: any) => item.hino_id) || [];
    console.log('✅ Favoritos carregados:', favoritosIds.length);
    return favoritosIds;
  } catch (error) {
    console.error('❌ Erro ao carregar favoritos:', error);
    return [];
  }
}

export async function adicionarFavoritoSupabase(usuarioId: string, hinoId: string) {
  if (!supabase) return false;
  try {
    const { error } = await supabase
      .from('hinos_favoritos')
      .insert({
        usuario_id: usuarioId,
        hino_id: hinoId,
        criado_em: new Date().toISOString()
      });

    if (error) throw error;
    console.log('✅ Favorito adicionado:', hinoId);
    return true;
  } catch (error) {
    console.error('❌ Erro ao adicionar favorito:', error);
    return false;
  }
}

export async function removerFavoritoSupabase(usuarioId: string, hinoId: string) {
  if (!supabase) return false;
  try {
    const { error } = await supabase
      .from('hinos_favoritos')
      .delete()
      .eq('usuario_id', usuarioId)
      .eq('hino_id', hinoId);

    if (error) throw error;
    console.log('✅ Favorito removido:', hinoId);
    return true;
  } catch (error) {
    console.error('❌ Erro ao remover favorito:', error);
    return false;
  }
}

// ==================== STATUS ====================

export function isSupabaseReady(): boolean {
  return isSupabaseConfigured && supabase !== null;
}

export function getSupabaseStatus(): string {
  if (!supabaseUrl) return '❌ URL não configurada';
  if (!supabaseKey) return '❌ Chave não configurada';
  if (!supabase) return '❌ Supabase não conectado';
  return '✅ Supabase conectado';
}
