-- =====================================================================
-- TABELA DE HINOS JÁ CANTADOS (marcação nos repertórios salvos)
--
-- Como usar:
-- 1. Abra o painel do Supabase do projeto
-- 2. Menu lateral: SQL Editor  ->  New query
-- 3. Cole tudo isto e clique em RUN
--
-- Pode rodar mais de uma vez sem problema (usa IF NOT EXISTS).
-- =====================================================================

create table if not exists public.hinos_cantados (
  repertorio_id text not null,
  hino_id       text not null,
  marcado_em    timestamptz not null default now(),
  primary key (repertorio_id, hino_id)
);

-- Busca por repertório
create index if not exists hinos_cantados_repertorio_idx
  on public.hinos_cantados (repertorio_id);

-- =====================================================================
-- PERMISSÕES
--
-- O sistema acessa o Supabase com a chave "anon" (pública), do mesmo jeito
-- que já faz com hinos e repertórios.
-- =====================================================================

alter table public.hinos_cantados enable row level security;

drop policy if exists "hinos_cantados_leitura" on public.hinos_cantados;
create policy "hinos_cantados_leitura"
  on public.hinos_cantados for select
  using (true);

drop policy if exists "hinos_cantados_insercao" on public.hinos_cantados;
create policy "hinos_cantados_insercao"
  on public.hinos_cantados for insert
  with check (true);

drop policy if exists "hinos_cantados_atualizacao" on public.hinos_cantados;
create policy "hinos_cantados_atualizacao"
  on public.hinos_cantados for update
  using (true) with check (true);

drop policy if exists "hinos_cantados_exclusao" on public.hinos_cantados;
create policy "hinos_cantados_exclusao"
  on public.hinos_cantados for delete
  using (true);
