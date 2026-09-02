-- =====================================================================
-- TABELA DE ANOTAÇÕES (sugestões de hinos)
--
-- Como usar:
-- 1. Abra o painel do Supabase do projeto
-- 2. Menu lateral: SQL Editor  ->  New query
-- 3. Cole tudo isto e clique em RUN
--
-- Pode rodar mais de uma vez sem problema (usa IF NOT EXISTS).
-- =====================================================================

create table if not exists public.anotacoes_hinos (
  id          text primary key,
  hino        text not null,
  cantor      text default '',
  tom         text default '',
  observacoes text default '',
  criado_em   timestamptz not null default now()
);

-- Busca das mais recentes primeiro
create index if not exists anotacoes_hinos_criado_em_idx
  on public.anotacoes_hinos (criado_em desc);

-- =====================================================================
-- PERMISSÕES
--
-- O sistema acessa o Supabase com a chave "anon" (pública), do mesmo jeito
-- que já faz com hinos e repertórios. As regras abaixo liberam leitura e
-- escrita para essa chave — igual às outras tabelas do projeto.
-- =====================================================================

alter table public.anotacoes_hinos enable row level security;

drop policy if exists "anotacoes_leitura" on public.anotacoes_hinos;
create policy "anotacoes_leitura"
  on public.anotacoes_hinos for select
  using (true);

drop policy if exists "anotacoes_insercao" on public.anotacoes_hinos;
create policy "anotacoes_insercao"
  on public.anotacoes_hinos for insert
  with check (true);

drop policy if exists "anotacoes_atualizacao" on public.anotacoes_hinos;
create policy "anotacoes_atualizacao"
  on public.anotacoes_hinos for update
  using (true) with check (true);

drop policy if exists "anotacoes_exclusao" on public.anotacoes_hinos;
create policy "anotacoes_exclusao"
  on public.anotacoes_hinos for delete
  using (true);
