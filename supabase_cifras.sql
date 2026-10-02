-- =====================================================================
-- CIFRAS (menu "Tocar por Cifra")
--
-- Como usar:
-- 1. Abra o painel do Supabase do projeto
-- 2. Menu lateral: SQL Editor  ->  New query
-- 3. Cole tudo isto e clique em RUN
--
-- Pode rodar mais de uma vez sem problema (usa IF NOT EXISTS).
--
-- As músicas desta tela ficam só nesta tabela, separadas de hinos_cadastro:
-- lá o que importa é letra, tom e cantor para montar o repertório; aqui é a
-- cifra para tocar na hora.
-- =====================================================================

create table if not exists public.cifras (
  id            text primary key,
  nome          text not null,
  artista       text default '',
  -- Tom em que a cifra foi publicada: é o tom do texto guardado em "cifra".
  tom_original  text default '',
  -- Tom escolhido para tocar. A transposição é feita na hora de mostrar,
  -- então o texto original nunca se perde ao trocar de tom.
  tom_escolhido text default '',
  cifra         text not null,
  afinacao      text default '',
  fonte         text default '',
  criado_em     timestamptz not null default now()
);

create index if not exists cifras_nome_idx on public.cifras (nome);
create index if not exists cifras_criado_em_idx on public.cifras (criado_em desc);

-- =====================================================================
-- PERMISSÕES
--
-- O sistema acessa o Supabase com a chave "anon" (pública), do mesmo jeito
-- que já faz com hinos e repertórios. As regras abaixo liberam leitura e
-- escrita para essa chave — igual às outras tabelas do projeto.
-- =====================================================================

alter table public.cifras enable row level security;

drop policy if exists "cifras_leitura" on public.cifras;
create policy "cifras_leitura"
  on public.cifras for select
  using (true);

drop policy if exists "cifras_insercao" on public.cifras;
create policy "cifras_insercao"
  on public.cifras for insert
  with check (true);

drop policy if exists "cifras_atualizacao" on public.cifras;
create policy "cifras_atualizacao"
  on public.cifras for update
  using (true) with check (true);

drop policy if exists "cifras_exclusao" on public.cifras;
create policy "cifras_exclusao"
  on public.cifras for delete
  using (true);
