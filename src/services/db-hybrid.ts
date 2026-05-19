/**
 * SISTEMA HÍBRIDO
 * Usa Supabase se credenciais estiverem configuradas
 * Usa IndexedDB como fallback
 */

import { Hino, Repertorio, Configuracoes } from '../types';
import * as dbLocal from './db';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY;
const USE_SUPABASE = SUPABASE_URL && SUPABASE_KEY && SUPABASE_URL.includes('supabase');

let supabaseClient: any = null;

// Inicializar Supabase se disponível
if (USE_SUPABASE) {
  import('@supabase/supabase-js')
    .then(({ createClient }) => {
      supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);
      console.log('✅ SUPABASE ATIVADO - Dados sincronizando com nuvem');
    })
    .catch((err) => {
      console.warn('⚠️ Supabase não disponível, usando IndexedDB local:', err.message);
    });
}

// ==================== HELPER FUNCTIONS ====================

async function syncToSupabase(operation: string, data: any): Promise<void> {
  if (!supabaseClient) return;
  
  try {
    switch (operation) {
      case 'hino.add':
        await supabaseClient.from('hinos').insert([data]);
        break;
      case 'hino.update':
        await supabaseClient.from('hinos').update(data).eq('id', data.id);
        break;
      case 'hino.delete':
        await supabaseClient.from('hinos').delete().eq('id', data);
        break;
      case 'repertorio.add':
        await supabaseClient.from('repertorios').insert([data]);
        break;
      case 'repertorio.update':
        await supabaseClient.from('repertorios').update(data).eq('id', data.id);
        break;
      case 'repertorio.delete':
        await supabaseClient.from('repertorios').delete().eq('id', data);
        break;
      case 'config.save':
        data.id = 'config';
        await supabaseClient.from('configuracoes').upsert([data]);
        break;
    }
  } catch (err) {
    console.warn('⚠️ Erro ao sincronizar com Supabase:', err);
  }
}

// ==================== HINOS ====================

export async function addHino(hino: Hino): Promise<string> {
  // Salvar localmente primeiro (rápido)
  const id = await dbLocal.addHino(hino);
  
  // Sincronizar com Supabase (background)
  if (supabaseClient) {
    hino.id = id;
    syncToSupabase('hino.add', hino);
  }
  
  return id;
}

export async function updateHino(hino: Hino): Promise<void> {
  // Atualizar localmente primeiro
  await dbLocal.updateHino(hino);
  
  // Sincronizar com Supabase
  if (supabaseClient) {
    syncToSupabase('hino.update', hino);
  }
}

export async function deleteHino(id: string): Promise<void> {
  // Deletar localmente primeiro
  await dbLocal.deleteHino(id);
  
  // Sincronizar com Supabase
  if (supabaseClient) {
    syncToSupabase('hino.delete', id);
  }
}

export async function getAllHinos(): Promise<Hino[]> {
  // Sempre pega do IndexedDB local (mais rápido)
  return dbLocal.getAllHinos();
}

export async function getHino(id: string): Promise<Hino | undefined> {
  return dbLocal.getHino(id);
}

// ==================== REPERTÓRIOS ====================

export async function addRepertorio(repertorio: Repertorio): Promise<string> {
  const id = await dbLocal.addRepertorio(repertorio);
  
  if (supabaseClient) {
    repertorio.id = id;
    syncToSupabase('repertorio.add', repertorio);
  }
  
  return id;
}

export async function updateRepertorio(repertorio: Repertorio): Promise<void> {
  await dbLocal.updateRepertorio(repertorio);
  
  if (supabaseClient) {
    syncToSupabase('repertorio.update', repertorio);
  }
}

export async function deleteRepertorio(id: string): Promise<void> {
  await dbLocal.deleteRepertorio(id);
  
  if (supabaseClient) {
    syncToSupabase('repertorio.delete', id);
  }
}

export async function getAllRepertorios(): Promise<Repertorio[]> {
  return dbLocal.getAllRepertorios();
}

// ==================== CONFIGURAÇÕES ====================

export async function getConfiguracoes(): Promise<Configuracoes | null> {
  return dbLocal.getConfiguracoes();
}

export async function saveConfiguracoes(config: Configuracoes): Promise<void> {
  await dbLocal.saveConfiguracoes(config);
  
  if (supabaseClient) {
    syncToSupabase('config.save', config);
  }
}

// ==================== HARPA ====================

export async function getAllHarpa(): Promise<any[]> {
  return dbLocal.getAllHarpa();
}

export async function addHarpaItems(items: any[]): Promise<void> {
  await dbLocal.addHarpaItems(items);
  
  // Sincronizar com Supabase
  if (supabaseClient && items.length > 0) {
    for (const item of items) {
      try {
        await supabaseClient.from('harpa').upsert([item]);
      } catch (err) {
        console.warn('⚠️ Erro ao sincronizar Harpa:', err);
      }
    }
  }
}

// ==================== STATUS ====================

export function isSupabaseActive(): boolean {
  return !!supabaseClient;
}

export function getStorageStatus(): string {
  if (supabaseClient) {
    return '☁️ HÍBRIDO: Local + Supabase';
  }
  return '💻 LOCAL: Apenas IndexedDB';
}

console.log(`📦 Sistema de armazenamento: ${getStorageStatus()}`);
