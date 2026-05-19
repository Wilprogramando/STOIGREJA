import { createClient } from '@supabase/supabase-js';
import { Hino, Repertorio, Configuracoes, HarpaItem } from '../types';

// ==================== CONFIGURAÇÃO SUPABASE ====================

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY || '';

let supabase: any = null;

if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
  console.log('✅ Supabase conectado');
} else {
  console.log('⚠️ Supabase não configurado');
}

const DB_PREFIX = 'repertorio_igreja_';

// ==================== HINOS ====================

export async function addHino(hino: Hino): Promise<string> {
  try {
    if (supabase) {
      const id = hino.id || `hino_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const dadosSupabase = {
        id: id,
        nome: hino.nome || 'Sem nome',
        tom: hino.tom || '',
        cantor: hino.cantor || '',
        letra: hino.letra || '',
        categoria: hino.categoria || 'Louvor',
        observacoes: hino.observacoes || '',
        tipo: hino.tipo || 'comum',
        numero_harpa: hino.numeroHarpa || null,
        criado_em: hino.criadoEm || new Date().toISOString(),
        atualizado_em: hino.atualizadoEm || new Date().toISOString()
      };

      const { error } = await supabase
        .from('hinos_cadastro')
        .insert([dadosSupabase]);
      
      if (error) {
        console.error('❌ Erro Supabase:', error);
        throw error;
      }

      console.log('✅ Hino salvo:', hino.nome);
      return id;
    } else {
      const id = hino.id || `hino_${Date.now()}`;
      const chave = `${DB_PREFIX}hino_${id}`;
      localStorage.setItem(chave, JSON.stringify(hino));
      console.log('✅ Hino salvo localmente');
      return id;
    }
  } catch (error) {
    console.error('❌ Erro ao salvar hino:', error);
    throw error;
  }
}

export async function getAllHinos(): Promise<Hino[]> {
  try {
    if (supabase) {
      const { data, error } = await supabase
        .from('hinos_cadastro')
        .select('*')
        .order('nome', { ascending: true });
      
      if (error) throw error;
      console.log('✅ Hinos carregados:', data?.length || 0);
      return data?.map((h: any) => ({
        id: h.id,
        nome: h.nome,
        tom: h.tom,
        cantor: h.cantor,
        letra: h.letra,
        categoria: h.categoria,
        observacoes: h.observacoes,
        tipo: h.tipo,
        numeroHarpa: h.numero_harpa,
        criadoEm: h.criado_em,
        atualizadoEm: h.atualizado_em
      })) || [];
    } else {
      const hinos: Hino[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const chave = localStorage.key(i);
        if (chave && chave.startsWith(`${DB_PREFIX}hino_`)) {
          const dados = localStorage.getItem(chave);
          if (dados) {
            hinos.push(JSON.parse(dados));
          }
        }
      }
      return hinos;
    }
  } catch (error) {
    console.error('❌ Erro ao carregar hinos:', error);
    return [];
  }
}

export async function getHino(id: string): Promise<Hino | undefined> {
  try {
    if (supabase) {
      const { data, error } = await supabase
        .from('hinos_cadastro')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      if (!data) return undefined;
      
      return {
        id: data.id,
        nome: data.nome,
        tom: data.tom,
        cantor: data.cantor,
        letra: data.letra,
        categoria: data.categoria,
        observacoes: data.observacoes,
        tipo: data.tipo,
        numeroHarpa: data.numero_harpa,
        criadoEm: data.criado_em,
        atualizadoEm: data.atualizado_em
      };
    } else {
      const chave = `${DB_PREFIX}hino_${id}`;
      const dados = localStorage.getItem(chave);
      return dados ? JSON.parse(dados) : undefined;
    }
  } catch (error) {
    console.error('❌ Erro ao buscar hino:', error);
    return undefined;
  }
}

export async function updateHino(hino: Hino): Promise<void> {
  try {
    if (supabase) {
      const dadosSupabase = {
        nome: hino.nome || 'Sem nome',
        tom: hino.tom || '',
        cantor: hino.cantor || '',
        letra: hino.letra || '',
        categoria: hino.categoria || 'Louvor',
        observacoes: hino.observacoes || '',
        tipo: hino.tipo || 'comum',
        numero_harpa: hino.numeroHarpa || null,
        atualizado_em: new Date().toISOString()
      };

      const { error } = await supabase
        .from('hinos_cadastro')
        .update(dadosSupabase)
        .eq('id', hino.id);
      
      if (error) throw error;
      console.log('✅ Hino atualizado');
    } else {
      const chave = `${DB_PREFIX}hino_${hino.id}`;
      localStorage.setItem(chave, JSON.stringify(hino));
    }
  } catch (error) {
    console.error('❌ Erro ao atualizar hino:', error);
    throw error;
  }
}

export async function deleteHino(id: string): Promise<void> {
  try {
    if (supabase) {
      const { error } = await supabase
        .from('hinos_cadastro')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      console.log('✅ Hino deletado');
    } else {
      const chave = `${DB_PREFIX}hino_${id}`;
      localStorage.removeItem(chave);
    }
  } catch (error) {
    console.error('❌ Erro ao deletar hino:', error);
    throw error;
  }
}

export async function getHinosByType(tipo: string): Promise<Hino[]> {
  try {
    if (supabase) {
      const { data, error } = await supabase
        .from('hinos_cadastro')
        .select('*')
        .eq('tipo', tipo)
        .order('nome', { ascending: true });
      
      if (error) throw error;
      return data?.map((h: any) => ({
        id: h.id,
        nome: h.nome,
        tom: h.tom,
        cantor: h.cantor,
        letra: h.letra,
        categoria: h.categoria,
        observacoes: h.observacoes,
        tipo: h.tipo,
        numeroHarpa: h.numero_harpa,
        criadoEm: h.criado_em,
        atualizadoEm: h.atualizado_em
      })) || [];
    } else {
      const todos = await getAllHinos();
      return todos.filter(h => h.tipo === tipo);
    }
  } catch (error) {
    console.error('❌ Erro ao buscar hinos por tipo:', error);
    return [];
  }
}

// ==================== REPERTÓRIOS ====================

export async function addRepertorio(repertorio: Repertorio): Promise<string> {
  try {
    if (supabase) {
      const dadosSupabase = {
        id: repertorio.id,
        nome: repertorio.nome,
        data_culto: repertorio.data,
        horario_culto: repertorio.horario || '',
        observacoes: repertorio.observacoes || '',
        lista_hinos: repertorio.hinos || [],
        criado_em: repertorio.criadoEm || new Date().toISOString(),
        atualizado_em: repertorio.atualizadoEm || new Date().toISOString()
      };

      const { error } = await supabase
        .from('repertorios_cultos')
        .insert([dadosSupabase]);
      
      if (error) throw error;
      console.log('✅ Repertório salvo');
      return repertorio.id;
    } else {
      const chave = `${DB_PREFIX}repertorio_${repertorio.id}`;
      localStorage.setItem(chave, JSON.stringify(repertorio));
      return repertorio.id;
    }
  } catch (error) {
    console.error('❌ Erro ao salvar repertório:', error);
    throw error;
  }
}

export async function getAllRepertorios(): Promise<Repertorio[]> {
  try {
    if (supabase) {
      const { data, error } = await supabase
        .from('repertorios_cultos')
        .select('*')
        .order('data_culto', { ascending: false });
      
      if (error) throw error;

      return (data || []).map((rep: any) => ({
        id: rep.id,
        nome: rep.nome,
        data: rep.data_culto,
        horario: rep.horario_culto,
        observacoes: rep.observacoes,
        hinos: rep.lista_hinos,
        criadoEm: rep.criado_em,
        atualizadoEm: rep.atualizado_em
      }));
    } else {
      const repertorios: Repertorio[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const chave = localStorage.key(i);
        if (chave && chave.startsWith(`${DB_PREFIX}repertorio_`)) {
          const dados = localStorage.getItem(chave);
          if (dados) {
            repertorios.push(JSON.parse(dados));
          }
        }
      }
      return repertorios;
    }
  } catch (error) {
    console.error('❌ Erro ao carregar repertórios:', error);
    return [];
  }
}

export async function updateRepertorio(repertorio: Repertorio): Promise<void> {
  try {
    if (supabase) {
      const dadosSupabase = {
        nome: repertorio.nome,
        data_culto: repertorio.data,
        horario_culto: repertorio.horario || '',
        observacoes: repertorio.observacoes || '',
        lista_hinos: repertorio.hinos || [],
        atualizado_em: new Date().toISOString()
      };

      const { error } = await supabase
        .from('repertorios_cultos')
        .update(dadosSupabase)
        .eq('id', repertorio.id);
      
      if (error) throw error;
      console.log('✅ Repertório atualizado');
    } else {
      const chave = `${DB_PREFIX}repertorio_${repertorio.id}`;
      localStorage.setItem(chave, JSON.stringify(repertorio));
    }
  } catch (error) {
    console.error('❌ Erro ao atualizar repertório:', error);
    throw error;
  }
}

export async function deleteRepertorio(id: string): Promise<void> {
  try {
    if (supabase) {
      const { error } = await supabase
        .from('repertorios_cultos')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      console.log('✅ Repertório deletado');
    } else {
      const chave = `${DB_PREFIX}repertorio_${id}`;
      localStorage.removeItem(chave);
    }
  } catch (error) {
    console.error('❌ Erro ao deletar repertório:', error);
    throw error;
  }
}

// ==================== CONFIGURAÇÕES ====================

export async function getConfiguracoes(): Promise<Configuracoes | null> {
  try {
    if (supabase) {
      const { data, error } = await supabase
        .from('configuracoes_sistema')
        .select('*')
        .eq('id', 'config')
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') throw error;
      if (!data) return null;
      
      return {
        id: data.id,
        nomeIgreja: data.nome_igreja,
        responsavel: data.nome_responsavel,
        rodapePdf: data.rodape_pdf,
        logo: data.logo_igreja,
        tituloSistema: data.titulo_sistema,
        logoSistema: data.logo_sistema,
        subtitulo: data.subtitulo_sistema
      };
    } else {
      const chave = `${DB_PREFIX}config`;
      const dados = localStorage.getItem(chave);
      return dados ? JSON.parse(dados) : null;
    }
  } catch (error) {
    console.error('❌ Erro ao carregar configurações:', error);
    return null;
  }
}

export async function saveConfiguracoes(config: Configuracoes): Promise<void> {
  try {
    if (supabase) {
      const dadosSupabase = {
        id: 'config',
        nome_igreja: config.nomeIgreja,
        nome_responsavel: config.responsavel,
        rodape_pdf: config.rodapePdf,
        logo_igreja: config.logo,
        titulo_sistema: config.tituloSistema,
        logo_sistema: config.logoSistema,
        subtitulo_sistema: config.subtitulo
      };

      const { error } = await supabase
        .from('configuracoes_sistema')
        .upsert([dadosSupabase], { onConflict: 'id' });
      
      if (error) throw error;
      console.log('✅ Configurações salvas');
    } else {
      const chave = `${DB_PREFIX}config`;
      config.id = 'config';
      localStorage.setItem(chave, JSON.stringify(config));
    }
  } catch (error) {
    console.error('❌ Erro ao salvar configurações:', error);
    throw error;
  }
}

// ==================== HARPA ====================

export async function getAllHarpa(): Promise<HarpaItem[]> {
  try {
    if (supabase) {
      const { data, error } = await supabase
        .from('harpa_cristaa')
        .select('*')
        .order('numero_harpa', { ascending: true });
      
      if (error) throw error;
      console.log('✅ Harpa carregada:', data?.length || 0);
      return data?.map((item: any) => ({
        numero: item.numero_harpa,
        nome: item.nome_hino
      })) || [];
    } else {
      const chave = `${DB_PREFIX}harpa_list`;
      const dados = localStorage.getItem(chave);
      return dados ? JSON.parse(dados) : [];
    }
  } catch (error) {
    console.error('❌ Erro ao carregar Harpa:', error);
    return [];
  }
}

export async function getHarpaByNumber(numero: number): Promise<HarpaItem | undefined> {
  try {
    const harpa = await getAllHarpa();
    return harpa.find(h => h.numero === numero);
  } catch (error) {
    console.error('❌ Erro ao buscar hino da Harpa:', error);
    return undefined;
  }
}

export async function addHarpaItems(items: HarpaItem[]): Promise<void> {
  try {
    if (supabase) {
      const itemsFormatted = items.map(item => ({
        numero_harpa: item.numero,
        nome_hino: item.nome
      }));
      
      const { error } = await supabase
        .from('harpa_cristaa')
        .insert(itemsFormatted);
      
      if (error) throw error;
      console.log('✅ Harpa salva');
    } else {
      const chave = `${DB_PREFIX}harpa_list`;
      localStorage.setItem(chave, JSON.stringify(items));
    }
  } catch (error) {
    console.error('❌ Erro ao salvar Harpa:', error);
    throw error;
  }
}

export async function getHarpaItem(numero: number): Promise<HarpaItem | undefined> {
  return await getHarpaByNumber(numero);
}

export async function initializeHarpaBase(): Promise<void> {
  const harpaData = await getAllHarpa();
  console.log('✅ Harpa inicializada com', harpaData.length, 'hinos');
}

// ==================== IMPORT/EXPORT ====================

export async function importHinosFromCSV(csvText: string): Promise<{ success: number; errors: string[] }> {
  const lines = csvText.trim().split('\n');
  let success = 0;
  const errorList: string[] = [];
  const items: Hino[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = line.split('\t').length > 1 ? line.split('\t') : line.split(',');
    
    if (parts.length < 2) {
      errorList.push(`Linha ${i}: Formato inválido`);
      continue;
    }

    try {
      const hino: Hino = {
        id: `hino_${Date.now()}_${i}`,
        nome: parts[1]?.trim() || '',
        tom: parts[2]?.trim() || '',
        cantor: parts[3]?.trim() || '',
        categoria: 'Importado',
        tipo: 'comum',
        letra: '',
        criadoEm: new Date().toISOString(),
        atualizadoEm: new Date().toISOString()
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
    for (const item of items) {
      await addHino(item);
    }
  }

  console.log(`✅ Importado: ${success} | ❌ Erros: ${errorList.length}`);
  return { success, errors: errorList };
}

// ==================== OUTROS ====================

export async function clearAllData(): Promise<void> {
  try {
    if (supabase) {
      await supabase.from('hinos_cadastro').delete().neq('id', '');
      await supabase.from('repertorios_cultos').delete().neq('id', '');
      console.log('✅ Dados deletados');
    } else {
      const chaves: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const chave = localStorage.key(i);
        if (chave && chave.startsWith(DB_PREFIX)) {
          chaves.push(chave);
        }
      }
      chaves.forEach(chave => localStorage.removeItem(chave));
    }
  } catch (error) {
    console.error('❌ Erro ao deletar dados:', error);
  }
}

export async function exportData(): Promise<void> {
  console.log('📦 Exportando dados...');
}

export async function importData(data: any): Promise<void> {
  console.log('📦 Importando dados...');
}

export default {
  addHino,
  getAllHinos,
  getHino,
  updateHino,
  deleteHino,
  getHinosByType,
  addRepertorio,
  getAllRepertorios,
  updateRepertorio,
  deleteRepertorio,
  getConfiguracoes,
  saveConfiguracoes,
  getAllHarpa,
  getHarpaByNumber,
  addHarpaItems,
  getHarpaItem,
  initializeHarpaBase,
  importHinosFromCSV,
  clearAllData,
  exportData,
  importData
};
