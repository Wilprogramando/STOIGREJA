/**
 * MENUS DO SISTEMA
 *
 * Lista única das telas que podem ser ligadas/desligadas nas configurações.
 * Dashboard e Configurações ficam de fora: sem elas não dá para voltar atrás.
 */

export interface MenuDoSistema {
  id: string;
  label: string;
  /** Telas que não podem ser desligadas. */
  fixo?: boolean;
}

export const MENUS: MenuDoSistema[] = [
  { id: 'dashboard', label: 'Dashboard', fixo: true },
  { id: 'cadastrar-hino', label: 'Cadastrar Hino' },
  { id: 'harpa', label: 'Hinos da Harpa' },
  { id: 'buscar-musica', label: 'Buscar Música' },
  { id: 'montar-repertorio', label: 'Montar Repertório' },
  { id: 'repertorios', label: 'Repertórios Salvos' },
  { id: 'campo-harmonico', label: 'Dicas' },
  { id: 'relatorios', label: 'Relatórios' },
  { id: 'afinador', label: 'Afinador' },
  { id: 'anotacoes', label: 'Anotações' },
  { id: 'configuracoes', label: 'Configurações', fixo: true },
];

const CHAVE = 'repertorio:menusOcultos';

/**
 * Fica no localStorage, e não na tabela de configurações do Supabase:
 * assim nenhuma coluna nova precisa ser criada no banco.
 */
export function lerMenusOcultos(): string[] {
  try {
    const bruto = localStorage.getItem(CHAVE);
    const lista = bruto ? JSON.parse(bruto) : [];
    return Array.isArray(lista) ? lista : [];
  } catch {
    return [];
  }
}

export function salvarMenusOcultos(ocultos: string[]): void {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(ocultos));
  } catch (erro) {
    console.error('Não foi possível salvar os menus:', erro);
  }
}

// ==================== NOMES DOS MENUS ====================

const CHAVE_NOMES = 'repertorio:nomesMenus';

/**
 * Nomes trocados pelo usuário (Configurações > Nomes dos Menus).
 * Guardado como { id: "nome novo" }; quem não foi trocado usa o nome de fábrica.
 */
export function lerNomesMenus(): Record<string, string> {
  try {
    const bruto = localStorage.getItem(CHAVE_NOMES);
    const dados = bruto ? JSON.parse(bruto) : {};
    return dados && typeof dados === 'object' && !Array.isArray(dados) ? dados : {};
  } catch {
    return {};
  }
}

export function salvarNomesMenus(nomes: Record<string, string>): void {
  try {
    localStorage.setItem(CHAVE_NOMES, JSON.stringify(nomes));
  } catch (erro) {
    console.error('Não foi possível salvar os nomes dos menus:', erro);
  }
}

/** Troca o nome de uma tela. Nome vazio volta para o de fábrica. */
export function salvarNomeMenu(id: string, nome: string): Record<string, string> {
  const nomes = lerNomesMenus();
  const limpo = (nome || '').trim();
  const padrao = MENUS.find(m => m.id === id)?.label || '';

  if (!limpo || limpo === padrao) {
    delete nomes[id];
  } else {
    nomes[id] = limpo;
  }

  salvarNomesMenus(nomes);
  return nomes;
}

export function limparNomesMenus(): void {
  try {
    localStorage.removeItem(CHAVE_NOMES);
  } catch (erro) {
    console.error('Não foi possível restaurar os nomes dos menus:', erro);
  }
}

/** Nome que deve aparecer na tela para esta seção do menu. */
export function rotuloDoMenu(id: string, nomes?: Record<string, string>): string {
  const escolhidos = nomes || lerNomesMenus();
  const padrao = MENUS.find(m => m.id === id)?.label || '';
  return (escolhidos[id] || '').trim() || padrao;
}

// ==================== ORDEM DO MENU ====================

const CHAVE_ORDEM = 'repertorio:ordemMenus';

/**
 * Ordem escolhida pelo usuário (arrastando nas Configurações).
 * Fica no localStorage, igual aos menus desligados: nenhuma coluna nova no banco.
 */
export function lerOrdemMenus(): string[] {
  try {
    const bruto = localStorage.getItem(CHAVE_ORDEM);
    const lista = bruto ? JSON.parse(bruto) : [];
    return Array.isArray(lista) ? lista.filter(id => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

export function salvarOrdemMenus(ordem: string[]): void {
  try {
    localStorage.setItem(CHAVE_ORDEM, JSON.stringify(ordem));
  } catch (erro) {
    console.error('Não foi possível salvar a ordem dos menus:', erro);
  }
}

/** Volta para a ordem original de fábrica. */
export function limparOrdemMenus(): void {
  try {
    localStorage.removeItem(CHAVE_ORDEM);
  } catch (erro) {
    console.error('Não foi possível restaurar a ordem dos menus:', erro);
  }
}

/**
 * MENUS na ordem escolhida pelo usuário.
 *
 * Telas que não estão na ordem salva (por exemplo uma tela nova, criada depois
 * que ele arrastou) entram no fim, na ordem de fábrica — assim nada some.
 */
export function menusOrdenados(ordem?: string[]): MenuDoSistema[] {
  const escolhida = ordem || lerOrdemMenus();
  if (escolhida.length === 0) return [...MENUS];

  const naOrdem = escolhida
    .map(id => MENUS.find(m => m.id === id))
    .filter((m): m is MenuDoSistema => Boolean(m));

  const resto = MENUS.filter(m => !naOrdem.includes(m));

  return [...naOrdem, ...resto];
}

/**
 * Coloca uma lista qualquer de itens com id na ordem escolhida pelo usuário.
 * Usado pela barra lateral, que tem os ícones de cada tela.
 */
export function ordenarPorMenu<T extends { id: string }>(itens: T[], ordem?: string[]): T[] {
  const ids = menusOrdenados(ordem).map(m => m.id);

  return [...itens].sort((a, b) => {
    const posA = ids.indexOf(a.id);
    const posB = ids.indexOf(b.id);
    return (posA === -1 ? ids.length : posA) - (posB === -1 ? ids.length : posB);
  });
}

/** A tela está liberada? */
export function menuVisivel(id: string, ocultos?: string[]): boolean {
  const menu = MENUS.find(m => m.id === id);
  if (menu?.fixo) return true;
  return !(ocultos || []).includes(id);
}
