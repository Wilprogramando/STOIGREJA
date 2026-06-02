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
