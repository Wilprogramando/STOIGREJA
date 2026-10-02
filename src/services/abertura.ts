/**
 * ABERTURA ANIMADA
 *
 * A tela em si está escrita no index.html (.abertura), porque precisa aparecer
 * antes do React carregar. Aqui ficam duas coisas:
 *
 * 1. o momento de tirá-la do ar - quem decide é o Dashboard, quando termina de
 *    ler os dados e desenhou o conteúdo, para a logo cobrir todo o
 *    carregamento;
 * 2. a escolha do usuário em Configurações > Abertura do Sistema (modelo,
 *    fundo e o que aparece).
 *
 * ATENÇÃO: o index.html tem um script solto que lê estas mesmas chaves do
 * localStorage e aplica antes da tela ser pintada. Se mudar o formato aqui,
 * mude lá também - senão a abertura pisca no modelo padrão antes de trocar.
 */

export type ModeloAbertura = 'nota' | 'pulso' | 'cartao' | 'equalizador' | 'simples' | 'nenhuma'
export type FundoAbertura = 'tema' | 'claro' | 'escuro' | 'personalizada'

export interface Abertura {
  /** Qual animação aparece. 'nenhuma' desliga a abertura. */
  modelo: ModeloAbertura
  /** Cor de fundo: a do app, clara, escura ou escolhida a dedo. */
  fundo: FundoAbertura
  /** Cor usada quando o fundo é 'personalizada'. */
  cor: string
  mostrarNome: boolean
  mostrarPontos: boolean
}

export const MODELOS: { id: ModeloAbertura; nome: string; descricao: string }[] = [
  { id: 'nota', nome: 'Nota com ondas', descricao: 'A nota marca o compasso e solta ondas' },
  { id: 'pulso', nome: 'Pulso', descricao: 'A nota bate como um coração' },
  { id: 'cartao', nome: 'Cartão', descricao: 'A nota num quadrado que entra girando' },
  { id: 'equalizador', nome: 'Equalizador', descricao: 'Cinco barras dançando' },
  { id: 'simples', nome: 'Simples', descricao: 'Só a logo, sem movimento' },
  { id: 'nenhuma', nome: 'Sem abertura', descricao: 'Vai direto para o sistema' }
]

export const FUNDOS: { id: FundoAbertura; nome: string }[] = [
  { id: 'tema', nome: 'Cor do app' },
  { id: 'claro', nome: 'Claro' },
  { id: 'escuro', nome: 'Escuro' },
  { id: 'personalizada', nome: 'Escolher cor' }
]

export const ABERTURA_PADRAO: Abertura = {
  modelo: 'nota',
  fundo: 'tema',
  cor: '#4f46e5',
  mostrarNome: true,
  mostrarPontos: true
}

const CHAVE = 'repertorio:abertura'

export function lerAbertura(): Abertura {
  try {
    const bruto = localStorage.getItem(CHAVE)
    if (!bruto) return { ...ABERTURA_PADRAO }

    return { ...ABERTURA_PADRAO, ...(JSON.parse(bruto) || {}) }
  } catch {
    return { ...ABERTURA_PADRAO }
  }
}

export function salvarAbertura(abertura: Abertura): Abertura {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(abertura))
  } catch (erro) {
    console.error('Não foi possível guardar a abertura:', erro)
  }

  return abertura
}

/** Letra escura em fundo claro, letra branca em fundo escuro. */
function frenteParaCor(cor: string): string {
  const rgb = cor.replace('#', '')
  if (rgb.length < 6) return '#ffffff'

  const luz =
    (parseInt(rgb.slice(0, 2), 16) * 299 +
      parseInt(rgb.slice(2, 4), 16) * 587 +
      parseInt(rgb.slice(4, 6), 16) * 114) /
    1000

  return luz > 150 ? '#111827' : '#ffffff'
}

/**
 * Põe a escolha num elemento .abertura - serve para a prévia das Configurações
 * e para a abertura de teste. A abertura real é montada pelo index.html.
 */
export function aplicarAbertura(elemento: HTMLElement, abertura: Abertura): void {
  elemento.dataset.modelo = abertura.modelo === 'nenhuma' ? 'simples' : abertura.modelo
  elemento.dataset.nome = abertura.mostrarNome ? 'sim' : 'nao'
  elemento.dataset.pontos = abertura.mostrarPontos ? 'sim' : 'nao'

  const estilo = elemento.style
  estilo.removeProperty('--abertura-fundo')
  estilo.removeProperty('--abertura-frente')
  estilo.removeProperty('--abertura-nota')

  if (abertura.fundo === 'claro') {
    estilo.setProperty('--abertura-fundo', '#f8fafc')
    estilo.setProperty('--abertura-frente', 'var(--cor-principal, #4f46e5)')
    estilo.setProperty('--abertura-nota', '#f8fafc')
  } else if (abertura.fundo === 'escuro') {
    estilo.setProperty('--abertura-fundo', '#0f172a')
    estilo.setProperty('--abertura-frente', '#ffffff')
    estilo.setProperty('--abertura-nota', '#0f172a')
  } else if (abertura.fundo === 'personalizada') {
    estilo.setProperty('--abertura-fundo', abertura.cor)
    estilo.setProperty('--abertura-frente', frenteParaCor(abertura.cor))
    estilo.setProperty('--abertura-nota', abertura.cor)
  }
}

/** Tempo mínimo em pé, só para a logo não dar um flash quando já está em cache. */
const DURACAO_MINIMA = 450

let jaFechou = false

export function fecharAbertura() {
  if (jaFechou) return
  jaFechou = true

  const abertura = document.getElementById('abertura')
  if (!abertura) return

  const esperar = Math.max(0, DURACAO_MINIMA - performance.now())

  window.setTimeout(() => {
    abertura.classList.add('saindo')
    // Só sai do documento depois do desaparecer, para não cortar a transição.
    abertura.addEventListener('transitionend', () => abertura.remove(), { once: true })
  }, esperar)
}

/**
 * Rede de segurança: se der erro no carregamento e o Dashboard nunca avisar,
 * a abertura sai sozinha em vez de prender o usuário na logo para sempre.
 */
export function garantirSaidaDaAbertura(limite = 8000) {
  window.setTimeout(() => {
    if (!jaFechou) {
      console.warn('⚠️ Abertura fechada pelo tempo limite: o Dashboard não avisou que carregou.')
      fecharAbertura()
    }
  }, limite)
}

/**
 * Mostra a abertura escolhida por alguns segundos, como ela vai aparecer de
 * verdade. É o botão "Ver em tela cheia" das Configurações.
 */
export function testarAbertura(abertura: Abertura, duracao = 2600): void {
  const copia = document.createElement('div')
  copia.className = 'abertura'
  copia.innerHTML = `
    <div class="abertura-logo">
      <span class="abertura-onda"></span>
      <span class="abertura-onda atrasada"></span>
      <svg viewBox="0 0 512 512" aria-hidden="true">
        <path
          d="M330 120v168a56 56 0 1 1-32-50V186l-96 24v134a56 56 0 1 1-32-50V180a24 24 0 0 1 18-23l120-30a24 24 0 0 1 22 5 24 24 0 0 1 0 18z"
          fill="currentColor"
        />
      </svg>
      <span class="abertura-barras">
        <span></span><span></span><span></span><span></span><span></span>
      </span>
    </div>
    <div class="abertura-nome">Conjunto Manancial</div>
    <div class="abertura-pontos"><span></span><span></span><span></span></div>
  `

  aplicarAbertura(copia, abertura)
  document.body.appendChild(copia)

  const sair = () => {
    copia.classList.add('saindo')
    copia.addEventListener('transitionend', () => copia.remove(), { once: true })
  }

  // Toque na tela fecha antes do tempo, para ninguém ficar esperando.
  copia.addEventListener('click', sair, { once: true })
  window.setTimeout(sair, duracao)
}
