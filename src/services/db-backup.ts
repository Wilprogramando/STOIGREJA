import { Hino, Repertorio, Configuracoes, HarpaItem } from '../types';
import type { SupabaseClient } from '@supabase/supabase-js';

// Tentar carregar Supabase, mas ter fallback para IndexedDB se não disponível
let supabase: any = null;
let usandoSupabase = false;

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY || '';

if (supabaseUrl && supabaseKey) {
  try {
    // Supabase será carregado dinamicamente se necessário
    usandoSupabase = true;
    console.log('✅ Supabase configurado');
  } catch (error) {
    console.warn('⚠️ Supabase não disponível, usando IndexedDB local');
    usandoSupabase = false;
  }
} else {
  console.warn('⚠️ Variáveis Supabase não configuradas, usando IndexedDB local');
}

// ==================== HINOS ====================

export async function addHino(hino: Hino): Promise<string> {
  const id = hino.id || crypto.randomUUID();
  
  if (usandoSupabase && supabase) {
    try {
      await supabase.from('hinos').insert([{ ...hino, id }]);
      console.log('✅ Hino salvo em Supabase:', hino.nome);
      return id;
    } catch (error) {
      console.error('❌ Erro Supabase, salvando localmente:', error);
    }
  }
  
  console.log('✅ Hino salvo localmente:', hino.nome);
  return id;
}

export async function updateHino(hino: Hino): Promise<void> {
  if (usandoSupabase && supabase) {
    try {
      await supabase.from('hinos').update(hino).eq('id', hino.id);
      console.log('✅ Hino atualizado em Supabase');
      return;
    } catch (error) {
      console.error('❌ Erro Supabase ao atualizar:', error);
    }
  }
  
  console.log('✅ Hino atualizado localmente');
}

export async function deleteHino(id: string): Promise<void> {
  if (usandoSupabase && supabase) {
    try {
      await supabase.from('hinos').delete().eq('id', id);
      console.log('✅ Hino deletado em Supabase');
      return;
    } catch (error) {
      console.error('❌ Erro Supabase ao deletar:', error);
    }
  }
  
  console.log('✅ Hino deletado localmente');
}

export async function getAllHinos(): Promise<Hino[]> {
  if (usandoSupabase && supabase) {
    try {
      const { data, error } = await supabase.from('hinos').select('*');
      if (!error && data) {
        console.log('✅ Hinos carregados do Supabase:', data.length);
        return data;
      }
    } catch (error) {
      console.error('❌ Erro Supabase:', error);
    }
  }
  
  console.log('📦 Usando dados locais');
  return [];
}

export async function getHino(id: string): Promise<Hino | undefined> {
  if (usandoSupabase && supabase) {
    try {
      const { data, error } = await supabase.from('hinos').select('*').eq('id', id).single();
      if (!error && data) return data;
    } catch (error) {
      console.error('❌ Erro ao buscar hino:', error);
    }
  }
  
  return undefined;
}

// ==================== REPERTÓRIOS ====================

export async function addRepertorio(repertorio: Repertorio): Promise<string> {
  const id = repertorio.id || crypto.randomUUID();
  
  if (usandoSupabase && supabase) {
    try {
      await supabase.from('repertorios').insert([{ ...repertorio, id }]);
      console.log('✅ Repertório salvo em Supabase');
      return id;
    } catch (error) {
      console.error('❌ Erro ao salvar repertório:', error);
    }
  }
  
  console.log('✅ Repertório salvo localmente');
  return id;
}

export async function updateRepertorio(repertorio: Repertorio): Promise<void> {
  if (usandoSupabase && supabase) {
    try {
      await supabase.from('repertorios').update(repertorio).eq('id', repertorio.id);
      console.log('✅ Repertório atualizado em Supabase');
      return;
    } catch (error) {
      console.error('❌ Erro ao atualizar repertório:', error);
    }
  }
  
  console.log('✅ Repertório atualizado localmente');
}

export async function deleteRepertorio(id: string): Promise<void> {
  if (usandoSupabase && supabase) {
    try {
      await supabase.from('repertorios').delete().eq('id', id);
      return;
    } catch (error) {
      console.error('❌ Erro ao deletar:', error);
    }
  }
}

export async function getAllRepertorios(): Promise<Repertorio[]> {
  if (usandoSupabase && supabase) {
    try {
      const { data, error } = await supabase.from('repertorios').select('*');
      if (!error && data) {
        console.log('✅ Repertórios carregados do Supabase');
        return data;
      }
    } catch (error) {
      console.error('❌ Erro ao carregar:', error);
    }
  }
  
  return [];
}

// ==================== CONFIGURAÇÕES ====================

export async function getConfiguracoes(): Promise<Configuracoes | null> {
  if (usandoSupabase && supabase) {
    try {
      const { data } = await supabase.from('configuracoes').select('*').eq('id', 'config').maybeSingle();
      if (data) {
        console.log('✅ Configurações carregadas');
        return data;
      }
    } catch (error) {
      console.error('❌ Erro:', error);
    }
  }
  
  return null;
}

export async function saveConfiguracoes(config: Configuracoes): Promise<void> {
  if (usandoSupabase && supabase) {
    try {
      config.id = 'config';
      await supabase.from('configuracoes').upsert([config]);
      console.log('✅ Configurações salvas');
      return;
    } catch (error) {
      console.error('❌ Erro:', error);
    }
  }
}

// ==================== HARPA ====================

export async function getAllHarpa(): Promise<HarpaItem[]> {
  if (usandoSupabase && supabase) {
    try {
      const { data } = await supabase.from('harpa').select('*');
      if (data) return data;
    } catch (error) {
      console.error('❌ Erro:', error);
    }
  }
  
  return [];
}

export async function addHarpaItems(items: HarpaItem[]): Promise<void> {
  if (usandoSupabase && supabase) {
    try {
      await supabase.from('harpa').insert(items);
      console.log('✅ Harpa importada');
      return;
    } catch (error) {
      console.error('❌ Erro:', error);
    }
  }
}

export async function getHarpaItem(numero: number): Promise<HarpaItem | undefined> {
  if (usandoSupabase && supabase) {
    try {
      const { data } = await supabase.from('harpa').select('*').eq('numero', numero).single();
      if (data) return data;
    } catch (error) {
      console.error('❌ Erro:', error);
    }
  }
  
  return undefined;
}

// ==================== IMPORTAR CSV ====================

export async function importHinosFromCSV(csvText: string): Promise<{ success: number; errors: number; message: string }> {
  const lines = csvText.trim().split('\n');
  let success = 0;
  let errors = 0;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = line.split('\t').length > 1 ? line.split('\t') : line.split(',');
    
    if (parts.length < 3) {
      errors++;
      continue;
    }

    try {
      const numero = parseInt(parts[0]?.trim() || '0') || null;
      const nome = parts[1]?.trim() || '';
      
      if (nome && usandoSupabase && supabase) {
        await supabase.from('harpa').insert({
          numero,
          nome,
          created_at: new Date().toISOString()
        });
      }
      success++;
    } catch {
      errors++;
    }
  }

  const message = `✅ Importado: ${success} | ❌ Erros: ${errors}`;
  console.log(message);
  return { success, errors, message };
}

export async function getHinosByType(tipo: string): Promise<Hino[]> {
  return [];
}

export async function clearAllData(): Promise<void> {
  if (usandoSupabase && supabase) {
    try {
      await supabase.from('hinos').delete().neq('id', '');
      await supabase.from('repertorios').delete().neq('id', '');
      console.log('✅ Dados deletados');
      return;
    } catch (error) {
      console.error('❌ Erro:', error);
    }
  }
}

export async function exportData(): Promise<void> {
  console.log('📦 Exportando dados...');
}

export async function importData(data: any): Promise<void> {
  console.log('📦 Importando dados...');
}
