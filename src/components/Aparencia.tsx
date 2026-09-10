import React, { useState } from 'react';
import {
  Check,
  Sun,
  Moon,
  SunMoon,
  RotateCcw,
  AlignLeft,
  AlignRight,
  Music,
  Menu,
} from 'lucide-react';
import {
  Tema,
  PALETAS,
  TEMA_PADRAO,
  lerTema,
  salvarTema,
  paletaDe,
  estaEscuro,
  ModoCor,
  Densidade,
  EstiloCabecalho,
  PosicaoLogo,
} from '../services/tema';

interface AparenciaProps {
  /** Título e logo atuais, só para a pré-visualização ficar parecida com o real. */
  tituloSistema?: string;
  logoSistema?: string;
  subtitulo?: string;
}

/** Grupo de botões onde só um fica escolhido. */
const Escolha = <T extends string | boolean>({
  titulo,
  valor,
  opcoes,
  onEscolher,
}: {
  titulo: string;
  valor: T;
  opcoes: { valor: T; label: string; icone?: React.ElementType }[];
  onEscolher: (valor: T) => void;
}) => (
  <div>
    <p className="text-sm font-medium text-gray-700 mb-2">{titulo}</p>
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {opcoes.map(opcao => {
        const Icone = opcao.icone;
        const escolhido = valor === opcao.valor;

        return (
          <button
            key={String(opcao.valor)}
            onClick={() => onEscolher(opcao.valor)}
            className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-semibold transition ${
              escolhido
                ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {Icone && <Icone size={16} />}
            {opcao.label}
          </button>
        );
      })}
    </div>
  </div>
);

/**
 * Aparência do sistema: cor, lado da logo, modo noturno, cabeçalho e densidade.
 *
 * Cada toque já vale na hora (o tema é aplicado no <html>), então a própria
 * tela em volta serve de prévia — e ainda existe a miniatura do cabeçalho.
 */
export const Aparencia: React.FC<AparenciaProps> = ({
  tituloSistema,
  logoSistema,
  subtitulo,
}) => {
  const [tema, setTema] = useState<Tema>(() => lerTema());

  const mudar = (novo: Partial<Tema>) => {
    const atualizado = { ...tema, ...novo };
    setTema(atualizado);
    salvarTema(atualizado);
  };

  const restaurar = () => {
    setTema({ ...TEMA_PADRAO });
    salvarTema({ ...TEMA_PADRAO });
  };

  const paleta = paletaDe(tema.cor);
  const escuro = estaEscuro(tema);
  const logoADireita = tema.posicaoLogo === 'direita';

  const logoPrevia = logoSistema ? (
    <img src={logoSistema} alt="" style={{ height: 22, borderRadius: 3 }} />
  ) : (
    <Music size={18} className="text-white" />
  );

  return (
    <div className="space-y-5">
      {/* Prévia do cabeçalho */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">Como vai ficar</p>

        <div
          className="rounded-xl overflow-hidden border"
          style={{ borderColor: escuro ? '#334155' : '#e5e7eb' }}
        >
          <div
            className="px-3 py-2.5 flex items-center justify-between gap-2 text-white"
            style={{
              backgroundImage: `linear-gradient(to right, ${paleta.principal}, ${paleta.escura})`,
              borderBottomLeftRadius: tema.cabecalho === 'curvo' ? 18 : 0,
              borderBottomRightRadius: tema.cabecalho === 'curvo' ? 18 : 0,
            }}
          >
            <div className="flex items-center gap-2 min-w-0">
              <Menu size={16} className="shrink-0 opacity-90" />
              {!logoADireita && logoPrevia}
              <div className="min-w-0">
                <p className="text-xs font-bold truncate">
                  {tituloSistema || 'Repertório da Igreja'}
                </p>
                <p className="text-[10px] opacity-80 truncate">
                  {subtitulo || 'Gerenciador de hinos e cultos'}
                </p>
              </div>
            </div>

            {logoADireita && logoPrevia}
          </div>

          {tema.cabecalho === 'onda' && (
            <svg
              viewBox="0 0 1440 60"
              preserveAspectRatio="none"
              className="w-full h-2.5 -mt-px"
              style={{ color: escuro ? '#0f172a' : '#f3f4f6', display: 'block' }}
            >
              <path
                fill="currentColor"
                d="M0,38 C300,56 620,54 900,44 C1130,36 1300,34 1440,40 L1440,60 L0,60 Z"
              />
            </svg>
          )}

          <div
            className="p-3 flex items-center gap-2"
            style={{ backgroundColor: escuro ? '#0f172a' : '#f3f4f6' }}
          >
            <span
              className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-white"
              style={{
                backgroundColor: paleta.principal,
                borderRadius: tema.arredondado ? 8 : 3,
              }}
            >
              Botão
            </span>
            <span
              className="px-2.5 py-1 text-[11px] font-semibold"
              style={{
                backgroundColor: escuro ? '#1e293b' : '#ffffff',
                color: escuro ? '#e2e8f0' : '#111827',
                borderRadius: tema.arredondado ? 8 : 3,
              }}
            >
              Cartão
            </span>
          </div>
        </div>
      </div>

      {/* Cor */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">Cor do cabeçalho e dos botões</p>

        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {PALETAS.map(opcao => {
            const escolhida = tema.cor === opcao.id;

            return (
              <button
                key={opcao.id}
                onClick={() => mudar({ cor: opcao.id })}
                title={opcao.nome}
                className={`relative rounded-xl border-2 p-2 transition ${
                  escolhida ? 'border-gray-900' : 'border-transparent hover:border-gray-300'
                }`}
              >
                <span
                  className="block h-8 rounded-lg"
                  style={{
                    backgroundImage: `linear-gradient(to right, ${opcao.principal}, ${opcao.escura})`,
                  }}
                />
                <span className="block mt-1 text-[11px] font-semibold text-gray-600 truncate">
                  {opcao.nome}
                </span>

                {escolhida && (
                  <span className="absolute top-3 right-3 bg-white rounded-full p-0.5 shadow">
                    <Check size={12} className="text-gray-900" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <Escolha<ModoCor>
        titulo="Modo de cor"
        valor={tema.modo}
        onEscolher={modo => mudar({ modo })}
        opcoes={[
          { valor: 'claro', label: 'Claro', icone: Sun },
          { valor: 'escuro', label: 'Noturno', icone: Moon },
          { valor: 'automatico', label: 'Automático', icone: SunMoon },
        ]}
      />

      <p className="-mt-3 text-xs text-gray-500">
        No automático o sistema acompanha o aparelho: fica noturno quando o celular estiver
        no modo escuro.
      </p>

      <Escolha<PosicaoLogo>
        titulo="Lado da logo"
        valor={tema.posicaoLogo}
        onEscolher={posicaoLogo => mudar({ posicaoLogo })}
        opcoes={[
          { valor: 'esquerda', label: 'Esquerda', icone: AlignLeft },
          { valor: 'direita', label: 'Direita', icone: AlignRight },
        ]}
      />

      <Escolha<EstiloCabecalho>
        titulo="Base do cabeçalho"
        valor={tema.cabecalho}
        onEscolher={cabecalho => mudar({ cabecalho })}
        opcoes={[
          { valor: 'onda', label: 'Onda' },
          { valor: 'curvo', label: 'Arredondado' },
          { valor: 'reto', label: 'Reto' },
        ]}
      />

      <Escolha<Densidade>
        titulo="Espaçamento"
        valor={tema.densidade}
        onEscolher={densidade => mudar({ densidade })}
        opcoes={[
          { valor: 'confortavel', label: 'Confortável' },
          { valor: 'compacto', label: 'Compacto' },
        ]}
      />

      <p className="-mt-3 text-xs text-gray-500">
        O compacto aperta as margens e mostra mais hinos por tela — bom para o celular
        durante o culto.
      </p>

      <Escolha<boolean>
        titulo="Cantos"
        valor={tema.arredondado}
        onEscolher={arredondado => mudar({ arredondado })}
        opcoes={[
          { valor: true, label: 'Arredondados' },
          { valor: false, label: 'Retos' },
        ]}
      />

      <button
        onClick={restaurar}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-medium"
      >
        <RotateCcw size={16} />
        Voltar à aparência original
      </button>

      <p className="text-xs text-gray-500">
        A aparência vale para este aparelho. Cada celular da equipe pode ter a sua.
      </p>
    </div>
  );
};
