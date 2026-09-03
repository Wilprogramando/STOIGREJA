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

/** A tela está liberada? */
export function menuVisivel(id: string, ocultos?: string[]): boolean {
  const menu = MENUS.find(m => m.id === id);
  if (menu?.fixo) return true;
  return !(ocultos || []).includes(id);
}
