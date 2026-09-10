import React, { useState, useEffect } from "react";
import {
  Plus,
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
  Check,
  X,
  Music4,
  Mic2,
  Users,
  Sparkles,
  Loader2,
} from "lucide-react";
import { addHino, updateHino, deleteHino, getAllHinos } from "../services/db";
import { generateHinoPdf, shareViaWhatsApp } from "../services/pdf";
import { Hino, Configuracoes } from "../types";
import { ModalVisualizaLetra } from "./ModalVisualizaLetra";
import { lerCantores, sincronizarCantoresDosHinos } from "../services/cantores";
import { lerCategorias } from '../services/categorias';
import { rotuloDoMenu } from '../services/menus';
import { DeletePasswordModal } from "./DeletePasswordModal";
import {
  procurarHino,
  buscarLetraDaSugestao,
  SugestaoLetra,
} from "../services/letras";

interface CadastrarHinoProps {
  configuracoes: Configuracoes | null;
  /**
   * Hino que chega pronto da tela "Hinos Comuns": para editar (com id) ou
   * uma copia para cadastrar de novo (sem id).
   */
  hinoInicial?: Hino | null;
  /** Depois de salvar, o sistema leva para a lista com o hino em destaque. */
  onSalvo?: (hino: Hino) => void;
}

const TONS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];


/** Card branco padrão da tela. */
const Painel: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = "",
}) => (
  <div
    className={`bg-white rounded-2xl border border-gray-100 shadow-lg ${className}`}
  >
    {children}
  </div>
);

/** Botão redondo de ação do hino. */
const BotaoAcao = ({ icon: Icon, titulo, cor, onClick }: any) => (
  <button
    onClick={onClick}
    title={titulo}
    className={`p-1.5 rounded-lg transition ${cor}`}
  >
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

const FORM_VAZIO = {
  nome: "",
  tom: "C",
  cantor: "",
  letra: "",
  categoria: "Manancial",
  observacoes: "",
};

export const CadastrarHino: React.FC<CadastrarHinoProps> = ({
  configuracoes,
  hinoInicial,
  onSalvo,
}) => {
  const [hinos, setHinos] = useState<Hino[]>([]);
  // Esta tela so serve para cadastrar: o formulario ja abre pronto.
  const [showForm, setShowForm] = useState(true);
  const [editando, setEditando] = useState<Hino | null>(
    hinoInicial && hinoInicial.id ? hinoInicial : null
  );
  const [cantores, setCantores] = useState<string[]>(() => lerCantores());

  /** Busca automatica da letra no Letras.mus.br. */
  const [buscandoLetra, setBuscandoLetra] = useState(false);
  const [sugestoesLetra, setSugestoesLetra] = useState<SugestaoLetra[]>([]);
  const [avisoBusca, setAvisoBusca] = useState("");

  const [formData, setFormData] = useState(
    hinoInicial
      ? {
          nome: hinoInicial.nome,
          tom: hinoInicial.tom,
          cantor: hinoInicial.cantor,
          letra: hinoInicial.letra,
          categoria: hinoInicial.categoria,
          observacoes: hinoInicial.observacoes || "",
        }
      : { ...FORM_VAZIO }
  );

  useEffect(() => {
    loadHinos();
    // Mantém a lista de cantores em dia com o gerenciador das Configurações.
    sincronizarCantoresDosHinos().then(setCantores);
  }, []);

  const loadHinos = async () => {
    const todos = await getAllHinos();
    setHinos(todos.filter((h) => h.tipo === "comum"));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nome || !formData.cantor) {
      alert("Preencha os campos obrigatórios: Nome e Cantor!");
      return;
    }

    try {
      const agora = new Date().toISOString();

      let salvo: Hino;

      if (editando) {
        salvo = { ...editando, ...formData, atualizadoEm: agora };
        await updateHino(salvo);
      } else {
        salvo = {
          id: Date.now().toString(),
          ...formData,
          tipo: "comum",
          criadoEm: agora,
          atualizadoEm: agora,
        };
        await addHino(salvo);
      }

      setFormData({ ...FORM_VAZIO });
      setEditando(null);
      setSugestoesLetra([]);
      setAvisoBusca("");
      loadHinos();

      // Leva para a lista, com o hino recem-salvo em destaque.
      onSalvo?.(salvo);
    } catch (error) {
      console.error("Erro ao salvar hino:", error);
      alert("Erro ao salvar hino");
    }
  };

  /** Preenche nome, cantor e letra a partir do que veio do Letras.mus.br. */
  const aplicarLetra = (achado: {
    nome: string;
    cantor: string;
    letra: string;
  }) => {
    setFormData((atual) => ({
      ...atual,
      nome: achado.nome || atual.nome,
      // So troca o cantor se ele ja existir na lista das Configuracoes.
      cantor: cantores.includes(achado.cantor) ? achado.cantor : atual.cantor,
      letra: achado.letra,
    }));
    setSugestoesLetra([]);
    setAvisoBusca(
      achado.cantor && !cantores.includes(achado.cantor)
        ? `Letra de ${achado.cantor} carregada. Selecione o cantor abaixo.`
        : "Letra carregada! Confira antes de salvar.",
    );
  };

  const handleBuscarLetra = async () => {
    const termo = formData.nome.trim();
    if (!termo) {
      setAvisoBusca("Digite o nome do hino primeiro.");
      return;
    }

    setBuscandoLetra(true);
    setAvisoBusca("");
    setSugestoesLetra([]);

    try {
      const { letra, resultados } = await procurarHino(termo);

      if (letra) {
        aplicarLetra(letra);
      } else if (resultados.length > 0) {
        setSugestoesLetra(resultados);
        setAvisoBusca("Escolha o hino certo na lista abaixo:");
      } else {
        setAvisoBusca("Nenhum hino encontrado com esse nome.");
      }
    } catch (erro: any) {
      setAvisoBusca(erro?.message || "Erro ao buscar a letra.");
    } finally {
      setBuscandoLetra(false);
    }
  };

  const handleEscolherSugestao = async (sugestao: SugestaoLetra) => {
    setBuscandoLetra(true);
    setAvisoBusca("");
    try {
      aplicarLetra(await buscarLetraDaSugestao(sugestao));
    } catch (erro: any) {
      setAvisoBusca(erro?.message || "Erro ao buscar a letra.");
    } finally {
      setBuscandoLetra(false);
    }
  };

  const handleEditar = (hino: Hino) => {
    setFormData({
      nome: hino.nome,
      tom: hino.tom,
      cantor: hino.cantor,
      letra: hino.letra,
      categoria: hino.categoria,
      observacoes: hino.observacoes || "",
    });
    setEditando(hino);
    setShowForm(true);
    window.scrollTo(0, 0);
  };

  const campo =
    "w-full px-3.5 py-2.5 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition text-sm";

  // Categorias cadastradas em Configuracoes; a atual entra na lista mesmo
  // que tenha sido apagada de la, para o hino nao perder a categoria.
  const cadastradas = lerCategorias();
  const categorias = cadastradas.includes(formData.categoria)
    ? cadastradas
    : [formData.categoria, ...cadastradas].filter(Boolean);

  return (
    <div className="max-w-4xl mx-auto pb-20">
      {/* Cabeçalho */}
      <div className="flex items-start gap-3 mb-5">
        <div className="bg-indigo-50 text-indigo-600 p-2.5 rounded-xl shrink-0">
          <Music2 size={22} />
        </div>
        <div className="min-w-0">
          <h2 className="text-2xl font-bold text-gray-900">
            {editando ? "Editar Hino" : rotuloDoMenu("cadastrar-hino")}
          </h2>
          <p className="text-sm text-gray-500">
            {editando
              ? "As mudanças aparecem na lista de hinos"
              : `O hino entra na lista ${rotuloDoMenu("hinos-comuns")}`}
          </p>
        </div>
      </div>

      {/* Botão Novo Hino */}
      {!showForm && (
        <button
          onClick={() => {
            setEditando(null);
            setFormData({
              nome: "",
              tom: "C",
              cantor: "",
              letra: "",
              categoria: "Manancial",
              observacoes: "",
            });
            setShowForm(true);
          }}
          className="w-full mb-5 px-4 py-3.5 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition font-semibold flex items-center justify-center gap-2 shadow-lg"
        >
          <Plus size={20} />
          Novo Hino
        </button>
      )}

      {/* Formulário */}
      {showForm && (
        <Painel className="p-4 sm:p-6 mb-5">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            {editando ? "Editar Hino" : "Novo Hino"}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Nome do hino *
              </label>
              <input
                type="text"
                value={formData.nome}
                onChange={(e) =>
                  setFormData({ ...formData, nome: e.target.value })
                }
                className={campo}
                placeholder="Ex: Poderoso Deus"
              />

              {/* Puxa a letra pronta do Letras.mus.br */}
              <button
                type="button"
                onClick={handleBuscarLetra}
                disabled={buscandoLetra}
                className="mt-2 w-full px-4 py-2.5 rounded-xl bg-violet-50 text-violet-700 hover:bg-violet-100 disabled:opacity-60 transition font-semibold text-sm flex items-center justify-center gap-2"
              >
                {buscandoLetra ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Sparkles size={16} />
                )}
                {buscandoLetra ? "Buscando..." : "Buscar letra automaticamente"}
              </button>

              {avisoBusca && (
                <p className="mt-2 text-xs text-gray-600">{avisoBusca}</p>
              )}

              {sugestoesLetra.length > 0 && (
                <div className="mt-2 border border-gray-200 rounded-xl divide-y divide-gray-100 overflow-hidden">
                  {sugestoesLetra.map((sug) => (
                    <button
                      key={sug.dns + "-" + sug.url}
                      type="button"
                      onClick={() => handleEscolherSugestao(sug)}
                      className="w-full text-left px-3 py-2.5 hover:bg-violet-50 transition"
                    >
                      <span className="block text-sm font-semibold text-gray-900 truncate">
                        {sug.nome}
                      </span>
                      <span className="block text-xs text-gray-500 truncate">
                        {sug.cantor}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Tom
                </label>
                <select
                  value={formData.tom}
                  onChange={(e) =>
                    setFormData({ ...formData, tom: e.target.value })
                  }
                  className={campo}
                >
                  {TONS.map((ton) => (
                    <option key={ton} value={ton}>
                      {ton}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Categoria
                </label>
                <select
                  value={formData.categoria}
                  onChange={(e) =>
                    setFormData({ ...formData, categoria: e.target.value })
                  }
                  className={campo}
                >
                  {categorias.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Cantor *
              </label>
              {/* Cantores vêm do gerenciador em Configurações */}
              <select
                value={formData.cantor}
                onChange={(e) =>
                  setFormData({ ...formData, cantor: e.target.value })
                }
                className={campo}
              >
                <option value="">Selecione o cantor</option>
                {formData.cantor && !cantores.includes(formData.cantor) && (
                  <option value={formData.cantor}>{formData.cantor}</option>
                )}
                {cantores.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Letra
              </label>
              <textarea
                value={formData.letra}
                onChange={(e) =>
                  setFormData({ ...formData, letra: e.target.value })
                }
                rows={6}
                className={campo}
                placeholder="Letra do hino (opcional)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Observações
              </label>
              <textarea
                value={formData.observacoes}
                onChange={(e) =>
                  setFormData({ ...formData, observacoes: e.target.value })
                }
                rows={2}
                className={campo}
                placeholder="Observações (opcional)"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="submit"
                className="px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-semibold text-sm flex items-center justify-center gap-2 shadow-md"
              >
                <Check size={18} />
                {editando ? "Atualizar" : "Salvar"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditando(null);
                }}
                className="px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition font-semibold text-sm flex items-center justify-center gap-2"
              >
                <X size={18} />
                Cancelar
              </button>
            </div>
          </form>
        </Painel>
      )}

    </div>
  );
};
