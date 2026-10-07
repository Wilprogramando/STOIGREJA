/**
 * O QUE APARECE NO DASHBOARD
 *
 * Cada pedaço da tela inicial (saudação, repertórios, escala, números...) pode
 * ser ligado ou desligado em Configurações > O que aparece no Dashboard.
 *
 * Fica no localStorage, igual aos menus desligados (services/menus.ts): é a
 * escolha de quem usa aquele aparelho e não precisa de coluna nova no banco.
 */

export interface BlocoDoDashboard {
  id: string;
  nome: string;
  descricao: string;
  /** Blocos que começam desligados, para quem quiser mostrar a mais. */
  ocultoDeFabrica?: boolean;
}

export const BLOCOS: BlocoDoDashboard[] = [
  {
    id: 'saudacao',
    nome: 'Saudação e versículo',
    descricao: '"Paz do Senhor!" com o versículo que vai sendo escrito',
  },
  {
    id: 'repertorios',
    nome: 'Próximos Repertórios',
    descricao: 'Os cultos já montados que ainda vão acontecer',
  },
  {
    id: 'escala',
    nome: 'Escala de Conjunto',
    descricao: 'Calendário com os dias marcados de cada conjunto',
  },
  {
    id: 'numeros',
    nome: 'Números',
    descricao: 'Quantidade de hinos comuns e de hinos da Harpa',
  },
  {
    id: 'mais-cantados',
    nome: 'Mais cantados',
    descricao: 'Ranking dos hinos dos últimos 30 dias',
  },
  {
    id: 'acoes',
    nome: 'Ações rápidas',
    descricao: 'Botões de atalho para as telas mais usadas',
  },
  {
    id: 'anotacoes',
    nome: 'Últimas anotações',
    descricao: 'Sugestões de hinos guardadas nas Anotações',
    ocultoDeFabrica: true,
  },
];

const CHAVE = 'repertorio:blocosDashboard';

/** Blocos desligados por quem usa este aparelho. */
export function lerBlocosOcultos(): string[] {
  try {
    const bruto = localStorage.getItem(CHAVE);
    if (bruto === null) {
      // Primeira vez: valem os que já nascem desligados.
      return BLOCOS.filter(b => b.ocultoDeFabrica).map(b => b.id);
    }

    const lista = JSON.parse(bruto);
    return Array.isArray(lista) ? lista.filter(id => typeof id === 'string') : [];
  } catch {
    return BLOCOS.filter(b => b.ocultoDeFabrica).map(b => b.id);
  }
}

export function salvarBlocosOcultos(ocultos: string[]): string[] {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(ocultos));
  } catch (erro) {
    console.error('Não foi possível guardar o que aparece no Dashboard:', erro);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('repertorio-dashboard-mudou'));
  }

  return ocultos;
}

/** Liga ou desliga um pedaço da tela inicial e devolve a lista nova. */
export function alternarBloco(id: string): string[] {
  const ocultos = lerBlocosOcultos();
  return salvarBlocosOcultos(
    ocultos.includes(id) ? ocultos.filter(i => i !== id) : [...ocultos, id]
  );
}

export function blocoVisivel(id: string, ocultos?: string[]): boolean {
  return !(ocultos || lerBlocosOcultos()).includes(id);
}

/** Volta para o que vem de fábrica. */
export function limparBlocos(): string[] {
  return salvarBlocosOcultos(BLOCOS.filter(b => b.ocultoDeFabrica).map(b => b.id));
}

/**
 * Avisa quando a escolha mudar - o Dashboard fica ouvindo para a troca
 * aparecer na hora, sem precisar sair da tela e voltar.
 */
export function ouvirBlocos(aoMudar: () => void): () => void {
  if (typeof window === 'undefined') return () => {};

  window.addEventListener('repertorio-dashboard-mudou', aoMudar);
  return () => window.removeEventListener('repertorio-dashboard-mudou', aoMudar);
}
