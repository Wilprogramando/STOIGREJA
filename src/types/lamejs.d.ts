/** Tipos mínimos do lamejs (o pacote não traz os próprios). */
declare module 'lamejs' {
  export class Mp3Encoder {
    constructor(canais: number, taxaAmostragem: number, kbps: number);
    encodeBuffer(esquerda: Int16Array, direita?: Int16Array): Int8Array;
    flush(): Int8Array;
  }
}
