/**
 * QUEM ESTÁ USANDO ESTE APARELHO
 *
 * O sistema não tem login: quem abre o endereço já entra. Mas na primeira vez
 * em cada celular ele pergunta o nome da pessoa, uma única vez, e guarda no
 * próprio aparelho. Serve para duas coisas:
 *
 * 1. a saudação do Dashboard virar "Paz do Senhor, Daniel! 🙌";
 * 2. as Configurações mostrarem QUEM está conectado agora, e não só
 *    "Android · Chrome" (ver services/presenca.ts).
 *
 * Fica no localStorage de propósito, e não numa tabela de usuários: o nome é
 * do aparelho, não da igreja. Se a pessoa trocar de celular, o novo pergunta
 * de novo - que é justamente o que queremos para saber quem é cada aparelho.
 */

const CHAVE_NOME = 'repertorio:pessoa-nome';
/** Marca que a pergunta já foi feita, mesmo que a pessoa não tenha respondido. */
const CHAVE_PERGUNTADO = 'repertorio:pessoa-perguntado';

export function lerNomePessoa(): string {
  try {
    return (localStorage.getItem(CHAVE_NOME) || '').trim();
  } catch {
    return '';
  }
}

/**
 * A pergunta só aparece se nunca foi feita neste aparelho. Depois de
 * responder (ou de deixar para depois) ela não volta mais - o nome passa a ser
 * trocado em Configurações.
 */
export function precisaPerguntarNome(): boolean {
  try {
    if (lerNomePessoa()) return false;
    return localStorage.getItem(CHAVE_PERGUNTADO) !== 'sim';
  } catch {
    // Sem localStorage não há onde guardar a resposta: não perguntamos, para
    // não cair numa pergunta a cada abertura.
    return false;
  }
}

/** Fecha o assunto sem o nome ("deixar para depois"). */
export function marcarNomePerguntado(): void {
  try {
    localStorage.setItem(CHAVE_PERGUNTADO, 'sim');
  } catch (erro) {
    console.error('Não foi possível guardar a resposta do nome:', erro);
  }
}

export function salvarNomePessoa(nome: string): string {
  const limpo = (nome || '').trim();

  try {
    if (limpo) localStorage.setItem(CHAVE_NOME, limpo);
    else localStorage.removeItem(CHAVE_NOME);

    localStorage.setItem(CHAVE_PERGUNTADO, 'sim');
  } catch (erro) {
    console.error('Não foi possível guardar o nome da pessoa:', erro);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('repertorio-pessoa-mudou'));
  }

  return limpo;
}

/**
 * Saudação do Dashboard. Com nome: "Paz do Senhor, Daniel!". Sem nome (quem
 * deixou para depois): só "Paz do Senhor!".
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
