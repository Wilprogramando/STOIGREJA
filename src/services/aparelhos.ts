/**
 * APARELHOS
 *
 * Cada celular/computador que abre o sistema ganha um código próprio e um
 * nome (detectado automaticamente e editável nas Configurações). Os acessos
 * vão para a tabela "acessos_aparelhos" do Supabase, para as Configurações
 * mostrarem quantos acessos cada aparelho teve no último mês.
 */

import {
  registrarAcessoAparelho,
  renomearAparelho as renomearAparelhoNoBanco,
  getAcessosAparelhos,
  AcessoAparelho,
} from './db';

const CHAVE_ID = 'repertorio:aparelho-id';
const CHAVE_NOME = 'repertorio:aparelho-nome';

/** Resumo de um aparelho no período consultado. */
export interface ResumoAparelho {
  aparelhoId: string;
  nome: string;
  acessos: number;
  dias: number;
  ultimoAcesso: string;
  esteAparelho: boolean;
}

/** Nome sugerido a partir do navegador/sistema, ex.: "Android · Chrome". */
function nomeSugerido(): string {
  const ua = navigator.userAgent || '';

  const sistema =
    /Android/i.test(ua) ? 'Android' :
    /iPhone/i.test(ua) ? 'iPhone' :
    /iPad/i.test(ua) ? 'iPad' :
    /Windows/i.test(ua) ? 'Windows' :
    /Mac OS X/i.test(ua) ? 'Mac' :
    /Linux/i.test(ua) ? 'Linux' :
    'Aparelho';

  const navegador =
    /Edg\//i.test(ua) ? 'Edge' :
    /OPR\//i.test(ua) ? 'Opera' :
    /Firefox\//i.test(ua) ? 'Firefox' :
    /Chrome\//i.test(ua) ? 'Chrome' :
    /Safari\//i.test(ua) ? 'Safari' :
    '';

  return navegador ? `${sistema} · ${navegador}` : sistema;
}

function codigoNovo(): string {
  try {
    if (crypto?.randomUUID) return crypto.randomUUID();
  } catch {
    /* navegador antigo: cai no código abaixo */
  }
  return `ap-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Código deste aparelho, criado na primeira vez que o sistema é aberto. */
export function idDesteAparelho(): string {
  try {
    const salvo = localStorage.getItem(CHAVE_ID);
    if (salvo) return salvo;

    const novo = codigoNovo();
    localStorage.setItem(CHAVE_ID, novo);
    return novo;
  } catch {
    return 'aparelho-sem-armazenamento';
  }
}

/** Nome deste aparelho: o escolhido nas Configurações ou o sugerido. */
export function nomeDesteAparelho(): string {
  try {
    return localStorage.getItem(CHAVE_NOME) || nomeSugerido();
  } catch {
    return nomeSugerido();
  }
}

/** Salva o nome deste aparelho e atualiza os registros já enviados. */
export async function salvarNomeDesteAparelho(nome: string): Promise<string> {
  const limpo = (nome || '').trim() || nomeSugerido();

  try {
    localStorage.setItem(CHAVE_NOME, limpo);
  } catch (erro) {
    console.error('Não foi possível guardar o nome do aparelho:', erro);
  }

  await renomearAparelhoNoBanco(idDesteAparelho(), limpo);
  return limpo;
}

/** Registra mais uma abertura de tela deste aparelho. */
export function registrarAcessoDesteAparelho(): void {
  registrarAcessoAparelho(idDesteAparelho(), nomeDesteAparelho());
}

/** Junta os dias em um resumo por aparelho, do mais acessado para o menos. */
export async function carregarAparelhos(dias = 30): Promise<ResumoAparelho[]> {
  const linhas: AcessoAparelho[] = await getAcessosAparelhos(dias);
  const meuId = idDesteAparelho();
  const porAparelho = new Map<string, ResumoAparelho>();

  linhas.forEach(linha => {
    const atual = porAparelho.get(linha.aparelhoId) || {
      aparelhoId: linha.aparelhoId,
      nome: linha.nome,
      acessos: 0,
      dias: 0,
      ultimoAcesso: '',
      esteAparelho: linha.aparelhoId === meuId,
    };

    atual.acessos += linha.contagem;
    atual.dias += 1;
    // As linhas vêm da mais recente para a mais antiga.
    if (!atual.ultimoAcesso) {
      atual.nome = linha.nome;
      atual.ultimoAcesso = linha.atualizadoEm || linha.dia;
    }

    porAparelho.set(linha.aparelhoId, atual);
  });

  return Array.from(porAparelho.values()).sort((a, b) => b.acessos - a.acessos);
}
