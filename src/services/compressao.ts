/**
 * COMPRESSÃO DE MÚSICA
 *
 * Antes de enviar, o arquivo é reconvertido em MP3 com uma qualidade menor.
 * Um MP3 de 5 MB costuma ficar em torno de 1,5 MB - cabe muito mais música
 * no espaço do Supabase e o celular carrega bem mais rápido no culto.
 *
 * Tudo acontece no próprio aparelho: o arquivo é lido, transformado em som
 * cru (Web Audio) e regravado em MP3 pelo codificador lamejs.
 */

/** Qualidades oferecidas na tela de cadastro. */
export type QualidadeAudio = 'original' | 'alta' | 'media' | 'baixa';

export const QUALIDADES: Record<
  Exclude<QualidadeAudio, 'original'>,
  { kbps: number; rotulo: string; explicacao: string }
> = {
  alta: { kbps: 192, rotulo: 'Alta', explicacao: 'quase igual ao original' },
  media: { kbps: 128, rotulo: 'Média', explicacao: 'boa para caixa de som e fone' },
  baixa: { kbps: 96, rotulo: 'Econômica', explicacao: 'ocupa menos espaço' },
};

/** Lê o arquivo e devolve o som em canais separados. */
async function lerAudio(arquivo: File): Promise<AudioBuffer> {
  const dados = await arquivo.arrayBuffer();
  const Contexto = window.AudioContext || (window as any).webkitAudioContext;
  const contexto = new Contexto();

  try {
    return await contexto.decodeAudioData(dados);
  } finally {
    contexto.close().catch(() => undefined);
  }
}

/** Converte a faixa de -1..1 para o formato de números inteiros do MP3. */
function paraInteiros(canal: Float32Array): Int16Array {
  const saida = new Int16Array(canal.length);
  for (let i = 0; i < canal.length; i++) {
    const amostra = Math.max(-1, Math.min(1, canal[i]));
    saida[i] = amostra < 0 ? amostra * 0x8000 : amostra * 0x7fff;
  }
  return saida;
}

/**
 * Comprime a música escolhida e devolve o novo arquivo MP3.
 *
 * `aoAndar` recebe de 0 a 100 para a tela mostrar o progresso.
 * Se algo der errado na conversão, devolvemos o arquivo original - é melhor
 * cadastrar a música grande do que não cadastrar.
 */
export async function comprimirMusica(
  arquivo: File,
  qualidade: Exclude<QualidadeAudio, 'original'> = 'media',
  aoAndar?: (porcento: number) => void
): Promise<File> {
  try {
    const { Mp3Encoder } = await import('lamejs');

    const som = await lerAudio(arquivo);
    const canais = Math.min(som.numberOfChannels, 2);
    const kbps = QUALIDADES[qualidade].kbps;

    const codificador = new Mp3Encoder(canais, som.sampleRate, kbps);
    const esquerda = paraInteiros(som.getChannelData(0));
    const direita = canais > 1 ? paraInteiros(som.getChannelData(1)) : null;

    const pedacos: Uint8Array[] = [];
    const passo = 1152; // tamanho de bloco que o MP3 usa

    for (let i = 0; i < esquerda.length; i += passo) {
      const bloco = codificador.encodeBuffer(
        esquerda.subarray(i, i + passo),
        direita ? direita.subarray(i, i + passo) : undefined
      );
      if (bloco.length > 0) pedacos.push(new Uint8Array(bloco));

      // Avisa o progresso e devolve o controle para a tela não travar.
      if (aoAndar && i % (passo * 200) === 0) {
        aoAndar(Math.round((i / esquerda.length) * 100));
        await new Promise(seguir => setTimeout(seguir, 0));
      }
    }

    const fim = codificador.flush();
    if (fim.length > 0) pedacos.push(new Uint8Array(fim));
    aoAndar?.(100);

    const nome = arquivo.name.replace(/\.[^.]+$/, '') + '.mp3';
    const comprimido = new File(pedacos as BlobPart[], nome, { type: 'audio/mpeg' });

    // Arquivo já pequeno (ou conversão que não ajudou): fica o original.
    return comprimido.size > 0 && comprimido.size < arquivo.size ? comprimido : arquivo;
  } catch (erro) {
    console.warn('⚠️ Não foi possível comprimir; enviando o arquivo original:', erro);
    return arquivo;
  }
}
