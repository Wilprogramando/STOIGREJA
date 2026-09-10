import React, { useState, useEffect, useRef } from "react";
import {
  Music,
  Music2,
  Eye,
  Pencil,
  Trash2,
  Download,
  Share2,
  Copy,
  MoreHorizontal,
  Search,
  Music4,
  Mic2,
  Users,
  Plus,
} from "lucide-react";
import { deleteHino, getAllHinos } from "../services/db";
import { generateHinoPdf, shareViaWhatsApp } from "../services/pdf";
import { Hino, Configuracoes } from "../types";
import { ModalVisualizaLetra } from "./ModalVisualizaLetra";
import { DeletePasswordModal } from "./DeletePasswordModal";
import { rotuloDoMenu } from "../services/menus";

interface HinosComunsProps {
  configuracoes: Configuracoes | null;
  /** Abre a tela de cadastro com este hino carregado. */
  onEditar: (hino: Hino) => void;
  /** Abre a tela de cadastro com uma cópia deste hino. */
  onDuplicar: (hino: Hino) => void;
  /** Vai para a tela de cadastro em branco. */
  onNovo: () => void;
  /** Hino recém-cadastrado: aparece destacado e a tela rola até ele. */
  hinoDestaque?: string | null;
}

const TONS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

/** Card branco padrão da tela. */
const Painel: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = "",
}) => (
  <div className={`bg-white rounded-2xl border border-gray-100 shadow-lg ${className}`}>
    {children}
  </div>
);

/** Botão redondo de ação do hino. */
const BotaoAcao = ({ icon: Icon, titulo, cor, onClick }: any) => (
  <button onClick={onClick} title={titulo} className={`p-1.5 rounded-lg transition ${cor}`}>
    <Icon size={15} />
  </button>
);

/** Botão das ações extras, com nome ao lado. */
const AcaoExtra = ({ icon: Icon, texto, cor, onClick }: any) => (
  <button
    onClick={onClick}
    className={`flex-1 px-3 py-2 rounded-xl transition text-xs font-semibold flex items-center justify-center gap-1.5 ${cor}`}
  >
    <Icon size={15} />
    {texto}
  </button>
);

/**
 * Lista de todos os hinos comuns cadastrados.
 *
 * O cadastro de hinos novos fica na tela "Cadastrar Hino"; aqui a pessoa
 * procura, lê a letra, edita, duplica, gera PDF e apaga.
 */
export const HinosComuns: React.FC<HinosComunsProps> = ({
  configuracoes,
  onEditar,
  onDuplicar,
  onNovo,
  hinoDestaque,
}) => {
  const [hinos, setHinos] = useState<Hino[]>([]);
  const [filtros, setFiltros] = useState({ tom: "", cantor: "", nome: "" });
  const [modalLetra, setModalLetra] = useState<Hino | null>(null);
  const [deletePasswordModal, setDeletePasswordModal] = useState<Hino | null>(null);
  /** Qual hino está com as ações extras abertas (PDF, compartilhar, duplicar). */
  const [acoesAbertas, setAcoesAbertas] = useState<string | null>(null);

  const cardDestaque = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadHinos();
  }, []);

  // Ao chegar de um cadastro novo, mostra o hino recém-criado na tela.
  useEffect(() => {
    if (!hinoDestaque || hinos.length === 0) return;

    const id = setTimeout(() => {
      cardDestaque.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 150);

    return () => clearTimeout(id);
  }, [hinoDestaque, hinos]);

  const loadHinos = async () => {
    const todos = await getAllHinos();
    setHinos(todos.filter((h) => h.tipo === "comum"));
  };

  const handleDeletar = async (id: string) => {
    try {
      await deleteHino(id);
      loadHinos();
      setDeletePasswordModal(null);
    } catch (error) {
      console.error("Erro ao deletar hino:", error);
      alert("Erro ao deletar hino");
    }
  };

  const hinosFiltrados = hinos.filter((hino) => {
    const nomeMatch = hino.nome.toLowerCase().includes(filtros.nome.toLowerCase());
    const tomMatch = !filtros.tom || hino.tom === filtros.tom;
    const cantorMatch = hino.cantor.toLowerCase().includes(filtros.cantor.toLowerCase());
    return nomeMatch && tomMatch && cantorMatch;
  });

  const campo =
    "w-full px-3.5 py-2.5 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition text-sm";

  return (
    <div className="max-w-4xl mx-auto pb-20">
      {/* Cabeçalho */}
      <div className="mb-5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg p-4 sm:p-5">
        <div className="flex items-center gap-4">
          <div className="shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white bg-opacity-20 flex items-center justify-center">
            <Music2 size={30} />
          </div>

          <div className="flex-1 min-w-0">
            <h2 className="text-2xl sm:text-3xl font-extrabold leading-tight break-words">
              {rotuloDoMenu("hinos-comuns")}
            </h2>
            <p className="text-sm text-indigo-100">
              Todos os hinos cadastrados pela equipe
            </p>
          </div>

          {/* O total vira o número em destaque do cabeçalho. */}
          <div className="shrink-0 text-center px-3 py-2 rounded-2xl bg-white bg-opacity-20">
            <p className="text-2xl sm:text-3xl font-extrabold leading-none tabular-nums">
              {hinos.length}
            </p>
            <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-indigo-100 mt-1">
              hinos
            </p>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <Painel className="p-3 sm:p-4 mb-5">
        <div className="relative mb-3">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
          <input
            type="text"
            placeholder="Pesquisar hino..."
            value={filtros.nome}
            onChange={(e) => setFiltros({ ...filtros, nome: e.target.value })}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center pointer-events-none">
              <Music4 size={16} />
            </span>
            <select
              value={filtros.tom}
              onChange={(e) => setFiltros({ ...filtros, tom: e.target.value })}
              className={`${campo} pl-12`}
            >
              <option value="">Todos os tons</option>
              {TONS.map((ton) => (
                <option key={ton} value={ton}>
                  {ton}
                </option>
              ))}
            </select>
          </div>

          <div className="relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center pointer-events-none">
              <Mic2 size={16} />
            </span>
            <input
              type="text"
              placeholder="Cantor..."
              value={filtros.cantor}
              onChange={(e) => setFiltros({ ...filtros, cantor: e.target.value })}
              className={`${campo} pl-12`}
            />
          </div>
        </div>
      </Painel>

      {/* Lista de hinos */}
      <div className="space-y-3">
        {hinosFiltrados.length === 0 ? (
          <Painel className="text-center py-12">
            <Music className="mx-auto text-gray-300 mb-3" size={40} />
            <p className="text-gray-500 mb-4">
              {hinos.length === 0
                ? "Nenhum hino cadastrado ainda"
                : "Nenhum hino encontrado"}
            </p>

            {hinos.length === 0 && (
              <button
                onClick={onNovo}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-semibold text-sm"
              >
                <Plus size={18} />
                Cadastrar o primeiro hino
              </button>
            )}
          </Painel>
        ) : (
          hinosFiltrados.map((hino) => {
            const aberto = acoesAbertas === hino.id;
            const destacado = hinoDestaque === hino.id;

            return (
              <div key={hino.id} ref={destacado ? cardDestaque : undefined}>
                <Painel
                  className={`p-3 sm:p-4 border-l-4 ${
                    destacado
                      ? "border-l-green-500 ring-2 ring-green-400"
                      : "border-l-indigo-500"
                  }`}
                >
                  {destacado && (
                    <p className="mb-2 text-xs font-bold text-green-700 bg-green-50 border border-green-200 rounded-lg px-2.5 py-1 inline-block">
                      Hino cadastrado agora
                    </p>
                  )}

                  <div className="flex items-center gap-3">
                    <div className="shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      <Music2 size={26} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 break-words text-base sm:text-lg leading-tight">
                        {hino.nome}
                      </h3>

                      <div className="flex items-end justify-between gap-3 mt-1.5">
                        <div className="min-w-0">
                          {/* Mesmo destaque dos repertorios salvos: tom em verde, cantor em azul. */}
                          <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                            <span className="shrink-0 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                              Tom: {hino.tom || "?"}
                            </span>
                            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 break-words">
                              {hino.cantor || "?"}
                            </span>
                          </div>

                          <p className="flex items-center gap-1.5 text-xs text-gray-500 mt-1.5">
                            <Users size={14} className="shrink-0" />
                            {hino.categoria}
                          </p>
                        </div>

                        {/* Ações principais */}
                        <div className="shrink-0 flex gap-1">
                          <BotaoAcao
                            icon={Eye}
                            titulo="Ver letra"
                            cor="bg-blue-50 text-blue-600 hover:bg-blue-100"
                            onClick={() => setModalLetra(hino)}
                          />
                          <BotaoAcao
                            icon={Pencil}
                            titulo="Editar"
                            cor="bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
                            onClick={() => onEditar(hino)}
                          />
                          <BotaoAcao
                            icon={Trash2}
                            titulo="Apagar"
                            cor="bg-red-50 text-red-600 hover:bg-red-100"
                            onClick={() => setDeletePasswordModal(hino)}
                          />
                          <BotaoAcao
                            icon={MoreHorizontal}
                            titulo="Mais opções"
                            cor={
                              aberto
                                ? "bg-gray-700 text-white"
                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            }
                            onClick={() => setAcoesAbertas(aberto ? null : hino.id)}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Ações extras */}
                  {aberto && (
                    <div className="mt-3 pt-3 border-t border-gray-100 flex gap-2">
                      <AcaoExtra
                        icon={Download}
                        texto="PDF"
                        cor="bg-orange-50 text-orange-700 hover:bg-orange-100"
                        onClick={() => generateHinoPdf(hino, configuracoes)}
                      />
                      <AcaoExtra
                        icon={Share2}
                        texto="Compartilhar"
                        cor="bg-green-50 text-green-700 hover:bg-green-100"
                        onClick={() =>
                          shareViaWhatsApp(
                            `Confira o hino: ${hino.nome} (Tom: ${hino.tom}, Cantor: ${hino.cantor})`,
                          )
                        }
                      />
                      <AcaoExtra
                        icon={Copy}
                        texto="Duplicar"
                        cor="bg-purple-50 text-purple-700 hover:bg-purple-100"
                        onClick={() => onDuplicar(hino)}
                      />
                    </div>
                  )}
                </Painel>
              </div>
            );
          })
        )}
      </div>

      {/* Modals */}
      {modalLetra && (
        <ModalVisualizaLetra hino={modalLetra} onClose={() => setModalLetra(null)} />
      )}

      {deletePasswordModal && (
        <DeletePasswordModal
          hinoNome={deletePasswordModal.nome}
          onConfirm={() => handleDeletar(deletePasswordModal.id)}
          onCancel={() => setDeletePasswordModal(null)}
        />
      )}
    </div>
  );
};
