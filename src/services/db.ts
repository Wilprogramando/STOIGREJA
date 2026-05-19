import { Hino, Repertorio, Configuracoes, HarpaItem } from '../types';

// Sistema simples e seguro - funciona sem Supabase
const DB_PREFIX = 'repertorio_igreja_';

// ==================== HINOS ====================

export async function addHino(hino: Hino): Promise<string> {
  const id = hino.id || crypto.randomUUID();
  const chave = `${DB_PREFIX}hino_${id}`;
  localStorage.setItem(chave, JSON.stringify(hino));
  console.log('✅ Hino salvo:', hino.nome);
  return id;
}

export async function updateHino(hino: Hino): Promise<void> {
  const chave = `${DB_PREFIX}hino_${hino.id}`;
  localStorage.setItem(chave, JSON.stringify(hino));
  console.log('✅ Hino atualizado');
}

export async function deleteHino(id: string): Promise<void> {
  const chave = `${DB_PREFIX}hino_${id}`;
  localStorage.removeItem(chave);
  console.log('✅ Hino deletado');
}

export async function getAllHinos(): Promise<Hino[]> {
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

export async function getHino(id: string): Promise<Hino | undefined> {
  const chave = `${DB_PREFIX}hino_${id}`;
  const dados = localStorage.getItem(chave);
  return dados ? JSON.parse(dados) : undefined;
}

// ==================== REPERTÓRIOS ====================

export async function addRepertorio(repertorio: Repertorio): Promise<string> {
  const id = repertorio.id || crypto.randomUUID();
  const chave = `${DB_PREFIX}repertorio_${id}`;
  localStorage.setItem(chave, JSON.stringify(repertorio));
  console.log('✅ Repertório salvo');
  return id;
}

export async function updateRepertorio(repertorio: Repertorio): Promise<void> {
  const chave = `${DB_PREFIX}repertorio_${repertorio.id}`;
  localStorage.setItem(chave, JSON.stringify(repertorio));
  console.log('✅ Repertório atualizado');
}

export async function deleteRepertorio(id: string): Promise<void> {
  const chave = `${DB_PREFIX}repertorio_${id}`;
  localStorage.removeItem(chave);
  console.log('✅ Repertório deletado');
}

export async function getAllRepertorios(): Promise<Repertorio[]> {
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

// ==================== CONFIGURAÇÕES ====================

export async function getConfiguracoes(): Promise<Configuracoes | null> {
  const chave = `${DB_PREFIX}config`;
  const dados = localStorage.getItem(chave);
  return dados ? JSON.parse(dados) : null;
}

export async function saveConfiguracoes(config: Configuracoes): Promise<void> {
  const chave = `${DB_PREFIX}config`;
  config.id = 'config';
  localStorage.setItem(chave, JSON.stringify(config));
  console.log('✅ Configurações salvas');
}

// ==================== HARPA ====================

export async function getAllHarpa(): Promise<HarpaItem[]> {
  const chave = `${DB_PREFIX}harpa_list`;
  const dados = localStorage.getItem(chave);
  return dados ? JSON.parse(dados) : [];
}

export async function addHarpaItems(items: HarpaItem[]): Promise<void> {
  const chave = `${DB_PREFIX}harpa_list`;
  const existentes = await getAllHarpa();
  const todosItems = [...existentes, ...items];
  localStorage.setItem(chave, JSON.stringify(todosItems));
  console.log('✅ Harpa salva');
}

export async function getHarpaItem(numero: number): Promise<HarpaItem | undefined> {
  const harpa = await getAllHarpa();
  return harpa.find(h => h.numero === numero);
}

// ==================== IMPORTAR CSV ====================

export async function importHinosFromCSV(csvText: string): Promise<{ success: number; errors: string[] }> {
  const lines = csvText.trim().split('\n');
  let success = 0;
  const errorList: string[] = [];
  const items: HarpaItem[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = line.split('\t').length > 1 ? line.split('\t') : line.split(',');
    
    if (parts.length < 2) {
      errorList.push(`Linha ${i}: Formato inválido`);
      continue;
    }

    try {
      const numero = parseInt(parts[0]?.trim() || '0') || null;
      const nome = parts[1]?.trim() || '';
      
      if (nome) {
        items.push({ numero, nome });
        success++;
      }
    } catch {
      errorList.push(`Linha ${i}: Erro ao processar`);
    }
  }

  if (items.length > 0) {
    await addHarpaItems(items);
  }

  console.log(`✅ Importado: ${success} | ❌ Erros: ${errorList.length}`);
  return { success, errors: errorList };
}

// ==================== OUTROS ====================

export async function getHinosByType(tipo: string): Promise<Hino[]> {
  const todos = await getAllHinos();
  return todos.filter(h => h.tipo === tipo);
}

export async function clearAllData(): Promise<void> {
  const chaves: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const chave = localStorage.key(i);
    if (chave && chave.startsWith(DB_PREFIX)) {
      chaves.push(chave);
    }
  }
  chaves.forEach(chave => localStorage.removeItem(chave));
  console.log('✅ Todos os dados deletados');
}

export async function exportData(): Promise<void> {
  console.log('📦 Exportando dados...');
}

export async function importData(data: any): Promise<void> {
  console.log('📦 Importando dados...');
}

// ==================== FUNÇÕES ADICIONAIS ====================

export async function initializeHarpaBase(): Promise<void> {
  const harpaData = await getAllHarpa();
  if (harpaData.length === 0) {
    console.log('📚 Harpa já inicializada ou vazia');
  }
}

export async function getHarpaByNumber(numero: number): Promise<HarpaItem | undefined> {
  return await getHarpaItem(numero);
}
