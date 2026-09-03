import { createClient } from '@supabase/supabase-js';
import { Hino, Repertorio, Configuracoes, HarpaItem, Anotacao } from '../types';
import {
  CACHE_HINOS,
  CACHE_REPERTORIOS,
  CACHE_CONFIG,
  CACHE_HARPA,
  CACHE_ANOTACOES,
  CACHE_CANTORES,
  OperacaoPendente,
  cacheSalvar,
  cacheLer,
  cacheLimpar,
  estaOnline,
  filaAdicionar,
  filaProcessar,
  filaTamanho
} from './offline';

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

// ==================== SUPORTE OFFLINE ====================

/** Monta o payload do hino no formato das colunas do Supabase. */
function payloadHino(hino: Hino, comId: boolean) {
  const dados: any = {
    nome: hino.nome,
    tom: hino.tom,
    cantor: hino.cantor,
    letra: hino.letra || '',
    categoria: hino.categoria,
    observacoes: hino.observacoes || '',
    tipo: hino.tipo || 'comum',
    numero_harpa: hino.numeroHarpa || null,
    atualizado_em: new Date().toISOString()
  };
  if (comId) {
    dados.id = hino.id;
    dados.criado_em = hino.criadoEm || new Date().toISOString();
  }
  return dados;
}

/** Extrai apenas os IDs dos hinos - compatível com strings e objetos. */
function idsDosHinos(repertorio: Repertorio): string[] {
  return (
    repertorio.hinos
      ?.map((h: any) => {
        if (typeof h === 'string') return h;
        if (typeof h === 'object' && h.hinoId) return h.hinoId;
        if (typeof h === 'object' && h.id) return h.id;
        return null;
      })
      .filter(Boolean) || []
  );
}

function payloadRepertorio(repertorio: Repertorio, comId: boolean) {
  const dados: any = {
    nome: repertorio.nome,
    data_culto: repertorio.data,
    horario_culto: repertorio.horario || '',
    observacoes: repertorio.observacoes || '',
    lista_hinos: idsDosHinos(repertorio),
    atualizado_em: new Date().toISOString()
  };
  if (comId) {
    dados.id = repertorio.id;
    dados.criado_em = repertorio.criadoEm || new Date().toISOString();
  }
  return dados;
}

function payloadConfig(config: Configuracoes) {
  return {
    id: config.id || 'config',
    nome_igreja: config.nomeIgreja || '',
    nome_responsavel: config.responsavel || '',
    rodape_pdf: config.rodapePdf || '',
    logo_igreja: config.logo || null,
    titulo_sistema: config.tituloSistema || 'Repertório da Igreja',
    logo_sistema: config.logoSistema || null,
    subtitulo_sistema: config.subtitulo || 'Gerenciador de hinos e cultos',
    created_at: new Date().toISOString()
  };
}

function payloadAnotacao(anotacao: Anotacao) {
  return {
    id: anotacao.id,
    hino: anotacao.hino,
    cantor: anotacao.cantor || '',
    tom: anotacao.tom || '',
    observacoes: anotacao.observacoes || '',
    criado_em: anotacao.criadoEm || new Date().toISOString()
  };
}

/** Executa no Supabase uma operação da fila (ou uma recém-criada). */
async function executarNoSupabase(op: OperacaoPendente): Promise<void> {
  if (!supabase) throw new Error('Supabase não configurado');

  const falhar = (error: any) => {
    if (error) throw error;
  };

  switch (op.tipo) {
    case 'hino.add':
      falhar((await supabase.from('hinos_cadastro').insert([payloadHino(op.dados, true)])).error);
      return;
    case 'hino.update':
      falhar(
        (
          await supabase
            .from('hinos_cadastro')
            .update(payloadHino(op.dados, false))
            .eq('id', op.dados.id)
        ).error
      );
      return;
    case 'hino.delete':
      falhar((await supabase.from('hinos_cadastro').delete().eq('id', op.dados)).error);
      return;
    case 'repertorio.add':
      falhar(
        (await supabase.from('repertorios_cultos').insert([payloadRepertorio(op.dados, true)])).error
      );
      return;
    case 'repertorio.update':
      falhar(
        (
          await supabase
            .from('repertorios_cultos')
            .update(payloadRepertorio(op.dados, false))
            .eq('id', op.dados.id)
        ).error
      );
      return;
    case 'repertorio.delete':
      falhar((await supabase.from('repertorios_cultos').delete().eq('id', op.dados)).error);
      return;
    case 'config.save':
      falhar(
        (
          await supabase
            .from('configuracoes_sistema')
            .upsert([payloadConfig(op.dados)], { onConflict: 'id' })
        ).error
      );
      return;
    case 'anotacao.upsert':
      falhar(
        (
          await supabase
            .from('anotacoes_hinos')
            .upsert([payloadAnotacao(op.dados)], { onConflict: 'id' })
        ).error
      );
      return;
    case 'cantor.add':
      falhar(
        (
          await supabase
            .from('cantores')
            .upsert([{ nome: op.dados }], { onConflict: 'nome' })
        ).error
      );
      return;
    case 'cantor.delete':
      falhar((await supabase.from('cantores').delete().eq('nome', op.dados)).error);
      return;
    case 'anotacao.delete':
      falhar((await supabase.from('anotacoes_hinos').delete().eq('id', op.dados)).error);
      return;
    case 'harpa.add':
      falhar(
        (
          await supabase.from('harpa_cristaa').insert(
            (op.dados as HarpaItem[]).map(item => ({
              numero_harpa: item.numero,
              nome_hino: item.nome
            }))
          )
        ).error
      );
      return;
    default:
      console.warn('⚠️ Operação desconhecida na fila:', op.tipo);
  }
}

/**
 * Tenta gravar no Supabase. Se estiver sem internet (ou a chamada falhar),
 * guarda a operação na fila para enviar quando a conexão voltar - sem quebrar a tela.
 */
async function gravar(tipo: string, dados: any): Promise<void> {
  if (!supabase) return;

  if (!estaOnline()) {
    filaAdicionar(tipo, dados);
    return;
  }

  try {
    await executarNoSupabase({ id: 'agora', tipo, dados, criadoEm: new Date().toISOString() });
  } catch (error) {
    console.warn(`⚠️ Falha ao enviar "${tipo}", guardando para sincronizar depois:`, error);
    filaAdicionar(tipo, dados);
  }
}

/** Envia para o Supabase tudo que foi feito offline. */
export async function sincronizarPendentes(): Promise<number> {
  if (!supabase) return 0;
  return filaProcessar(executarNoSupabase);
}

/** Quantas alterações ainda não subiram para a nuvem. */
export function alteracoesPendentes(): number {
  return filaTamanho();
}

// Sincroniza sozinho assim que a internet voltar.
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    sincronizarPendentes();
  });
}

// ==================== HINOS ====================

export async function addHino(hino: Hino): Promise<string> {
  try {
    // Grava sempre na cópia local primeiro - assim funciona com ou sem internet.
    const hinos = cacheLer<Hino[]>(CACHE_HINOS) || [];
    cacheSalvar(CACHE_HINOS, [...hinos.filter(h => h.id !== hino.id), hino]);

    if (supabase) {
      await gravar('hino.add', hino);
    } else {
      const chave = `${DB_PREFIX}hino_${hino.id}`;
      localStorage.setItem(chave, JSON.stringify(hino));
    }

    console.log('✅ Hino salvo:', hino.nome);
    return hino.id;
  } catch (error) {
    console.error('❌ Erro ao salvar hino:', error);
    throw error;
  }
}

// ✅ Helper para mapear dados do Supabase para Hino
function mapearHinoSupabase(dados: any): Hino {
  const hino: Hino = {
    id: dados.id,
    nome: dados.nome,
    tom: dados.tom,
    cantor: dados.cantor,
    letra: dados.letra || '',
    categoria: dados.categoria || '',
    observacoes: dados.observacoes || '',
    tipo: dados.tipo || 'comum',
    numeroHarpa: dados.numero_harpa ? parseInt(String(dados.numero_harpa)) : undefined,
    criadoEm: dados.criado_em || new Date().toISOString(),
    atualizadoEm: dados.atualizado_em || new Date().toISOString()
  };
  
  if (dados.numero_harpa) {
    console.log(`🎵 Mapeando Harpa ${dados.numero_harpa}:`, hino.nome);
  }
  
  return hino;
}

export async function getAllHinos(): Promise<Hino[]> {
  try {
    if (supabase) {
      if (!estaOnline()) {
        const local = cacheLer<Hino[]>(CACHE_HINOS);
        console.log('📴 Offline: usando hinos salvos no aparelho:', local?.length || 0);
        return local || [];
      }

      // Aproveita a conexão para subir o que ficou pendente.
      await sincronizarPendentes();

      const { data, error } = await supabase
        .from('hinos_cadastro')
        .select('*')
        .order('nome', { ascending: true });

      if (error) throw error;

      const hinos = (data || []).map(mapearHinoSupabase);

      cacheSalvar(CACHE_HINOS, hinos);
      console.log('✅ Hinos carregados:', hinos.length);
      return hinos;
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
    console.error('❌ Erro ao carregar hinos, usando cópia local:', error);
    return cacheLer<Hino[]>(CACHE_HINOS) || [];
  }
}

export async function getHino(id: string): Promise<Hino | undefined> {
  try {
    if (supabase) {
      if (!estaOnline()) {
        return (cacheLer<Hino[]>(CACHE_HINOS) || []).find(h => h.id === id);
      }

      const { data, error } = await supabase
        .from('hinos_cadastro')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data ? mapearHinoSupabase(data) : undefined;
    } else {
      const chave = `${DB_PREFIX}hino_${id}`;
      const dados = localStorage.getItem(chave);
      return dados ? JSON.parse(dados) : undefined;
    }
  } catch (error) {
    console.error('❌ Erro ao buscar hino, usando cópia local:', error);
    return (cacheLer<Hino[]>(CACHE_HINOS) || []).find(h => h.id === id);
  }
}

export async function updateHino(hino: Hino): Promise<void> {
  try {
    const hinos = cacheLer<Hino[]>(CACHE_HINOS) || [];
    cacheSalvar(CACHE_HINOS, hinos.map(h => (h.id === hino.id ? hino : h)));

    if (supabase) {
      await gravar('hino.update', hino);
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
    const hinos = cacheLer<Hino[]>(CACHE_HINOS) || [];
    cacheSalvar(CACHE_HINOS, hinos.filter(h => h.id !== id));

    if (supabase) {
      await gravar('hino.delete', id);
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

// ✅ CORRIGIDO: Agora mapeia corretamente!
export async function getHinosByType(tipo: string): Promise<Hino[]> {
  try {
    if (supabase) {
      if (!estaOnline()) {
        return (cacheLer<Hino[]>(CACHE_HINOS) || []).filter(h => h.tipo === tipo);
      }

      const { data, error } = await supabase
        .from('hinos_cadastro')
        .select('*')
        .eq('tipo', tipo)
        .order('nome', { ascending: true });
      
      if (error) throw error;
      
      // ✅ MAPEAR CORRETAMENTE - Converter snake_case para camelCase
      const hinos = (data || []).map(mapearHinoSupabase);
      console.log(`✅ Hinos carregados (tipo: ${tipo}):`, hinos.length);
      if (hinos.length > 0) {
        console.log('📋 Detalhes dos hinos:', hinos.map(h => ({
          nome: h.nome,
          numeroHarpa: h.numeroHarpa,
          tipo: typeof h.numeroHarpa
        })));
      }
      return hinos;
    } else {
      const todos = await getAllHinos();
      return todos.filter(h => h.tipo === tipo);
    }
  } catch (error) {
    console.error('❌ Erro ao buscar hinos por tipo, usando cópia local:', error);
    return (cacheLer<Hino[]>(CACHE_HINOS) || []).filter(h => h.tipo === tipo);
  }
}

// ==================== REPERTÓRIOS ====================

export async function addRepertorio(repertorio: Repertorio): Promise<string> {
  try {
    const listaLocal: Repertorio = { ...repertorio, hinos: idsDosHinos(repertorio) as any };
    const repertoriosCache = cacheLer<Repertorio[]>(CACHE_REPERTORIOS) || [];
    cacheSalvar(CACHE_REPERTORIOS, [
      ...repertoriosCache.filter(r => r.id !== listaLocal.id),
      listaLocal
    ]);

    if (supabase) {
      await gravar('repertorio.add', repertorio);
      console.log('✅ Repertório salvo com', listaLocal.hinos.length, 'hinos');
      return repertorio.id;
    }

    const chave = `${DB_PREFIX}repertorio_${repertorio.id}`;
    localStorage.setItem(chave, JSON.stringify(repertorio));
    return repertorio.id;
  } catch (error) {
    console.error('❌ Erro ao salvar repertório:', error);
    throw error;
  }
}

export async function getAllRepertorios(): Promise<Repertorio[]> {
  try {
    if (supabase) {
      if (!estaOnline()) {
        const local = cacheLer<Repertorio[]>(CACHE_REPERTORIOS);
        console.log('📴 Offline: usando repertórios salvos no aparelho:', local?.length || 0);
        return local || [];
      }

      await sincronizarPendentes();

      const { data, error } = await supabase
        .from('repertorios_cultos')
        .select('*')
        .order('data_culto', { ascending: false });

      if (error) throw error;

      const repertorios = (data || []).map((rep: any) => ({
        id: rep.id,
        nome: rep.nome,
        data: rep.data_culto,
        horario: rep.horario_culto,
        observacoes: rep.observacoes,
        hinos: Array.isArray(rep.lista_hinos) ? rep.lista_hinos : [],
        criadoEm: rep.criado_em,
        atualizadoEm: rep.atualizado_em
      }));

      cacheSalvar(CACHE_REPERTORIOS, repertorios);
      return repertorios;
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
    console.error('❌ Erro ao carregar repertórios, usando cópia local:', error);
    return cacheLer<Repertorio[]>(CACHE_REPERTORIOS) || [];
  }
}

export async function updateRepertorio(repertorio: Repertorio): Promise<void> {
  try {
    const atualizado: Repertorio = { ...repertorio, hinos: idsDosHinos(repertorio) as any };
    const repertoriosCache = cacheLer<Repertorio[]>(CACHE_REPERTORIOS) || [];
    cacheSalvar(
      CACHE_REPERTORIOS,
      repertoriosCache.map(r => (r.id === atualizado.id ? atualizado : r))
    );

    if (supabase) {
      await gravar('repertorio.update', repertorio);
      console.log('✅ Repertório atualizado com', atualizado.hinos.length, 'hinos');
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
    const repertoriosCache = cacheLer<Repertorio[]>(CACHE_REPERTORIOS) || [];
    cacheSalvar(CACHE_REPERTORIOS, repertoriosCache.filter(r => r.id !== id));

    if (supabase) {
      await gravar('repertorio.delete', id);
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
      if (!estaOnline()) {
        console.log('📴 Offline: usando configurações salvas no aparelho');
        return cacheLer<Configuracoes>(CACHE_CONFIG);
      }

      const { data, error } = await supabase
        .from('configuracoes_sistema')
        .select('*')
        .eq('id', 'config')
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') throw error;
      
      if (!data) return null;

      // Mapear de snake_case (banco) para camelCase (app)
      const config: Configuracoes = {
        id: data.id,
        nomeIgreja: data.nome_igreja || '',
        responsavel: data.nome_responsavel || '',
        rodapePdf: data.rodape_pdf || '',
        logo: data.logo_igreja || undefined,
        tituloSistema: data.titulo_sistema || 'Repertório da Igreja',
        logoSistema: data.logo_sistema || undefined,
        subtitulo: data.subtitulo_sistema || 'Gerenciador de hinos e cultos'
      };

      cacheSalvar(CACHE_CONFIG, config);
      console.log('✅ Configurações carregadas');
      return config;
    } else {
      const chave = `${DB_PREFIX}config`;
      const dados = localStorage.getItem(chave);
      return dados ? JSON.parse(dados) : null;
    }
  } catch (error) {
    console.error('❌ Erro ao carregar configurações, usando cópia local:', error);
    return cacheLer<Configuracoes>(CACHE_CONFIG);
  }
}

export async function saveConfiguracoes(config: Configuracoes): Promise<void> {
  try {
    // Garantir que tem um id
    const configComId: Configuracoes = { ...config, id: config.id || 'config' };
    cacheSalvar(CACHE_CONFIG, configComId);

    if (supabase) {
      await gravar('config.save', configComId);
      console.log('✅ Configurações salvas com sucesso');
    } else {
      const chave = `${DB_PREFIX}config`;
      config.id = config.id || 'config';
      localStorage.setItem(chave, JSON.stringify(config));
      console.log('✅ Configurações salvas localmente');
    }
  } catch (error) {
    console.error('❌ Erro ao salvar configurações:', error);
    throw error;
  }
}

// ==================== CANTORES ====================

/**
 * Lista de cantores compartilhada entre todos os aparelhos.
 * Sem internet (ou sem Supabase), usa a cópia guardada no aparelho.
 */
export async function getAllCantores(): Promise<string[]> {
  try {
    if (supabase) {
      if (!estaOnline()) {
        return cacheLer<string[]>(CACHE_CANTORES) || [];
      }

      await sincronizarPendentes();

      const { data, error } = await supabase
        .from('cantores')
        .select('nome')
        .order('nome', { ascending: true });

      if (error) throw error;

      const nomes = (data || []).map((linha: any) => linha.nome).filter(Boolean);
      cacheSalvar(CACHE_CANTORES, nomes);
      return nomes;
    }

    const chave = `${DB_PREFIX}cantores`;
    const dados = localStorage.getItem(chave);
    return dados ? JSON.parse(dados) : [];
  } catch (error) {
    console.error('❌ Erro ao carregar cantores, usando cópia local:', error);
    return cacheLer<string[]>(CACHE_CANTORES) || [];
  }
}

/** Guarda a lista inteira no aparelho, para funcionar offline. */
function salvarCantoresLocal(nomes: string[]): void {
  cacheSalvar(CACHE_CANTORES, nomes);
  if (!supabase) {
    localStorage.setItem(`${DB_PREFIX}cantores`, JSON.stringify(nomes));
  }
}

export async function addCantor(nome: string, listaAtualizada: string[]): Promise<void> {
  salvarCantoresLocal(listaAtualizada);
  if (supabase) await gravar('cantor.add', nome);
}

export async function deleteCantor(nome: string, listaAtualizada: string[]): Promise<void> {
  salvarCantoresLocal(listaAtualizada);
  if (supabase) await gravar('cantor.delete', nome);
}

// ==================== HARPA ====================

export async function getAllHarpa(): Promise<HarpaItem[]> {
  try {
    if (supabase) {
      if (!estaOnline()) {
        return cacheLer<HarpaItem[]>(CACHE_HARPA) || [];
      }

      const { data, error } = await supabase
        .from('harpa_cristaa')
        .select('*')
        .order('numero_harpa', { ascending: true });

      if (error) throw error;

      const harpa: HarpaItem[] =
        data?.map((item: any) => ({
          numero: item.numero_harpa,
          nome: item.nome_hino
        })) || [];

      cacheSalvar(CACHE_HARPA, harpa);
      console.log('✅ Harpa carregada:', harpa.length);
      return harpa;
    } else {
      const chave = `${DB_PREFIX}harpa_list`;
      const dados = localStorage.getItem(chave);
      return dados ? JSON.parse(dados) : [];
    }
  } catch (error) {
    console.error('❌ Erro ao carregar Harpa, usando cópia local:', error);
    return cacheLer<HarpaItem[]>(CACHE_HARPA) || [];
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
    const harpaCache = cacheLer<HarpaItem[]>(CACHE_HARPA) || [];
    const numerosNovos = new Set(items.map(i => i.numero));
    cacheSalvar(CACHE_HARPA, [...harpaCache.filter(h => !numerosNovos.has(h.numero)), ...items]);

    if (supabase) {
      await gravar('harpa.add', items);
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

// ==================== ANOTAÇÕES ====================

const CHAVE_ANOTACOES_ANTIGA = 'repertorio_igreja_anotacoes';

function mapearAnotacaoSupabase(dados: any): Anotacao {
  return {
    id: dados.id,
    hino: dados.hino || '',
    cantor: dados.cantor || '',
    tom: dados.tom || '',
    observacoes: dados.observacoes || '',
    criadoEm: dados.criado_em || new Date().toISOString()
  };
}

const ordenarAnotacoes = (lista: Anotacao[]) =>
  [...lista].sort((a, b) => (b.criadoEm || '').localeCompare(a.criadoEm || ''));

export async function getAllAnotacoes(): Promise<Anotacao[]> {
  try {
    if (supabase) {
      if (!estaOnline()) {
        return ordenarAnotacoes(cacheLer<Anotacao[]>(CACHE_ANOTACOES) || []);
      }

      await migrarAnotacoesAntigas();
      await sincronizarPendentes();

      const { data, error } = await supabase
        .from('anotacoes_hinos')
        .select('*')
        .order('criado_em', { ascending: false });

      if (error) throw error;

      const anotacoes = (data || []).map(mapearAnotacaoSupabase);
      cacheSalvar(CACHE_ANOTACOES, anotacoes);
      console.log('✅ Anotações carregadas:', anotacoes.length);
      return anotacoes;
    }

    return ordenarAnotacoes(cacheLer<Anotacao[]>(CACHE_ANOTACOES) || []);
  } catch (error) {
    console.error('❌ Erro ao carregar anotações, usando cópia local:', error);
    return ordenarAnotacoes(cacheLer<Anotacao[]>(CACHE_ANOTACOES) || []);
  }
}

export async function saveAnotacao(anotacao: Anotacao): Promise<Anotacao> {
  const anotacoes = cacheLer<Anotacao[]>(CACHE_ANOTACOES) || [];
  cacheSalvar(
    CACHE_ANOTACOES,
    ordenarAnotacoes([...anotacoes.filter(a => a.id !== anotacao.id), anotacao])
  );

  await gravar('anotacao.upsert', anotacao);
  console.log('✅ Anotação salva:', anotacao.hino);
  return anotacao;
}

export async function deleteAnotacao(id: string): Promise<void> {
  const anotacoes = cacheLer<Anotacao[]>(CACHE_ANOTACOES) || [];
  cacheSalvar(CACHE_ANOTACOES, anotacoes.filter(a => a.id !== id));

  await gravar('anotacao.delete', id);
  console.log('✅ Anotação excluída');
}

/** Sobe para o Supabase as anotações que ficaram só no aparelho (versão anterior). */
async function migrarAnotacoesAntigas(): Promise<void> {
  try {
    const dados = localStorage.getItem(CHAVE_ANOTACOES_ANTIGA);
    if (!dados) return;

    const antigas: Anotacao[] = JSON.parse(dados);
    if (!Array.isArray(antigas) || antigas.length === 0) {
      localStorage.removeItem(CHAVE_ANOTACOES_ANTIGA);
      return;
    }

    console.log('📤 Enviando', antigas.length, 'anotação(ões) do aparelho para o Supabase...');
    for (const anotacao of antigas) {
      await executarNoSupabase({
        id: 'migracao',
        tipo: 'anotacao.upsert',
        dados: anotacao,
        criadoEm: new Date().toISOString()
      });
    }

    localStorage.removeItem(CHAVE_ANOTACOES_ANTIGA);
    console.log('✅ Anotações antigas migradas');
  } catch (error) {
    // Se falhar, mantemos o dado local para tentar de novo depois.
    console.warn('⚠️ Não foi possível migrar as anotações antigas agora:', error);
  }
}

// ==================== IMPORT/EXPORT ====================

export async function importHinosFromCSV(csvText: string, tipoImportacao: 'harpa' | 'comum' = 'comum'): Promise<{ success: number; errors: string[] }> {
  const lines = csvText.trim().split('\n');
  let success = 0;
  const errorList: string[] = [];
  const items: Hino[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = line.split('\t').length > 1 ? line.split('\t') : line.split(',');
    
    try {
      let hino: Hino;

      if (tipoImportacao === 'harpa') {
        // Formato esperado: Numero;Nome;Tom;Letra do hino
        // Ou: Numero,Nome,Tom,Letra
        if (parts.length < 3) {
          errorList.push(`Linha ${i}: Formato inválido para Harpa (esperado: Numero;Nome;Tom;Letra)`);
          continue;
        }

        const numero = parseInt(parts[0]?.trim() || '0');
        if (isNaN(numero) || numero <= 0) {
          errorList.push(`Linha ${i}: Número inválido: ${parts[0]}`);
          continue;
        }

        hino = {
          id: `hino_harpa_${Date.now()}_${i}`,
          nome: parts[1]?.trim() || `Hino nº ${numero}`,
          tom: parts[2]?.trim() || 'C',
          cantor: parts[3]?.trim() || 'Coral',
          categoria: parts[4]?.trim() || 'Louvor',
          tipo: 'harpa',
          letra: parts[4]?.trim() || '',  // Usa coluna 4 como letra se disponível
          numeroHarpa: numero,  // ✅ Aqui está sendo atribuído!
          observacoes: '',
          criadoEm: new Date().toISOString(),
          atualizadoEm: new Date().toISOString()
        };

        console.log(`✅ Hino importado: Harpa ${numero} - ${hino.nome}`);
      } else {
        // Formato: Nome\tTom\tCantor\tCategoria\tObservações
        if (parts.length < 1) {
          errorList.push(`Linha ${i}: Formato inválido`);
          continue;
        }

        hino = {
          id: `hino_comum_${Date.now()}_${i}`,
          nome: parts[0]?.trim() || '',
          tom: parts[1]?.trim() || 'C',
          cantor: parts[2]?.trim() || 'Coral',
          categoria: parts[3]?.trim() || 'Manancial',
          tipo: 'comum',
          letra: '',
          observacoes: parts[4]?.trim() || '',
          criadoEm: new Date().toISOString(),
          atualizadoEm: new Date().toISOString()
        };
      }

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
    cacheLimpar();

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

export async function exportData(): Promise<any> {
  try {
    const hinos = await getAllHinos();
    const repertorios = await getAllRepertorios();
    const config = await getConfiguracoes();

    const backupData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      data: {
        hinos,
        repertorios,
        configuracoes: config || {}
      }
    };

    console.log('✅ Dados exportados com sucesso');
    return backupData;
  } catch (error) {
    console.error('❌ Erro ao exportar dados:', error);
    throw error;
  }
}

export async function importData(backupData: any): Promise<void> {
  try {
    // Validar estrutura do backup
    if (!backupData.data || !Array.isArray(backupData.data.hinos)) {
      throw new Error('Formato de backup inválido');
    }

    // Limpar dados antigos
    await clearAllData();

    // Restaurar hinos
    const hinos = backupData.data.hinos || [];
    for (const hino of hinos) {
      try {
        await addHino(hino);
      } catch (err) {
        console.warn('Erro ao importar hino:', hino.nome, err);
      }
    }

    // Restaurar repertórios
    const repertorios = backupData.data.repertorios || [];
    for (const rep of repertorios) {
      try {
        await addRepertorio(rep);
      } catch (err) {
        console.warn('Erro ao importar repertório:', rep.nome, err);
      }
    }

    // Restaurar configurações
    if (backupData.data.configuracoes && backupData.data.configuracoes.id) {
      try {
        await saveConfiguracoes(backupData.data.configuracoes);
      } catch (err) {
        console.warn('Erro ao importar configurações:', err);
      }
    }

    console.log('✅ Dados importados com sucesso');
  } catch (error) {
    console.error('❌ Erro ao importar dados:', error);
    throw error;
  }
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
