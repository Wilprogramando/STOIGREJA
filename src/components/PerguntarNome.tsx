import React, { useEffect, useRef, useState } from 'react';
import { Music } from 'lucide-react';
import { carregarNomePessoa, salvarNomePessoa } from '../services/usuario';

interface PerguntarNomeProps {
  /** Chamado depois de responder. */
  onPronto: () => void;
}

/**
 * Pergunta o nome na PRIMEIRA vez que o sistema é aberto em cada aparelho.
 *
 * Só isto: nome, e entra. Não é login, não tem senha - o sistema continua
 * aberto para quem tem o endereço. O nome serve para a saudação do Dashboard
 * e para as Configurações mostrarem quem está conectado.
 *
 * Não tem como passar sem responder, de propósito: um aparelho sem nome é
 * justamente o que não dá para identificar na lista de quem está conectado.
 * Depois de responder, a pergunta não volta mais - o nome é trocado em
 * Configurações.
 *
 * A pergunta espera a resposta do Supabase antes de aparecer (ver
 * carregarNomePessoa): quem já respondeu uma vez e depois limpou os dados do
 * navegador não é perguntado de novo, e ninguém vê a tela piscar.
 */
export const PerguntarNome: React.FC<PerguntarNomeProps> = ({ onPronto }) => {
  const [mostrar, setMostrar] = useState(false);
  const [nome, setNome] = useState('');
  const [salvando, setSalvando] = useState(false);
  const campo = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelado = false;

    carregarNomePessoa().then(encontrado => {
      if (cancelado) return;

      // Nome recuperado do Supabase: não pergunta nada, mas avisa igual, para
      // o aparelho voltar a aparecer com o nome na lista de quem está online.
      if (encontrado) onPronto();
      else setMostrar(true);
    });

    return () => {
      cancelado = true;
    };
  }, []);

  // O teclado do celular já abre no campo, para não ter nem esse toque extra.
  useEffect(() => {
    if (mostrar) campo.current?.focus();
  }, [mostrar]);

  if (!mostrar) return null;

  const confirmar = (evento: React.FormEvent) => {
    evento.preventDefault();
    if (!nome.trim() || salvando) return;

    setSalvando(true);
    salvarNomePessoa(nome);
    setMostrar(false);
    onPronto();
  };

  return (
    // z-[70]: acima da sidebar e da barra de baixo, para ser a primeira coisa
    // que a pessoa vê ao abrir o sistema.
    <div className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center p-4">
      <form
        onSubmit={confirmar}
        className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 animate-fade-in"
      >
        <div className="flex flex-col items-center text-center">
          <span className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
            <Music size={26} />
          </span>

          <h2 className="mt-4 text-xl font-bold text-gray-900">Paz do Senhor! 🙌</h2>
          <p className="mt-1 text-sm text-gray-600">
            Como você se chama? Vamos usar o seu nome para te cumprimentar e para a equipe
            saber quem está com o sistema aberto.
          </p>
        </div>

        <input
          ref={campo}
          type="text"
          value={nome}
          onChange={e => setNome(e.target.value)}
          placeholder="Seu nome"
          maxLength={40}
          autoComplete="name"
          className="mt-5 w-full px-4 py-3 border border-gray-300 rounded-xl text-center text-base font-semibold focus:border-indigo-500 focus:outline-none"
        />

        <button
          type="submit"
          disabled={!nome.trim() || salvando}
          className="mt-3 w-full px-4 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50 transition"
        >
          Entrar
        </button>

        <p className="mt-3 text-[11px] text-gray-400 text-center">
          Perguntamos só nesta primeira vez, neste aparelho. Depois o nome é trocado em
          Configurações.
        </p>
      </form>
    </div>
  );
};
