/**
 * PRESENÇA (APARELHOS ONLINE AGORA)
 *
 * Cada aparelho que abre o sistema entra numa "sala" do Supabase Realtime e
 * conta de onde está acessando. Quem fecha o sistema sai da sala sozinho, então
 * as Configurações mostram quantos aparelhos estão conectados neste momento.
 *
 * Sobre o nome da rede wi-fi: nenhum navegador entrega o nome da rede (SSID) -
 * é bloqueio de privacidade do Android, do iPhone e do Windows. Por isso
 * mostramos o provedor de internet (vem do IP), o tipo de conexão quando o
 * aparelho informa, e um apelido que a pessoa escreve no próprio aparelho
 * ("Wi-fi Igreja", "Mesa de som").
 */

import { clienteSupabase } from './db';
import { idDesteAparelho, nomeDesteAparelho } from './aparelhos';

const SALA = 'aparelhos-online';
const CHAVE_REDE = 'repertorio:rede-wifi';
const CHAVE_LOCAL_CACHE = 'repertorio:local-ip';
const VALIDADE_LOCAL = 6 * 60 * 60 * 1000; // 6 horas

/** De onde o aparelho está acessando, descoberto pelo IP. */
export interface LocalDoAparelho {
  cidade: string;
  regiao: string;
  pais: string;
  /** Provedor de internet (Vivo, Claro, Starlink...). */
  provedor: string;
}

/** Um aparelho conectado neste momento. */
export interface AparelhoOnline {
  aparelhoId: string;
  nome: string;
  cidade: string;
  regiao: string;
  pais: string;
  provedor: string;
  /** Apelido da rede escrito no próprio aparelho. */
  rede: string;
  /** Tipo de conexão informado pelo navegador (wifi, 4g...), quando existe. */
  tipoConexao: string;
  /** Desde quando está com o sistema aberto (ISO). */
  desde: string;
  esteAparelho: boolean;
}

// ==================== REDE (APELIDO ESCRITO NO APARELHO) ====================

/** Apelido da rede deste aparelho ("Wi-fi Igreja", por exemplo). */
export function redeDesteAparelho(): string {
  try {
    return localStorage.getItem(CHAVE_REDE) || '';
  } catch {
    return '';
  }
}

export function salvarRedeDesteAparelho(nome: string): string {
  const limpo = (nome || '').trim();
  try {
    if (limpo) localStorage.setItem(CHAVE_REDE, limpo);
    else localStorage.removeItem(CHAVE_REDE);
  } catch (erro) {
    console.error('Não foi possível guardar o nome da rede:', erro);
  }
  return limpo;
}

/** Tipo de conexão informado pelo navegador (só alguns Android informam). */
export function tipoDeConexao(): string {
  const conexao: any =
    (navigator as any).connection ||
    (navigator as any).mozConnection ||
    (navigator as any).webkitConnection;

  if (!conexao) return '';
  const tipo = conexao.type || '';
  if (tipo === 'wifi') return 'Wi-fi';
  if (tipo === 'cellular') return conexao.effectiveType ? conexao.effectiveType.toUpperCase() : 'Dados móveis';
  if (tipo === 'ethernet') return 'Cabo';
  return conexao.effectiveType ? conexao.effectiveType.toUpperCase() : '';
}

// ==================== LOCALIZAÇÃO PELO IP ====================

function lerLocalSalvo(): LocalDoAparelho | null {
  try {
    const bruto = localStorage.getItem(CHAVE_LOCAL_CACHE);
    if (!bruto) return null;
    const { quando, local } = JSON.parse(bruto);
    if (Date.now() - quando > VALIDADE_LOCAL) return null;
    return local as LocalDoAparelho;
  } catch {
    return null;
  }
}

function guardarLocal(local: LocalDoAparelho): void {
  try {
    localStorage.setItem(CHAVE_LOCAL_CACHE, JSON.stringify({ quando: Date.now(), local }));
  } catch {
    /* sem espaço: só não guarda */
  }
}

async function buscarJson(url: string, prazo = 6000): Promise<any | null> {
  const controlador = new AbortController();
  const relogio = setTimeout(() => controlador.abort(), prazo);
  try {
    const resposta = await fetch(url, { signal: controlador.signal });
    if (!resposta.ok) return null;
    return await resposta.json();
  } catch {
    return null;
  } finally {
    clearTimeout(relogio);
  }
}

/**
 * Descobre cidade, estado e provedor pelo endereço de internet do aparelho.
 *
 * O IP chega até a cidade/região - bairro e rua não são possíveis por aqui.
 * Em rede sem internet simplesmente não vem nada, e a tela mostra "-".
 */
export async function descobrirLocal(): Promise<LocalDoAparelho | null> {
  const salvo = lerLocalSalvo();
  if (salvo) return salvo;

  const ipapi = await buscarJson('https://ipapi.co/json/');
  if (ipapi && ipapi.city) {
    const local: LocalDoAparelho = {
      cidade: ipapi.city || '',
      regiao: ipapi.region || '',
      pais: ipapi.country_name || '',
      provedor: ipapi.org || '',
    };
    guardarLocal(local);
    return local;
  }

  // Segunda opção, caso o primeiro serviço esteja fora do ar ou no limite diário.
  const ipwho = await buscarJson('https://ipwho.is/');
  if (ipwho && ipwho.success !== false && ipwho.city) {
    const local: LocalDoAparelho = {
      cidade: ipwho.city || '',
      regiao: ipwho.region || '',
      pais: ipwho.country || '',
      provedor: ipwho.connection?.isp || ipwho.connection?.org || '',
    };
    guardarLocal(local);
    return local;
  }

  return null;
}

// ==================== SALA EM TEMPO REAL ====================

/** Uma sala só para o aparelho inteiro: a tela de Configurações apenas escuta. */
let canalAtual: any = null;
let listaAtual: AparelhoOnline[] = [];
const ouvintes = new Set<(aparelhos: AparelhoOnline[]) => void>();

/**
 * Entra na sala (uma vez por aparelho) e avisa a cada mudança quem está conectado.
 * Devolve a função para parar de escutar - a sala continua aberta enquanto o
 * sistema estiver aberto, para o aparelho aparecer como online em qualquer tela.
 */
export function acompanharOnline(
  aoMudar: (aparelhos: AparelhoOnline[]) => void
): () => void {
  ouvintes.add(aoMudar);
  aoMudar(listaAtual);

  const supabase = clienteSupabase();
  if (!supabase) {
    return () => ouvintes.delete(aoMudar);
  }

  if (canalAtual) {
    return () => ouvintes.delete(aoMudar);
  }

  const meuId = idDesteAparelho();
  const canal = supabase.channel(SALA, { config: { presence: { key: meuId } } });
  canalAtual = canal;

  const montarLista = () => {
    const estado = canal.presenceState() as Record<string, any[]>;
    const lista: AparelhoOnline[] = Object.values(estado)
      .map(entradas => entradas[entradas.length - 1])
      .filter(Boolean)
      .map((dado: any) => ({
        aparelhoId: dado.aparelhoId || '',
        nome: dado.nome || 'Aparelho',
        cidade: dado.cidade || '',
        regiao: dado.regiao || '',
        pais: dado.pais || '',
        provedor: dado.provedor || '',
        rede: dado.rede || '',
        tipoConexao: dado.tipoConexao || '',
        desde: dado.desde || '',
        esteAparelho: dado.aparelhoId === meuId,
      }))
      .sort((a, b) => Number(b.esteAparelho) - Number(a.esteAparelho));

    listaAtual = lista;
    ouvintes.forEach(ouvinte => ouvinte(lista));
  };

  canal
    .on('presence', { event: 'sync' }, montarLista)
    .on('presence', { event: 'join' }, montarLista)
    .on('presence', { event: 'leave' }, montarLista)
    .subscribe(async (status: string) => {
      if (status !== 'SUBSCRIBED') return;

      const local = await descobrirLocal();
      await canal.track({
        aparelhoId: meuId,
        nome: nomeDesteAparelho(),
        cidade: local?.cidade || '',
        regiao: local?.regiao || '',
        pais: local?.pais || '',
        provedor: local?.provedor || '',
        rede: redeDesteAparelho(),
        tipoConexao: tipoDeConexao(),
        desde: new Date().toISOString(),
      });
    });

  // Ao fechar a aba, sai da sala na hora (sem esperar o tempo limite do servidor).
  if (typeof window !== 'undefined') {
    window.addEventListener('pagehide', () => {
      try {
        canal.untrack();
      } catch {
        /* já saiu */
      }
    });
  }

  return () => ouvintes.delete(aoMudar);
}

/** Reenvia os dados deste aparelho (depois de trocar o nome ou a rede). */
export async function atualizarMeusDados(): Promise<void> {
  const supabase = clienteSupabase();
  if (!supabase) return;

  const canal = canalAtual;
  if (!canal) return;

  const local = await descobrirLocal();
  await canal.track({
    aparelhoId: idDesteAparelho(),
    nome: nomeDesteAparelho(),
    cidade: local?.cidade || '',
    regiao: local?.regiao || '',
    pais: local?.pais || '',
    provedor: local?.provedor || '',
    rede: redeDesteAparelho(),
    tipoConexao: tipoDeConexao(),
    desde: new Date().toISOString(),
  });
}
