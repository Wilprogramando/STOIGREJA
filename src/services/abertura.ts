/**
 * ABERTURA ANIMADA
 *
 * A tela em si está escrita no index.html (#abertura), porque precisa aparecer
 * antes do React carregar. Aqui fica só o momento de tirá-la do ar.
 *
 * Quem decide é o Dashboard: ele chama fecharAbertura() quando já terminou de
 * ler os dados e desenhou o conteúdo. Assim a logo cobre todo o carregamento,
 * e o usuário não vê o "Carregando dashboard..." no meio do caminho.
 */

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
