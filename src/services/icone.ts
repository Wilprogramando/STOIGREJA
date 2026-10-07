/**
 * ÍCONE DO APP NA COR ESCOLHIDA
 *
 * O desenho é o mesmo de sempre (public/favicon.svg e public/icone.svg): o
 * quadrado arredondado com a nota musical branca. A diferença é que aqui ele é
 * montado na hora, com a cor escolhida em Configurações > Aparência, e entra
 * no lugar do arquivo fixo.
 *
 * Três coisas recebem a cor:
 *   - o ícone da guia do navegador (favicon)
 *   - o ícone de atalho do iPhone (apple-touch-icon)
 *   - o manifesto, que é de onde o celular tira o ícone AO INSTALAR o app
 *
 * ATENÇÃO: o celular copia o ícone no momento da instalação. Trocar a cor
 * depois muda a guia do navegador na hora, mas o atalho que já está na tela
 * inicial continua na cor antiga até ser instalado de novo.
 */

/** O quadrado arredondado com a nota, na cor pedida. */
export function svgDoIcone(cor: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" rx="96" fill="${cor}"/>
  <path d="M330 120v168a56 56 0 1 1-32-50V186l-96 24v134a56 56 0 1 1-32-50V180a24 24 0 0 1 18-23l120-30a24 24 0 0 1 22 5 24 24 0 0 1 0 18z" fill="#fff"/>
</svg>`;
}

const comoDataUrl = (svg: string) =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

/** Acha (ou cria) uma tag do cabeçalho pelo seletor. */
function tag(seletor: string, criar: () => HTMLLinkElement): HTMLLinkElement {
  const existente = document.head.querySelector<HTMLLinkElement>(seletor);
  if (existente) return existente;

  const nova = criar();
  document.head.appendChild(nova);
  return nova;
}

/**
 * Põe o ícone na cor informada. Chamado pelo tema sempre que a cor muda.
 */
export function aplicarIconeDoTema(principal: string, escura: string): void {
  if (typeof document === 'undefined' || !principal) return;

  try {
    const icone = comoDataUrl(svgDoIcone(principal));

    // Guia do navegador
    const favicon = tag('link[rel="icon"]', () => {
      const link = document.createElement('link');
      link.rel = 'icon';
      return link;
    });
    favicon.type = 'image/svg+xml';
    favicon.href = icone;

    // Atalho do iPhone: endereço de verdade, que o aparelho consegue baixar.
    const apple = tag('link[rel="apple-touch-icon"]', () => {
      const link = document.createElement('link');
      link.rel = 'apple-touch-icon';
      return link;
    });
    apple.href = enderecoDoIcone(principal);

    aplicarManifesto(principal, escura);
  } catch (erro) {
    console.error('Não foi possível pintar o ícone do app:', erro);
  }
}

/** Endereço do ícone colorido no servidor (ver api/icone.js). */
export function enderecoDoIcone(cor: string): string {
  return `/api/icone?cor=${encodeURIComponent(cor)}`;
}

/**
 * Aponta o manifesto para a rota que o monta na cor escolhida.
 *
 * É de lá que o celular tira a COR DA TELA DE ABERTURA que ele mesmo desenha
 * antes do app carregar - a que aparecia sempre no índigo de fábrica. Como o
 * aparelho copia tudo isso no momento da instalação, o atalho que já está na
 * tela inicial só muda de cor quando for instalado de novo.
 */
function aplicarManifesto(principal: string, escura: string): void {
  const link = document.head.querySelector<HTMLLinkElement>('link[rel="manifest"]');
  if (!link) return;

  link.href =
    `/api/manifest?cor=${encodeURIComponent(principal)}` +
    `&escura=${encodeURIComponent(escura)}`;
}
