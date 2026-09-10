/**
 * APARÊNCIA DO SISTEMA
 *
 * Cor do cabeçalho, lado da logo, modo noturno, cantos e densidade.
 *
 * A escolha vira atributos no <html> (data-cor, data-modo, ...) e o arquivo
 * tema.css faz o resto. Assim a troca é instantânea, sem recarregar a página,
 * e nenhuma tela precisa saber que existe um tema.
 */

export type PosicaoLogo = 'esquerda' | 'direita';
export type ModoCor = 'claro' | 'escuro' | 'automatico';
export type Densidade = 'confortavel' | 'compacto';
export type EstiloCabecalho = 'onda' | 'reto' | 'curvo';

export interface Tema {
  /** Id da paleta (ver PALETAS). */
  cor: string;
  posicaoLogo: PosicaoLogo;
  modo: ModoCor;
  densidade: Densidade;
  cabecalho: EstiloCabecalho;
  /** Cantos arredondados nos cartões e botões. */
  arredondado: boolean;
}

export interface Paleta {
  id: string;
  nome: string;
  /** Cor principal (botões, item ativo do menu). */
  principal: string;
  /** Tom mais escuro, usado no hover e no fim do degradê. */
  escura: string;
  /** Fundo bem claro das etiquetas. */
  clara: string;
}

export const PALETAS: Paleta[] = [
  { id: 'indigo', nome: 'Índigo', principal: '#4f46e5', escura: '#7c3aed', clara: '#eef2ff' },
  { id: 'azul', nome: 'Azul', principal: '#2563eb', escura: '#1d4ed8', clara: '#eff6ff' },
  { id: 'verde', nome: 'Verde', principal: '#059669', escura: '#047857', clara: '#ecfdf5' },
  { id: 'petroleo', nome: 'Petróleo', principal: '#0f766e', escura: '#115e59', clara: '#f0fdfa' },
  { id: 'vinho', nome: 'Vinho', principal: '#9d174d', escura: '#831843', clara: '#fdf2f8' },
  { id: 'vermelho', nome: 'Vermelho', principal: '#dc2626', escura: '#b91c1c', clara: '#fef2f2' },
  { id: 'ambar', nome: 'Âmbar', principal: '#d97706', escura: '#b45309', clara: '#fffbeb' },
  { id: 'roxo', nome: 'Roxo', principal: '#7e22ce', escura: '#6b21a8', clara: '#faf5ff' },
  { id: 'grafite', nome: 'Grafite', principal: '#334155', escura: '#1e293b', clara: '#f1f5f9' },
];

export const TEMA_PADRAO: Tema = {
  cor: 'indigo',
  posicaoLogo: 'esquerda',
  modo: 'claro',
  densidade: 'confortavel',
  cabecalho: 'onda',
  arredondado: true,
};

const CHAVE = 'repertorio:tema';

export function lerTema(): Tema {
  try {
    const bruto = localStorage.getItem(CHAVE);
    if (!bruto) return { ...TEMA_PADRAO };

    const salvo = JSON.parse(bruto) || {};
    return { ...TEMA_PADRAO, ...salvo };
  } catch {
    return { ...TEMA_PADRAO };
  }
}

export function salvarTema(tema: Tema): Tema {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(tema));
  } catch (erro) {
    console.error('Não foi possível guardar a aparência:', erro);
  }

  aplicarTema(tema);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('repertorio-tema-mudou'));
  }

  return tema;
}

export function paletaDe(id: string): Paleta {
  return PALETAS.find(p => p.id === id) || PALETAS[0];
}

/** O sistema está no escuro agora? (leva em conta o modo automático) */
export function estaEscuro(tema: Tema): boolean {
  if (tema.modo === 'escuro') return true;
  if (tema.modo === 'claro') return false;

  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  } catch {
    return false;
  }
}

/**
 * Escreve a escolha no <html>. O CSS do tema faz o resto.
 */
export function aplicarTema(tema: Tema = lerTema()): void {
  if (typeof document === 'undefined') return;

  const html = document.documentElement;
  const paleta = paletaDe(tema.cor);

  html.dataset.cor = paleta.id;
  html.dataset.modo = estaEscuro(tema) ? 'escuro' : 'claro';
  html.dataset.densidade = tema.densidade;
  html.dataset.cabecalho = tema.cabecalho;
  html.dataset.arredondado = tema.arredondado ? 'sim' : 'nao';

  html.style.setProperty('--cor-principal', paleta.principal);
  html.style.setProperty('--cor-escura', paleta.escura);
  html.style.setProperty('--cor-clara', paleta.clara);

  // Barra do navegador no celular acompanha o cabeçalho.
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', paleta.principal);
}

/**
 * No modo automático o sistema acompanha o aparelho: se o celular virar
 * noturno à noite, o app vira junto, sem precisar mexer nas configurações.
 */
export function acompanharAparelho(): () => void {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};

  const consulta = window.matchMedia('(prefers-color-scheme: dark)');
  const aoMudar = () => {
    if (lerTema().modo === 'automatico') aplicarTema();
  };

  consulta.addEventListener('change', aoMudar);
  return () => consulta.removeEventListener('change', aoMudar);
}
