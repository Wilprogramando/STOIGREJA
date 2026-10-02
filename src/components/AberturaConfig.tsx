import React, { useState, useEffect, useRef } from 'react';
import { Check, Play, RotateCcw, Eye } from 'lucide-react';
import {
  Abertura,
  MODELOS,
  FUNDOS,
  ABERTURA_PADRAO,
  lerAbertura,
  salvarAbertura,
  aplicarAbertura,
  testarAbertura,
  textoDaAbertura,
  TEXTO_PADRAO,
} from '../services/abertura';

/**
 * Prévia da abertura, dentro de uma caixinha.
 *
 * Usa as mesmas classes da abertura de verdade (o CSS está no index.html), só
 * com .abertura--previa para caber na página em vez de cobrir a tela. Assim o
 * que a pessoa vê aqui é exatamente o que vai aparecer ao abrir o app.
 */
const Previa: React.FC<{ abertura: Abertura }> = ({ abertura }) => {
  const caixa = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (caixa.current) aplicarAbertura(caixa.current, abertura);
  }, [abertura]);

  if (abertura.modelo === 'nenhuma') {
    return (
      <div className="h-[190px] rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center text-center px-6">
        <p className="text-sm text-gray-500">
          Sem abertura: ao abrir, o sistema vai direto para o Dashboard.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={caixa}
      /* key: remonta a caixa a cada troca, para a animação começar do zero. */
      key={`${abertura.modelo}-${abertura.fundo}-${abertura.cor}`}
      className="abertura abertura--previa"
      aria-hidden="true"
    >
      <div className="abertura-logo">
        <span className="abertura-onda" />
        <span className="abertura-onda atrasada" />

        <svg viewBox="0 0 512 512">
          <path
            d="M330 120v168a56 56 0 1 1-32-50V186l-96 24v134a56 56 0 1 1-32-50V180a24 24 0 0 1 18-23l120-30a24 24 0 0 1 22 5 24 24 0 0 1 0 18z"
            fill="currentColor"
          />
        </svg>

        <span className="abertura-barras">
          <span />
          <span />
          <span />
          <span />
          <span />
        </span>
      </div>

      <div className="abertura-nome">{textoDaAbertura(abertura)}</div>

      <div className="abertura-pontos">
        <span />
        <span />
        <span />
      </div>
    </div>
  );
};

/** Liga/desliga com o rótulo ao lado. */
const Chave: React.FC<{
  titulo: string;
  ligado: boolean;
  onMudar: (ligado: boolean) => void;
}> = ({ titulo, ligado, onMudar }) => (
  <button
    onClick={() => onMudar(!ligado)}
    className="w-full flex items-center justify-between gap-3 px-3.5 py-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition text-left"
  >
    <span className="text-sm font-medium text-gray-700">{titulo}</span>
    <span
      className={`shrink-0 w-11 h-6 rounded-full transition relative ${
        ligado ? 'bg-indigo-600' : 'bg-gray-300'
      }`}
    >
      <span
        className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${
          ligado ? 'left-[22px]' : 'left-0.5'
        }`}
      />
    </span>
  </button>
);

/**
 * Configurações > Abertura do Sistema: modelo da animação, cor de fundo e o
 * que aparece junto. Cada toque já vale na próxima abertura do app.
 */
export const AberturaConfig: React.FC = () => {
  const [abertura, setAbertura] = useState<Abertura>(() => lerAbertura());

  const mudar = (novo: Partial<Abertura>) => {
    const atualizado = { ...abertura, ...novo };
    setAbertura(atualizado);
    salvarAbertura(atualizado);
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5">
          <Eye size={15} className="text-gray-400" />
          Como vai ficar
        </p>
        <Previa abertura={abertura} />
      </div>

      {/* Modelo */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">Modelo da abertura</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {MODELOS.map(modelo => {
            const escolhido = abertura.modelo === modelo.id;

            return (
              <button
                key={modelo.id}
                onClick={() => mudar({ modelo: modelo.id })}
                className={`flex items-start gap-2.5 px-3.5 py-3 rounded-xl border text-left transition ${
                  escolhido
                    ? 'border-indigo-600 bg-indigo-50'
                    : 'border-gray-200 bg-white hover:bg-gray-50'
                }`}
              >
                <span
                  className={`shrink-0 mt-0.5 w-5 h-5 rounded-full flex items-center justify-center ${
                    escolhido ? 'bg-indigo-600 text-white' : 'border-2 border-gray-300'
                  }`}
                >
                  {escolhido && <Check size={13} />}
                </span>

                <span className="min-w-0">
                  <span
                    className={`block text-sm font-semibold ${
                      escolhido ? 'text-indigo-700' : 'text-gray-700'
                    }`}
                  >
                    {modelo.nome}
                  </span>
                  <span className="block text-xs text-gray-500">{modelo.descricao}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Fundo - não faz diferença sem abertura. */}
      {abertura.modelo !== 'nenhuma' && (
        <>
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Cor de fundo</p>
            <div className="grid grid-cols-2 gap-2">
              {FUNDOS.map(fundo => {
                const escolhido = abertura.fundo === fundo.id;

                return (
                  <button
                    key={fundo.id}
                    onClick={() => mudar({ fundo: fundo.id })}
                    className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border text-sm font-semibold transition ${
                      escolhido
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <span
                      className="shrink-0 w-5 h-5 rounded-lg border border-black/10"
                      style={{
                        background:
                          fundo.id === 'tema'
                            ? 'linear-gradient(140deg, var(--cor-principal), var(--cor-escura))'
                            : fundo.id === 'claro'
                            ? '#f8fafc'
                            : fundo.id === 'escuro'
                            ? '#0f172a'
                            : abertura.cor,
                      }}
                    />
                    {fundo.nome}
                  </button>
                );
              })}
            </div>
          </div>

          {abertura.fundo === 'personalizada' && (
            <div className="flex items-center gap-3 px-3.5 py-3 rounded-xl border border-gray-200 bg-gray-50">
              <input
                type="color"
                value={abertura.cor}
                onChange={e => mudar({ cor: e.target.value })}
                aria-label="Cor de fundo da abertura"
                className="w-12 h-10 rounded-lg border border-gray-200 bg-white cursor-pointer"
              />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-700">{abertura.cor}</p>
                <p className="text-xs text-gray-500">
                  A nota e o texto trocam entre branco e escuro conforme a cor.
                </p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Chave
              titulo="Mostrar a frase na abertura"
              ligado={abertura.mostrarNome}
              onMudar={mostrarNome => mudar({ mostrarNome })}
            />

            {abertura.mostrarNome && (
              <div className="px-3.5 py-3 rounded-xl border border-gray-200 bg-gray-50">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Frase da abertura
                </label>
                <input
                  type="text"
                  value={abertura.texto}
                  onChange={e => mudar({ texto: e.target.value })}
                  maxLength={60}
                  placeholder={TEXTO_PADRAO}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl bg-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition text-sm"
                />
                <p className="text-xs text-gray-500 mt-1.5">
                  Escreva o que quiser aqui: um versículo, o nome da igreja, uma
                  saudação. Em branco, volta para "{TEXTO_PADRAO}".
                </p>
              </div>
            )}

            <Chave
              titulo="Mostrar os pontinhos de carregando"
              ligado={abertura.mostrarPontos}
              onMudar={mostrarPontos => mudar({ mostrarPontos })}
            />
          </div>
        </>
      )}

      <div className="grid grid-cols-2 gap-2 pt-1">
        <button
          onClick={() => testarAbertura(abertura)}
          disabled={abertura.modelo === 'nenhuma'}
          className="px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Play size={15} />
          Ver em tela cheia
        </button>

        <button
          onClick={() => {
            setAbertura({ ...ABERTURA_PADRAO });
            salvarAbertura({ ...ABERTURA_PADRAO });
          }}
          className="px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition font-semibold text-sm flex items-center justify-center gap-2"
        >
          <RotateCcw size={15} />
          Padrão
        </button>
      </div>

      <p className="text-xs text-gray-500">
        A escolha vale da próxima vez que o app abrir. No celular, a tela que o
        sistema mostra antes (com o ícone do app) não dá para mudar por aqui.
      </p>
    </div>
  );
};
