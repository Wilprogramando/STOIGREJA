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
