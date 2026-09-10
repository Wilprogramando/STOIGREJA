import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Pencil, RotateCcw, Tag } from 'lucide-react';
import {
  lerCategorias,
  adicionarCategoria,
  removerCategoria,
  renomearCategoria,
  moverCategoria,
  restaurarCategorias,
  registrarCategorias,
} from '../services/categorias';
import { getAllHinos } from '../services/db';

/**
 * Cadastro das categorias usadas nos hinos (Manancial, Alfa, Louvor...).
 * A lista aparece nos campos "Categoria" do cadastro e da Harpa.
 */
export const CategoriasConfig: React.FC = () => {
  const [categorias, setCategorias] = useState<string[]>(() => lerCategorias());
  const [nova, setNova] = useState('');
  const [aviso, setAviso] = useState('');
  /** Quantos hinos usam cada categoria, para avisar antes de apagar. */
  const [usoPorCategoria, setUsoPorCategoria] = useState<Record<string, number>>({});

  useEffect(() => {
    // Categorias que já estão gravadas nos hinos entram na lista sozinhas.
    getAllHinos()
      .then(hinos => {
        setCategorias(registrarCategorias(hinos.map(h => h.categoria)));

        const uso: Record<string, number> = {};
        hinos.forEach(h => {
          const chave = (h.categoria || '').trim().toLocaleLowerCase('pt-BR');
          if (chave) uso[chave] = (uso[chave] || 0) + 1;
        });
        setUsoPorCategoria(uso);
      })
      .catch(erro => console.error('Não foi possível ler as categorias dos hinos:', erro));
  }, []);

  const quantosUsam = (nome: string) =>
    usoPorCategoria[(nome || '').trim().toLocaleLowerCase('pt-BR')] || 0;

  const incluir = () => {
    const nome = nova.trim();
    if (!nome) return;

    if (categorias.some(c => c.toLocaleLowerCase('pt-BR') === nome.toLocaleLowerCase('pt-BR'))) {
      setAviso(`"${nome}" já está na lista.`);
      return;
    }

    setCategorias(adicionarCategoria(nome));
    setNova('');
    setAviso('');
  };

  const apagar = (nome: string) => {
    const usos = quantosUsam(nome);
    const recado = usos
      ? `${usos} hino(s) usam "${nome}". Eles continuam com esse nome gravado, mas a categoria sai da lista de escolha. Apagar?`
      : `Apagar a categoria "${nome}"?`;

    if (!confirm(recado)) return;

    const nova = removerCategoria(nome);
    if (nova.length === categorias.length) {
      setAviso('Deixe pelo menos uma categoria cadastrada.');
      return;
    }

    setCategorias(nova);
    setAviso('');
  };

  const renomear = (nome: string) => {
    const escolhido = prompt(`Novo nome para "${nome}":`, nome);
    if (escolhido === null) return;

    const limpo = escolhido.trim();
    if (!limpo || limpo === nome) return;

    setCategorias(renomearCategoria(nome, limpo));
    setAviso(
      quantosUsam(nome)
        ? `Renomeada. Os hinos já cadastrados continuam com "${nome}" gravado — edite cada um para trocar.`
        : ''
    );
  };

  const mover = (nome: string, passo: number) => setCategorias(moverCategoria(nome, passo));

  const restaurar = () => {
    if (!confirm('Voltar para as categorias originais (Alfa, Manancial, Louvor, Consagração, Outro)?')) return;
    setCategorias(restaurarCategorias());
    setAviso('');
  };

  return (
    <div>
      <p className="text-sm text-gray-500 mb-3">
        Estas categorias aparecem no campo "Categoria" ao cadastrar um hino, na ordem
        desta lista.
      </p>

      <div className="flex gap-2 mb-3">
        <input
          value={nova}
          onChange={e => setNova(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && incluir()}
          placeholder="Nome da categoria (ex.: Manancial)"
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
        />
        <button
          onClick={incluir}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium flex items-center gap-2 shrink-0"
        >
          <Plus size={18} />
          Incluir
        </button>
      </div>

      {aviso && (
        <p className="mb-3 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          {aviso}
        </p>
      )}

      <div className="space-y-2">
        {categorias.map((categoria, indice) => {
          const usos = quantosUsam(categoria);

          return (
            <div
              key={categoria}
              className="flex items-center gap-2 p-3 rounded-lg border border-gray-200"
            >
              <Tag size={16} className="shrink-0 text-indigo-600" />

              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-800 truncate">{categoria}</p>
                <p className="text-xs text-gray-400">
                  {usos ? `${usos} hino(s)` : 'nenhum hino ainda'}
                </p>
              </div>

              <div className="shrink-0 flex gap-1">
                <button
                  onClick={() => mover(categoria, -1)}
                  disabled={indice === 0}
                  title="Subir"
                  className="px-2 py-1 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-30 text-sm font-bold"
                >
                  ↑
                </button>
                <button
                  onClick={() => mover(categoria, 1)}
                  disabled={indice === categorias.length - 1}
                  title="Descer"
                  className="px-2 py-1 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-30 text-sm font-bold"
                >
                  ↓
                </button>
                <button
                  onClick={() => renomear(categoria)}
                  title="Renomear"
                  className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition"
                >
                  <Pencil size={16} />
                </button>
                <button
                  onClick={() => apagar(categoria)}
                  title="Apagar"
                  className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <button
        onClick={restaurar}
        className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-medium"
      >
        <RotateCcw size={16} />
        Voltar às categorias originais
      </button>

      <p className="text-xs text-gray-500 mt-3">
        A lista fica guardada neste aparelho. Categorias já usadas em hinos entram
        sozinhas na lista.
      </p>
    </div>
  );
};
