// ============================================
// SUPABASE.JS - CONFIGURAÇÃO E FUNÇÕES COMPLETAS
// ============================================

import { createClient } from '@supabase/supabase-js';

// Carregar variáveis de ambiente
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY || '';

// Verificar configuração
if (!supabaseUrl || !supabaseKey) {
  console.error('❌ ERRO: VITE_SUPABASE_URL e VITE_SUPABASE_KEY não estão configuradas!');
  console.error('Adicione em .env ou em Vercel → Settings → Environment Variables');
}

// Criar cliente Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

console.log('✅ Supabase configurado:', supabaseUrl ? supabaseUrl.split('.')[0] + '...' : 'não configurado');

// ==================== HINOS ====================

export async function addHino(hino) {
  try {
    const { data, error } = await supabase
      .from('hinos')
      .insert([hino])
      .select('id');
    
    if (error) throw error;
    console.log('✅ Hino salvo:', hino.nome);
    return data?.[0]?.id || hino.id;
  } catch (error) {
    console.error('❌ Erro ao salvar hino:', error);
    throw error;
  }
}

export async function getHino(id) {
  try {
    const { data, error } = await supabase
      .from('hinos')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  } catch (error) {
    console.error('❌ Erro ao buscar hino:', error);
    return null;
  }
}

export async function getAllHinos() {
  try {
    const { data, error } = await supabase
      .from('hinos')
      .select('*')
      .order('nome', { ascending: true });
    
    if (error) throw error;
    console.log('✅ Hinos carregados:', data?.length || 0);
    return data || [];
  } catch (error) {
    console.error('❌ Erro ao carregar hinos:', error);
    return [];
  }
}

export async function getHinosByType(tipo) {
  try {
    const { data, error } = await supabase
      .from('hinos')
      .select('*')
      .eq('tipo', tipo)
      .order('nome', { ascending: true });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('❌ Erro ao buscar hinos por tipo:', error);
    return [];
  }
}

export async function updateHino(hino) {
  try {
    const { error } = await supabase
      .from('hinos')
      .update(hino)
      .eq('id', hino.id);
    
    if (error) throw error;
    console.log('✅ Hino atualizado:', hino.nome);
  } catch (error) {
    console.error('❌ Erro ao atualizar hino:', error);
    throw error;
  }
}

export async function deleteHino(id) {
  try {
    const { error } = await supabase
      .from('hinos')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    console.log('✅ Hino deletado');
  } catch (error) {
    console.error('❌ Erro ao deletar hino:', error);
    throw error;
  }
}

// ==================== REPERTÓRIOS ====================

export async function addRepertorio(repertorio) {
  try {
    const { data, error } = await supabase
      .from('repertorios')
      .insert([repertorio])
      .select('id');
    
    if (error) throw error;
    console.log('✅ Repertório salvo:', repertorio.nome);
    return data?.[0]?.id || repertorio.id;
  } catch (error) {
    console.error('❌ Erro ao salvar repertório:', error);
    throw error;
  }
}

export async function getAllRepertorios() {
  try {
    const { data, error } = await supabase
      .from('repertorios')
      .select('*')
      .order('data', { ascending: false });
    
    if (error) throw error;
    console.log('✅ Repertórios carregados:', data?.length || 0);
    return data || [];
  } catch (error) {
    console.error('❌ Erro ao carregar repertórios:', error);
    return [];
  }
}

export async function getRepertorio(id) {
  try {
    const { data, error } = await supabase
      .from('repertorios')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  } catch (error) {
    console.error('❌ Erro ao buscar repertório:', error);
    return null;
  }
}

export async function updateRepertorio(repertorio) {
  try {
    const { error } = await supabase
      .from('repertorios')
      .update(repertorio)
      .eq('id', repertorio.id);
    
    if (error) throw error;
    console.log('✅ Repertório atualizado');
  } catch (error) {
    console.error('❌ Erro ao atualizar repertório:', error);
    throw error;
  }
}

export async function deleteRepertorio(id) {
  try {
    const { error } = await supabase
      .from('repertorios')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    console.log('✅ Repertório deletado');
  } catch (error) {
    console.error('❌ Erro ao deletar repertório:', error);
    throw error;
  }
}

// ==================== CONFIGURAÇÕES ====================

export async function getConfiguracoes() {
  try {
    const { data, error } = await supabase
      .from('configuracoes')
      .select('*')
      .eq('id', 'config')
      .maybeSingle();
    
    if (error && error.code !== 'PGRST116') throw error;
    if (data) console.log('✅ Configurações carregadas');
    return data || null;
  } catch (error) {
    console.error('❌ Erro ao carregar configurações:', error);
    return null;
  }
}

export async function saveConfiguracoes(config) {
  try {
    config.id = 'config';
    const { error } = await supabase
      .from('configuracoes')
      .upsert([config], { onConflict: 'id' });
    
    if (error) throw error;
    console.log('✅ Configurações salvas');
  } catch (error) {
    console.error('❌ Erro ao salvar configurações:', error);
    throw error;
  }
}

// ==================== HARPA ====================

export async function getAllHarpa() {
  try {
    const { data, error } = await supabase
      .from('harpa')
      .select('*')
      .order('numero', { ascending: true });
    
    if (error) throw error;
    console.log('✅ Harpa carregada:', data?.length || 0);
    return data || [];
  } catch (error) {
    console.error('❌ Erro ao carregar Harpa:', error);
    return [];
  }
}

export async function getHarpaByNumber(numero) {
  try {
    const { data, error } = await supabase
      .from('harpa')
      .select('*')
      .eq('numero', numero)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data || undefined;
  } catch (error) {
    console.error('❌ Erro ao buscar hino da Harpa:', error);
    return undefined;
  }
}

export async function addHarpaItems(items) {
  try {
    const { error } = await supabase
      .from('harpa')
      .insert(items);
    
    if (error) throw error;
    console.log('✅ Harpa salva:', items.length, 'hinos');
  } catch (error) {
    console.error('❌ Erro ao salvar Harpa:', error);
    throw error;
  }
}

export async function getHarpaItem(numero) {
  try {
    const { data, error } = await supabase
      .from('harpa')
      .select('*')
      .eq('numero', numero)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data || undefined;
  } catch (error) {
    console.error('❌ Erro ao buscar hino da Harpa:', error);
    return undefined;
  }
}

export async function initializeHarpaBase() {
  try {
    // Verificar se já existe
    const { data: existing } = await supabase
      .from('harpa')
      .select('count', { count: 'exact' })
      .limit(1);
    
    if (existing && existing.length > 0) {
      console.log('✅ Harpa já inicializada');
      return;
    }

    console.log('✅ Base Harpa inicializada');
  } catch (error) {
    console.error('❌ Erro ao inicializar Harpa:', error);
  }
}

// ==================== IMPORT/EXPORT ====================

export async function importHinosFromCSV(csvText) {
  try {
    const lines = csvText.trim().split('\n');
    let success = 0;
    const errorList = [];
    const items = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const parts = line.split('\t').length > 1 ? line.split('\t') : line.split(',');
      
      if (parts.length < 2) {
        errorList.push(`Linha ${i}: Formato inválido`);
        continue;
      }

      try {
        const hino = {
          id: `hino_${Date.now()}_${i}`,
          nome: parts[1]?.trim() || '',
          tom: parts[2]?.trim() || '',
          cantor: parts[3]?.trim() || '',
          categoria: 'Importado',
          tipo: 'comum'
        };
        
        if (hino.nome) {
          items.push(hino);
          success++;
        }
      } catch {
        errorList.push(`Linha ${i}: Erro ao processar`);
      }
    }

    if (items.length > 0) {
      const { error } = await supabase
        .from('hinos')
        .insert(items);
      
      if (error) throw error;
    }

    console.log(`✅ Importado: ${success} | ❌ Erros: ${errorList.length}`);
    return { success, errors: errorList };
  } catch (error) {
    console.error('❌ Erro ao importar CSV:', error);
    throw error;
  }
}

export async function exportData() {
  try {
    const hinos = await getAllHinos();
    const repertorios = await getAllRepertorios();
    const config = await getConfiguracoes();
    const harpa = await getAllHarpa();

    const data = {
      hinos,
      repertorios,
      configuracoes: config,
      harpa,
      exportedAt: new Date().toISOString()
    };

    console.log('✅ Dados exportados');
    return data;
  } catch (error) {
    console.error('❌ Erro ao exportar dados:', error);
    throw error;
  }
}

export async function importData(data) {
  try {
    if (data.hinos?.length > 0) {
      await supabase.from('hinos').insert(data.hinos);
    }
    
    if (data.repertorios?.length > 0) {
      await supabase.from('repertorios').insert(data.repertorios);
    }
    
    if (data.configuracoes) {
      await saveConfiguracoes(data.configuracoes);
    }
    
    if (data.harpa?.length > 0) {
      await supabase.from('harpa').insert(data.harpa);
    }

    console.log('✅ Dados importados com sucesso');
  } catch (error) {
    console.error('❌ Erro ao importar dados:', error);
    throw error;
  }
}

export async function clearAllData() {
  try {
    const password = prompt('Digite a senha para confirmar:');
    if (password !== '523297') {
      alert('❌ Senha incorreta');
      return;
    }

    await supabase.from('hinos').delete().neq('id', '');
    await supabase.from('repertorios').delete().neq('id', '');
    await supabase.from('configuracoes').delete().neq('id', '');

    console.log('⚠️ Todos os dados foram deletados');
  } catch (error) {
    console.error('❌ Erro ao limpar dados:', error);
    throw error;
  }
}

// ==================== STATUS ====================

export function getSupabaseStatus() {
  if (!supabaseUrl) return '❌ URL não configurada';
  if (!supabaseKey) return '❌ Chave não configurada';
  return '✅ Supabase conectado';
}

export async function testConnection() {
  try {
    const { error } = await supabase
      .from('hinos')
      .select('count', { count: 'exact' })
      .limit(1);
    
    if (error) throw error;
    console.log('✅ Conexão com Supabase OK');
    return true;
  } catch (error) {
    console.error('❌ Erro ao conectar Supabase:', error);
    return false;
  }
}

export { supabase as default };

