-- =====================================================================
-- TABELA DE CANTORES (gerenciada em Configurações)
--
-- Como usar:
-- 1. Abra o painel do Supabase do projeto
-- 2. Menu lateral: SQL Editor  ->  New query
-- 3. Cole tudo isto e clique em RUN
--
-- Pode rodar mais de uma vez sem problema (usa IF NOT EXISTS).
-- =====================================================================

create table if not exists public.cantores (
  nome      text primary key,
  criado_em timestamptz not null default now()
);

-- =====================================================================
-- PERMISSÕES
--
-- O sistema acessa o Supabase com a chave "anon" (pública), do mesmo jeito
-- que já faz com hinos e repertórios. As regras abaixo liberam leitura e
-- escrita para essa chave — igual às outras tabelas do projeto.
-- =====================================================================

alter table public.cantores enable row level security;

drop policy if exists "cantores_leitura" on public.cantores;
create policy "cantores_leitura"
  on public.cantores for select
  using (true);

drop policy if exists "cantores_insercao" on public.cantores;
create policy "cantores_insercao"
  on public.cantores for insert
  with check (true);

drop policy if exists "cantores_atualizacao" on public.cantores;
create policy "cantores_atualizacao"
  on public.cantores for update
  using (true) with check (true);

drop policy if exists "cantores_exclusao" on public.cantores;
create policy "cantores_exclusao"
  on public.cantores for delete
  using (true);
