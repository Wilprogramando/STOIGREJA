import React, { useEffect, useState } from 'react';
import { Check, Download, Share, PlusSquare, MoreVertical } from 'lucide-react';
import {
  podeInstalar,
  jaInstalado,
  ehIOS,
  instalar,
  ouvirInstalacao,
} from '../services/instalar';

/** Um passo do "como fazer à mão", com o ícone do botão que a pessoa procura. */
const Passo: React.FC<{ numero: number; icone?: React.ElementType; children: React.ReactNode }> = ({
  numero,
  icone: Icone,
  children,
}) => (
  <li className="flex items-start gap-2.5">
    <span className="shrink-0 w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center">
      {numero}
    </span>
    <span className="text-sm text-gray-700 leading-snug flex-1">
      {children}
      {Icone && <Icone size={15} className="inline-block align-text-bottom mx-1 text-gray-500" />}
    </span>
  </li>
);

/**
 * Configurações > Instalar no Celular.
 *
 * Três situações, e a tela mostra só a que vale para quem está olhando:
 *
 * 1. o navegador aceita instalar com um toque (Chrome no Android, Edge e
 *    Chrome no computador) - aparece o botão;
 * 2. iPhone/iPad - o Safari não tem botão nenhum para o site chamar, então
 *    aparece o caminho pelo menu Compartilhar;
 * 3. já está instalado - só o aviso, para ninguém instalar duas vezes.
 */
export const InstalarApp: React.FC = () => {
  const [instalado, setInstalado] = useState(() => jaInstalado());
  const [disponivel, setDisponivel] = useState(() => podeInstalar());
  const [recusou, setRecusou] = useState(false);
  const iOS = ehIOS();

  // O convite do navegador pode chegar depois desta tela abrir.
  useEffect(() => {
    return ouvirInstalacao(() => {
      setDisponivel(podeInstalar());
      setInstalado(jaInstalado());
    });
  }, []);

  const handleInstalar = async () => {
    const resposta = await instalar();

    if (resposta === 'instalado') setInstalado(true);
    if (resposta === 'recusado') setRecusou(true);
    setDisponivel(podeInstalar());
  };

  if (instalado) {
    return (
      <div className="flex items-start gap-3 p-3 rounded-xl bg-green-50 border border-green-200">
        <span className="shrink-0 w-8 h-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center">
          <Check size={17} />
        </span>
        <div>
          <p className="text-sm font-semibold text-green-800">Já está instalado neste aparelho</p>
          <p className="text-xs text-green-700 mt-0.5">
            O sistema está aberto como aplicativo. O ícone fica na tela inicial, junto dos
            outros apps, e abre sem a barra do navegador.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Dá para guardar o sistema na tela inicial do celular, com ícone próprio, igual a um
        aplicativo: abre em tela cheia, sem a barra do navegador, e continua funcionando sem
        internet durante o culto.
      </p>

      {disponivel && (
        <>
          <button
            onClick={handleInstalar}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition"
          >
            <Download size={18} />
            Instalar na tela inicial
          </button>

          {recusou && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
              A instalação foi cancelada. Pode tocar no botão de novo quando quiser — e se ele
              não voltar a aparecer, feche e abra o sistema outra vez.
            </p>
          )}
        </>
      )}

      {!disponivel && iOS && (
        <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
          <p className="text-sm font-semibold text-gray-900 mb-2">
            No iPhone e no iPad é pelo Safari
          </p>
          <ol className="space-y-2">
            <Passo numero={1} icone={Share}>
              Toque no botão Compartilhar, embaixo na barra do Safari
            </Passo>
            <Passo numero={2} icone={PlusSquare}>
              Escolha "Adicionar à Tela de Início"
            </Passo>
            <Passo numero={3}>Confirme em "Adicionar", no canto de cima</Passo>
          </ol>
          <p className="text-[11px] text-gray-500 mt-2.5">
            O iPhone só instala pelo Safari. Se o sistema estiver aberto no Chrome, abra o
            mesmo endereço no Safari primeiro.
          </p>
        </div>
      )}

      {!disponivel && !iOS && (
        <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
          <p className="text-sm font-semibold text-gray-900 mb-2">
            Instalar pelo menu do navegador
          </p>
          <ol className="space-y-2">
            <Passo numero={1} icone={MoreVertical}>
              Toque nos três pontinhos do navegador
            </Passo>
            <Passo numero={2}>
              Escolha "Instalar aplicativo" ou "Adicionar à tela inicial"
            </Passo>
            <Passo numero={3}>Confirme em "Instalar"</Passo>
          </ol>
          <p className="text-[11px] text-gray-500 mt-2.5">
            O botão automático não apareceu aqui. Isso acontece quando o navegador não oferece
            instalação (navegação privada, por exemplo) ou quando o sistema já foi instalado
            neste aparelho — nesse caso, procure o ícone na tela inicial.
          </p>
        </div>
      )}
    </div>
  );
};
