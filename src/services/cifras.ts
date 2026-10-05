/**
 * TOCAR POR CIFRA
 *
 * As músicas desta tela ficam numa tabela só delas no Supabase (ver
 * supabase_cifras.sql) - de propósito. A lista de Hinos Comuns e a da Harpa
 * guardam letra, tom e cantor para montar o repertório; aqui o que importa é a
 * cifra para tocar na hora, e misturar as duas coisas bagunçava as duas telas.
 *
 * Toda cifra que chega do Supabase também fica no aparelho (localStorage).
 * É o que faz a tela abrir pronta no culto, mesmo com o wi-fi da igreja ruim
 * ou sem internet nenhuma - mesma ideia do resto do app.
 */

import {
  lerCifrasSupabase,
  salvarCifraSupabase,
  removerCifraSupabase
} from './supabase'

export interface Cifra {
  id: string
  nome: string
  artista: string
  /** Tom em que o Cifra Club publicou - a cifra guardada está neste tom. */
  tomOriginal: string
  /** Tom escolhido para tocar. Vazio: toca no original. */
  tomEscolhido: string
  /** Texto da cifra: acordes na linha de cima, letra embaixo. */
  cifra: string
  /** Afinação informada na página, quando tem. */
  afinacao?: string
  /** Endereço da página de onde veio. */
  fonte?: string
  criadoEm: string
}

/** Resultado da busca, antes de escolher qual música é. */
export interface ResultadoCifra {
  nome: string
  artista: string
  dns: string
  url: string
}

export const TONS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

/** Como os bemóis aparecem nas cifras, convertidos para a lista de cima. */
const BEMOIS: Record<string, string> = {
  Db: 'C#', Eb: 'D#', Gb: 'F#', Ab: 'G#', Bb: 'A#', Cb: 'B', Fb: 'E'
}

const CHAVE = 'repertorio:cifras'

// ==================== CÓPIA NO APARELHO ====================

/**
 * O que está guardado no aparelho. É o que a tela desenha de primeira, antes
 * de o Supabase responder - assim ela nunca abre vazia.
 */
export function lerCifrasLocais(): Cifra[] {
  try {
    const bruto = localStorage.getItem(CHAVE)
    const lista = bruto ? JSON.parse(bruto) : []
    return Array.isArray(lista) ? lista : []
  } catch {
    return []
  }
}

function gravarLocal(lista: Cifra[]): Cifra[] {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(lista))
  } catch (erro) {
    console.error('Não foi possível guardar as cifras no aparelho:', erro)
  }

  return lista
}

// ==================== GUARDAR E LER ====================

/**
 * Lista do Supabase, já copiada para o aparelho.
 *
 * Sem internet (ou sem Supabase configurado) devolve a cópia local em vez de
 * dar erro: no culto a tela tem de abrir de qualquer jeito.
 */
export async function lerCifras(): Promise<Cifra[]> {
  const doServidor = await lerCifrasSupabase()

  if (!doServidor) return lerCifrasLocais()

  return gravarLocal(doServidor as Cifra[])
}

/** Grava uma cifra nova, ou atualiza a que já existe com o mesmo id. */
export async function salvarCifra(cifra: Cifra): Promise<Cifra[]> {
  // Local primeiro: a tela responde na hora, mesmo com internet lenta.
  const lista = lerCifrasLocais()
  const posicao = lista.findIndex(c => c.id === cifra.id)

  if (posicao >= 0) {
    lista[posicao] = cifra
  } else {
    lista.unshift(cifra)
  }

  gravarLocal(lista)
  await salvarCifraSupabase(cifra)

  return lista
}

export async function removerCifra(id: string): Promise<Cifra[]> {
  const lista = gravarLocal(lerCifrasLocais().filter(c => c.id !== id))
  await removerCifraSupabase(id)

  return lista
}

/** Troca só o tom escolhido, sem reescrever o resto. */
export async function mudarTom(id: string, tomEscolhido: string): Promise<Cifra[]> {
  const lista = lerCifrasLocais()
  const cifra = lista.find(c => c.id === id)
  if (!cifra) return lista

  cifra.tomEscolhido = tomEscolhido
  gravarLocal(lista)
  await salvarCifraSupabase(cifra)

  return lista
}

// ==================== TOM E TRANSPOSIÇÃO ====================

/** 'Bb' -> 'A#', 'am' -> 'A'. Devolve '' no que não é acorde. */
export function normalizarTom(tom: string): string {
  const limpo = (tom || '').trim()
  if (!limpo) return ''

  const base = /^([A-G])([#b]?)/.exec(limpo)
  if (!base) return ''

  const nota = base[1] + base[2]
  return BEMOIS[nota] || nota
}

/** Quantos semitons de um tom para o outro (0 a 11). */
function distancia(de: string, para: string): number {
  const origem = TONS.indexOf(normalizarTom(de))
  const destino = TONS.indexOf(normalizarTom(para))
  if (origem < 0 || destino < 0) return 0

  return (destino - origem + 12) % 12
}

/**
 * Sobe um acorde em N semitons, mantendo o resto do nome.
 *
 * Trata o baixo depois da barra (D/F# -> E/G#) e o que vem agarrado na nota
 * (m7, sus4, add9, º...), que não muda de lugar nenhum.
 */
function subirAcorde(acorde: string, semitons: number): string {
  if (semitons === 0) return acorde

  return acorde
    .split('/')
    .map(parte => {
      const partes = /^([A-G][#b]?)(.*)$/.exec(parte)
      if (!partes) return parte

      const indice = TONS.indexOf(normalizarTom(partes[1]))
      if (indice < 0) return parte

      return TONS[(indice + semitons) % 12] + partes[2]
    })
    .join('/')
}

/**
 * Uma linha é de acordes (e não de letra)?
 *
 * No formato do Cifra Club os acordes vêm numa linha só deles, acima da letra.
 * A conta é simples: tirando os espaços, tudo o que sobrou tem de parecer
 * acorde. "E A B" é cifra; "Eu sei que ele vem" não é, por causa do "Eu" e
 * do "que".
 */
/**
 * O que pode vir agarrado na nota: m7, maj7, sus4, add9, (5-), º...
 *
 * A lista é fechada de propósito. Aceitando qualquer letra minúscula, palavras
 * de hino que começam com A-G passavam por acorde - "Deus" virava "Geus" ao
 * trocar o tom, "Cristo" virava "Fristo". Agora "eus" e "risto" não casam com
 * nada aqui e a linha é tratada como letra, que é o que ela é.
 */
const SUFIXO = '(?:maj|min|mi|dim|aug|sus|add|alt|m|M|º|°|\\+|-|#|b|\\d+|\\([^)]*\\))'
const ACORDE = new RegExp(`^[A-G][#b]?${SUFIXO}*$`)

/**
 * Separa o marcador de trecho do resto da linha.
 *
 * A primeira linha de cada parte vem como "[Intro] D  A  D" - marcador e
 * acordes juntos. Sem separar, o "[Intro]" fazia a linha não ser reconhecida
 * como cifra, e aqueles acordes ficavam de fora da troca de tom.
 */
function separarMarcador(linha: string): { marcador: string; resto: string } {
  const partes = /^(\s*\[[^\]]*\]\s*)([\s\S]*)$/.exec(linha)
  if (!partes) return { marcador: '', resto: linha }

  return { marcador: partes[1], resto: partes[2] }
}

export function ehLinhaDeAcordes(linha: string): boolean {
  const { resto } = separarMarcador(linha)

  const pedacos = resto.trim().split(/\s+/).filter(Boolean)
  // Linha só com o marcador ("[Refrão]") não é linha de acordes.
  if (pedacos.length === 0) return false

  // O baixo depois da barra (D/F#) é conferido em separado.
  return pedacos.every(
    p => p.length <= 14 && p.split('/').every(parte => parte.length > 0 && ACORDE.test(parte))
  )
}

/**
 * Passa a cifra inteira para outro tom.
 *
 * Só as linhas de acordes são mexidas - a letra fica intocada, inclusive o
 * alinhamento: cada acorde trocado é completado com espaços para ocupar o
 * mesmo tamanho de antes, senão "G#m7" empurraria a sílaba que vem embaixo.
 */
export function transporCifra(cifra: string, de: string, para: string): string {
  const semitons = distancia(de, para)
  if (semitons === 0) return cifra

  return cifra
    .split('\n')
    .map(linha => {
      if (!ehLinhaDeAcordes(linha)) return linha

      // O "[Intro]" fica como está; só os acordes depois dele são trocados.
      const { marcador, resto } = separarMarcador(linha)

      // Mantém os espaços do começo e troca acorde por acorde no lugar.
      const trocado = resto.replace(/[^\s]+/g, acorde => {
        const novo = subirAcorde(acorde, semitons)
        // Encheu ou encurtou: acerta o tamanho para a letra não sair do lugar.
        return novo.length < acorde.length
          ? novo + ' '.repeat(acorde.length - novo.length)
          : novo
      })

      return marcador + trocado
    })
    .join('\n')
}

/**
 * Descobre o tom pelo primeiro acorde da cifra.
 *
 * Rede de segurança para quando a página não informa o tom: nas músicas de
 * louvor o primeiro acorde é o tom em quase todos os casos. Quem for tocar vê
 * o tom na tela e corrige num toque se estiver errado.
 */
export function tomDaCifra(texto: string): string {
  for (const linha of texto.split('\n')) {
    if (!ehLinhaDeAcordes(linha)) continue

    const { resto } = separarMarcador(linha)
    const primeiro = resto.trim().split(/\s+/)[0]
    const tom = normalizarTom(primeiro)
    if (tom) return tom
  }

  return ''
}

/** Tom em que a cifra vai ser mostrada. */
export function tomAtual(cifra: Cifra): string {
  return normalizarTom(cifra.tomEscolhido) || normalizarTom(cifra.tomOriginal) || ''
}

/** A cifra já no tom escolhido, pronta para mostrar. */
export function cifraParaTocar(cifra: Cifra): string {
  const original = normalizarTom(cifra.tomOriginal)
  const escolhido = normalizarTom(cifra.tomEscolhido)

  if (!original || !escolhido || original === escolhido) return cifra.cifra

  return transporCifra(cifra.cifra, original, escolhido)
}

/**
 * Lista os acordes que a musica usa, na ordem em que aparecem e sem repetir.
 *
 * Serve para mostrar no alto da tela de tocar: dá para conferir num relance
 * se o tom escolhido caiu em acordes confortáveis antes de começar.
 */
export function acordesUsados(texto: string): string[] {
  const vistos: string[] = []

  for (const linha of texto.split('\n')) {
    if (!ehLinhaDeAcordes(linha)) continue

    const { resto } = separarMarcador(linha)

    for (const acorde of resto.trim().split(/\s+/).filter(Boolean)) {
      if (!vistos.includes(acorde)) vistos.push(acorde)
    }
  }

  return vistos
}

/** Sobe ou desce o tom em semitons, dando a volta no fim da lista. */
export function tomVizinho(tom: string, semitons: number): string {
  const base = normalizarTom(tom)
  if (!base) return ''

  const i = TONS.indexOf(base)
  return TONS[(i + semitons + TONS.length * 2) % TONS.length]
}

// ==================== BUSCA NA INTERNET ====================

/** Procura no Cifra Club pelo nome da música ou por um trecho da letra. */
export async function buscarCifras(termo: string): Promise<{
  resultados: ResultadoCifra[]
  /** Quando o nome bate exato, a API já devolve a cifra pronta. */
  direta?: CifraEncontrada
  erro?: string
}> {
  try {
    const resposta = await fetch(`/api/buscar-cifra?q=${encodeURIComponent(termo)}`)
    const dados = await resposta.json()

    if (!resposta.ok) {
      return { resultados: dados.resultados || [], erro: dados.erro || 'Nada encontrado' }
    }

    return {
      resultados: dados.resultados || [],
      direta: dados.cifra ? dados : undefined
    }
  } catch {
    return { resultados: [], erro: 'Sem internet para buscar a cifra' }
  }
}

export interface CifraEncontrada {
  nome: string
  artista: string
  tom: string
  cifra: string
  afinacao?: string
  fonte?: string
}

/** Traz a cifra completa de um resultado da busca. */
export async function abrirCifra(dns: string, url: string): Promise<CifraEncontrada | null> {
  try {
    const resposta = await fetch(
      `/api/buscar-cifra?dns=${encodeURIComponent(dns)}&url=${encodeURIComponent(url)}`
    )
    if (!resposta.ok) return null

    const dados = await resposta.json()
    return dados.cifra ? dados : null
  } catch {
    return null
  }
}
