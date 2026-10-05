/**
 * QUEM ESTÁ USANDO ESTE APARELHO
 *
 * O sistema não tem login: quem abre o endereço já entra. Mas na primeira vez
 * em cada celular ele pergunta o nome da pessoa, e sem o nome não passa - é a
 * única coisa pedida, uma vez só. Serve para duas coisas:
 *
 * 1. a saudação do Dashboard virar "Paz do Senhor, Daniel! 🙌";
 * 2. as Configurações mostrarem QUEM está conectado agora, e não só
 *    "Android · Chrome" (ver services/presenca.ts).
 *
 * O nome fica em dois lugares, de propósito:
 * - no localStorage, para a saudação aparecer na hora e funcionar sem internet;
 * - na tabela pessoas_aparelhos do Supabase (ver supabase_pessoas.sql), uma
 *   linha por aparelho. É o que permite consultar no painel quem já acessou e
 *   não perguntar de novo a quem limpou os dados do navegador.
 */

import { idDesteAparelho, nomeDesteAparelho } from './aparelhos';
import { salvarPessoaSupabase, lerPessoaSupabase } from './supabase';

const CHAVE_NOME = 'repertorio:pessoa-nome';

export function lerNomePessoa(): string {
  try {
    return (localStorage.getItem(CHAVE_NOME) || '').trim();
  } catch {
    return '';
  }
}

/** Guarda só no aparelho (sem ida ao Supabase) e avisa as telas abertas. */
function guardarLocal(nome: string): void {
  try {
    if (nome) localStorage.setItem(CHAVE_NOME, nome);
    else localStorage.removeItem(CHAVE_NOME);
  } catch (erro) {
    console.error('Não foi possível guardar o nome da pessoa:', erro);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('repertorio-pessoa-mudou'));
  }
}

export function salvarNomePessoa(nome: string): string {
  const limpo = (nome || '').trim();
  guardarLocal(limpo);

  if (limpo) {
    // Em segundo plano: a pessoa entra no sistema na hora, sem esperar a rede.
    salvarPessoaSupabase(idDesteAparelho(), limpo, nomeDesteAparelho()).catch(erro =>
      console.error('Não foi possível enviar o nome para o Supabase:', erro)
    );
  }

  return limpo;
}

/**
 * Nome deste aparelho, procurando também no Supabase.
 *
 * É o que decide se a pergunta aparece. Quem já respondeu uma vez e depois
 * limpou os dados do navegador (ou abriu em outro navegador do mesmo celular)
 * não é perguntado de novo: o nome volta da tabela pelo código do aparelho.
 */
export async function carregarNomePessoa(): Promise<string> {
  const local = lerNomePessoa();
  if (local) return local;

  const doBanco = await lerPessoaSupabase(idDesteAparelho());
  if (doBanco) guardarLocal(doBanco);

  return doBanco;
}

/**
 * Saudação do Dashboard. Antes do nome chegar fica só "Paz do Senhor!" - o que
 * aparece por um instante na primeiríssima abertura, atrás da pergunta.
 */
export function saudacao(): string {
  const nome = lerNomePessoa();
  return nome ? `Paz do Senhor, ${nome}!` : 'Paz do Senhor!';
}

/** Avisa as telas abertas quando o nome muda. Devolve o cancelador. */
export function ouvirNomePessoa(aoMudar: () => void): () => void {
  if (typeof window === 'undefined') return () => {};

  window.addEventListener('repertorio-pessoa-mudou', aoMudar);
  return () => window.removeEventListener('repertorio-pessoa-mudou', aoMudar);
}
