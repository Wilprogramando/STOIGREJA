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
