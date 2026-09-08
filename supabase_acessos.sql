-- =====================================================================
-- ACESSOS POR APARELHO (mostrados em Configurações)
--
-- Como usar:
-- 1. Abra o painel do Supabase do projeto
-- 2. Menu lateral: SQL Editor  ->  New query
-- 3. Cole tudo isto e clique em RUN
--
-- Pode rodar mais de uma vez sem problema (usa IF NOT EXISTS).
--
-- Guarda uma linha por aparelho e por dia, com quantas telas foram abertas.
-- Assim a tela de Configurações mostra os acessos do último mês de todos
-- os aparelhos, sem a tabela crescer sem controle.
-- =====================================================================

create table if not exists public.acessos_aparelhos (
  aparelho_id text not null,
  dia         date not null,
  nome        text not null default 'Aparelho',
  contagem    integer not null default 0,
  atualizado_em timestamptz not null default now(),
  primary key (aparelho_id, dia)
);

create index if not exists acessos_aparelhos_dia on public.acessos_aparelhos (dia);

-- =====================================================================
-- PERMISSÕES
--
-- O sistema acessa o Supabase com a chave "anon" (pública), do mesmo jeito
-- que já faz com hinos e repertórios.
-- =====================================================================

alter table public.acessos_aparelhos enable row level security;

drop policy if exists "acessos_leitura" on public.acessos_aparelhos;
create policy "acessos_leitura"
  on public.acessos_aparelhos for select
  using (true);

drop policy if exists "acessos_insercao" on public.acessos_aparelhos;
create policy "acessos_insercao"
  on public.acessos_aparelhos for insert
  with check (true);

drop policy if exists "acessos_atualizacao" on public.acessos_aparelhos;
create policy "acessos_atualizacao"
  on public.acessos_aparelhos for update
  using (true) with check (true);

drop policy if exists "acessos_exclusao" on public.acessos_aparelhos;
create policy "acessos_exclusao"
  on public.acessos_aparelhos for delete
  using (true);
