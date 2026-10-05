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

// ==================== CIFRAS (Tocar por Cifra) ====================

/**
 * A tabela usa nomes com underline (tom_original), e o app usa camelCase.
 * A tradução fica nestas duas funções, para o resto do código não saber disso.
 */
function cifraDaTabela(linha: any) {
  return {
    id: String(linha.id),
    nome: linha.nome || '',
    artista: linha.artista || '',
    tomOriginal: linha.tom_original || '',
    tomEscolhido: linha.tom_escolhido || '',
    cifra: linha.cifra || '',
    afinacao: linha.afinacao || '',
    fonte: linha.fonte || '',
    criadoEm: linha.criado_em || new Date().toISOString(),
  };
}

function cifraParaTabela(cifra: any) {
  return {
    id: cifra.id,
    nome: cifra.nome,
    artista: cifra.artista || '',
    tom_original: cifra.tomOriginal || '',
    tom_escolhido: cifra.tomEscolhido || '',
    cifra: cifra.cifra,
    afinacao: cifra.afinacao || '',
    fonte: cifra.fonte || '',
    criado_em: cifra.criadoEm || new Date().toISOString(),
  };
}

export async function lerCifrasSupabase(): Promise<any[] | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('cifras')
      .select('*')
      .order('criado_em', { ascending: false });
    if (error) throw error;

    return (data || []).map(cifraDaTabela);
  } catch (error) {
    console.error('❌ Erro ao ler cifras:', error);
    return null;
  }
}

/** Grava a cifra nova ou atualiza a que já tem o mesmo id (upsert). */
export async function salvarCifraSupabase(cifra: any): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('cifras').upsert([cifraParaTabela(cifra)]);
    if (error) throw error;

    console.log('✅ Cifra salva no Supabase:', cifra.nome);
    return true;
  } catch (error) {
    console.error('❌ Erro ao salvar cifra:', error);
    return false;
  }
}

export async function removerCifraSupabase(id: string): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('cifras').delete().eq('id', id);
    if (error) throw error;

    console.log('✅ Cifra removida do Supabase:', id);
    return true;
  } catch (error) {
    console.error('❌ Erro ao remover cifra:', error);
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

// ==================== APARÊNCIA (tema do sistema) ====================

/**
 * A aparência é uma só para a igreja inteira: quem muda a cor nas
 * Configurações muda em todos os aparelhos que abrem o sistema. Por isso mora
 * numa linha única (id = 'tema') em vez de ficar só no localStorage.
 */
export async function lerTemaSupabase(): Promise<any | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('tema_sistema')
      .select('dados')
      .eq('id', 'tema')
      .maybeSingle();
    if (error && error.code !== 'PGRST116') throw error;

    return data?.dados || null;
  } catch (error) {
    console.error('❌ Erro ao ler a aparência:', error);
    return null;
  }
}

export async function salvarTemaSupabase(tema: any): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('tema_sistema').upsert([
      { id: 'tema', dados: tema, atualizado_em: new Date().toISOString() },
    ]);
    if (error) throw error;

    console.log('✅ Aparência salva para todos os aparelhos');
    return true;
  } catch (error) {
    console.error('❌ Erro ao salvar a aparência:', error);
    return false;
  }
}

/**
 * Avisa quando outro aparelho trocar a aparência, para a troca aparecer na
 * hora sem ninguém precisar recarregar a página.
 */
export function ouvirTemaSupabase(aoMudar: (tema: any) => void): () => void {
  if (!supabase) return () => {};

  try {
    const canal = supabase
      .channel('tema-sistema')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tema_sistema' },
        (payload: any) => {
          const dados = payload?.new?.dados;
          if (dados) aoMudar(dados);
        }
      )
      .subscribe();

    return () => {
      try {
        supabase.removeChannel(canal);
      } catch {
        /* nada a fazer: a página está fechando */
      }
    };
  } catch (error) {
    console.error('❌ Não foi possível ouvir a aparência:', error);
    return () => {};
  }
}

// ==================== PESSOAS DOS APARELHOS ====================

/**
 * O nome que a pessoa deu na primeira vez que abriu o sistema no aparelho
 * (ver supabase_pessoas.sql). Uma linha por aparelho.
 */
export async function salvarPessoaSupabase(
  aparelhoId: string,
  nome: string,
  aparelho = ''
): Promise<boolean> {
  if (!supabase || !aparelhoId || !nome) return false;
  try {
    const { error } = await supabase.from('pessoas_aparelhos').upsert([
      {
        aparelho_id: aparelhoId,
        nome,
        aparelho,
        atualizado_em: new Date().toISOString(),
      },
    ]);
    if (error) throw error;

    console.log('✅ Nome guardado no Supabase:', nome);
    return true;
  } catch (error) {
    console.error('❌ Erro ao guardar o nome da pessoa:', error);
    return false;
  }
}

/**
 * Nome já guardado para este aparelho. Serve para não perguntar de novo a quem
 * limpou os dados do navegador ou abriu em outro navegador do mesmo celular.
 */
export async function lerPessoaSupabase(aparelhoId: string): Promise<string> {
  if (!supabase || !aparelhoId) return '';
  try {
    const { data, error } = await supabase
      .from('pessoas_aparelhos')
      .select('nome')
      .eq('aparelho_id', aparelhoId)
      .maybeSingle();
    if (error && error.code !== 'PGRST116') throw error;

    return (data?.nome || '').trim();
  } catch (error) {
    console.error('❌ Erro ao ler o nome da pessoa:', error);
    return '';
  }
}

/** Todas as pessoas que já abriram o sistema, da mais recente para a mais antiga. */
export async function lerPessoasSupabase(): Promise<
  { aparelhoId: string; nome: string; aparelho: string; atualizadoEm: string }[]
> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('pessoas_aparelhos')
      .select('*')
      .order('atualizado_em', { ascending: false });
    if (error) throw error;

    return (data || []).map((linha: any) => ({
      aparelhoId: linha.aparelho_id || '',
      nome: linha.nome || '',
      aparelho: linha.aparelho || '',
      atualizadoEm: linha.atualizado_em || '',
    }));
  } catch (error) {
    console.error('❌ Erro ao listar as pessoas:', error);
    return [];
  }
}
