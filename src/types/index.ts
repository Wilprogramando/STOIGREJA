export interface Hino {
  id: string;
  nome: string;
  tom: string;
  cantor: string;
  letra: string;
  categoria: string;
  observacoes?: string;
  tipo: 'comum' | 'harpa';
  numeroHarpa?: number;
  criadoEm: string;
  atualizadoEm: string;
}

export interface HinoNoRepertorio {
  id: string;
  hinoId: string;
  ordem: number;
  nome: string;
  tom: string;
  cantor: string;
  letra?: string;
  numeroHarpa?: number;
  observacoes?: string;
}

export interface Repertorio {
  id: string;
  nome: string;
  data: string;
  horario?: string;
  observacoes?: string;
  hinos: HinoNoRepertorio[];
  criadoEm: string;
  atualizadoEm: string;
}

export interface Configuracoes {
  id?: string;
  nomeIgreja: string;
  responsavel: string;
  rodapePdf: string;
  logo?: string; // Base64 encoded image
  tituloSistema?: string; // Título customizado do sistema
  logoSistema?: string; // Logo do cabeçalho do sistema
  subtitulo?: string; // Subtítulo do sistema
}

export interface HarpaItem {
  numero: number;
  nome: string;
}
