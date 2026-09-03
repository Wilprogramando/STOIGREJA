/**
 * ACESSOS DO SISTEMA
 *
 * Conta quantas vezes cada tela foi aberta neste aparelho.
 * Fica no localStorage: é só estatística de uso, não precisa ir para o servidor
 * nem entrar no backup dos hinos.
 */

const CHAVE = 'repertorio:acessos';

export interface RegistroAcessos {
  /** Quantas vezes cada tela foi aberta, por id de página. */
  porPagina: Record<string, number>;
  /** Data/hora do último acesso de cada tela (ISO). */
  ultimoPorPagina: Record<string, string>;
  /** Total de aberturas de tela. */
  total: number;
  /** Quando a contagem começou (ISO). */
  desde: string;
  /** Dias em que o sistema foi usado (AAAA-MM-DD). */
  dias: string[];
}

const vazio = (): RegistroAcessos => ({
  porPagina: {},
  ultimoPorPagina: {},
  total: 0,
  desde: new Date().toISOString(),
  dias: [],
});

export function lerAcessos(): RegistroAcessos {
  try {
    const bruto = localStorage.getItem(CHAVE);
    if (!bruto) return vazio();

    const dados = JSON.parse(bruto);
    return {
      porPagina: dados.porPagina || {},
      ultimoPorPagina: dados.ultimoPorPagina || {},
      total: dados.total || 0,
      desde: dados.desde || new Date().toISOString(),
      dias: dados.dias || [],
    };
  } catch {
    return vazio();
  }
}

/** Soma mais uma abertura da tela informada. */
export function registrarAcesso(pagina: string): void {
  try {
    const dados = lerAcessos();
    const agora = new Date();
    const hoje = agora.toISOString().split('T')[0];

    dados.porPagina[pagina] = (dados.porPagina[pagina] || 0) + 1;
    dados.ultimoPorPagina[pagina] = agora.toISOString();
    dados.total += 1;

    if (!dados.dias.includes(hoje)) {
      // Guarda no máximo 180 dias para o registro não crescer sem parar.
      dados.dias = [...dados.dias, hoje].slice(-180);
    }

    localStorage.setItem(CHAVE, JSON.stringify(dados));
  } catch (erro) {
    console.error('Não foi possível registrar o acesso:', erro);
  }
}

export function zerarAcessos(): void {
  try {
    localStorage.removeItem(CHAVE);
  } catch (erro) {
    console.error('Não foi possível zerar os acessos:', erro);
  }
}
