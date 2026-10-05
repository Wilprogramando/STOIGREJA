/**
 * INSTALAR NA TELA INICIAL
 *
 * O sistema já é um PWA (tem manifest e service worker), então o navegador
 * sabe instalá-lo como aplicativo. O que falta é o convite: o aviso do Chrome
 * é discreto e quase ninguém vê. Daí o botão em Configurações > Instalar.
 *
 * ATENÇÃO ao jeito como o navegador avisa: o evento 'beforeinstallprompt'
 * dispara UMA vez, logo no carregamento da página - muito antes de alguém
 * abrir as Configurações. Por isso ele é capturado aqui, no começo da vida do
 * app (chamado pelo main.tsx), e guardado nesta variável. Se a tela tentasse
 * escutar o evento sozinha, ele já teria passado e o botão nunca apareceria.
 *
 * E o iPhone não tem esse evento nenhum: no Safari a instalação é só pelo
 * menu Compartilhar. Lá o botão dá lugar ao passo a passo (ver ehIOS).
 */

/** O convite guardado pelo navegador, esperando o toque no botão. */
let convite: any = null

const ouvintes = new Set<() => void>()

function avisar() {
  ouvintes.forEach(ouvinte => {
    try {
      ouvinte()
    } catch (erro) {
      console.error('Erro ao avisar sobre a instalação:', erro)
    }
  })
}

/**
 * Começa a ouvir o navegador. Chamado uma vez pelo main.tsx, antes de a tela
 * ser desenhada, senão o convite se perde.
 */
export function prepararInstalacao(): void {
  if (typeof window === 'undefined') return

  window.addEventListener('beforeinstallprompt', (evento: Event) => {
    // Sem isto o Chrome mostra a barrinha dele por cima; aqui quem convida é
    // o nosso botão, na hora em que a pessoa procurou por ele.
    evento.preventDefault()
    convite = evento
    avisar()
  })

  // Instalou: o botão sai do ar e o aviso de "já está instalado" entra.
  window.addEventListener('appinstalled', () => {
    convite = null
    avisar()
  })
}

/** O navegador aceita instalar agora, com um toque no botão? */
export function podeInstalar(): boolean {
  return convite !== null
}

/** O sistema está aberto como aplicativo (e não dentro do navegador)? */
export function jaInstalado(): boolean {
  if (typeof window === 'undefined') return false

  try {
    if (window.matchMedia('(display-mode: standalone)').matches) return true
  } catch {
    /* navegador antigo: cai no teste de baixo */
  }

  // Jeito do Safari no iPhone.
  return (window.navigator as any).standalone === true
}

/** iPhone e iPad: lá a instalação é feita à mão, pelo menu Compartilhar. */
export function ehIOS(): boolean {
  if (typeof navigator === 'undefined') return false

  const ua = navigator.userAgent || ''
  const iPadNovo = /Macintosh/.test(ua) && (navigator as any).maxTouchPoints > 1

  return /iPad|iPhone|iPod/.test(ua) || iPadNovo
}

/**
 * Abre o convite do navegador. Devolve o que a pessoa respondeu:
 * 'instalado', 'recusado' ou 'indisponivel' (o navegador não ofereceu).
 */
export async function instalar(): Promise<'instalado' | 'recusado' | 'indisponivel'> {
  if (!convite) return 'indisponivel'

  try {
    convite.prompt()
    const { outcome } = await convite.userChoice

    // O convite vale uma vez só: depois de usado o navegador descarta.
    convite = null
    avisar()

    return outcome === 'accepted' ? 'instalado' : 'recusado'
  } catch (erro) {
    console.error('Não foi possível abrir o convite de instalação:', erro)
    return 'indisponivel'
  }
}

/** Avisa a tela quando o convite chega ou vai embora. Devolve o cancelador. */
export function ouvirInstalacao(aoMudar: () => void): () => void {
  ouvintes.add(aoMudar)
  return () => ouvintes.delete(aoMudar)
}
