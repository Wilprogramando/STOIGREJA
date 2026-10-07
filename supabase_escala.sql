-- =====================================================================
-- ESCALA DOS CONJUNTOS
--
-- Duas tabelas:
--   conjuntos        -> o nome de cada conjunto da igreja (e a cor dele)
--   escala_conjuntos -> os dias em que cada conjunto vai tocar
--
-- Como usar:
-- 1. Abra o painel do Supabase do projeto
-- 2. Menu lateral: SQL Editor  ->  New query
-- 3. Cole tudo isto e clique em RUN
--
-- Pode rodar mais de uma vez sem problema (usa IF NOT EXISTS).
-- =====================================================================

create table if not exists public.conjuntos (
  id        text primary key,
  nome      text not null,
  -- Cor do conjunto no calendário (id da cor, ver services/escala.ts)
  cor       text default 'indigo',
  criado_em timestamptz not null default now()
);

create table if not exists public.escala_conjuntos (
  id          text primary key,
  conjunto_id text not null,
  -- Dia do culto em AAAA-MM-DD
  data        date not null,
  horario     text default '',
  observacoes text default '',
  criado_em   timestamptz not null default now()
);

-- O mesmo conjunto não entra duas vezes no mesmo dia e horário
create unique index if not exists escala_conjuntos_dia_idx
  on public.escala_conjuntos (conjunto_id, data, horario);

-- Busca do mês: sempre pela data
create index if not exists escala_conjuntos_data_idx
  on public.escala_conjuntos (data);

-- =====================================================================
-- PERMISSÕES
--
-- O sistema acessa o Supabase com a chave "anon" (pública), do mesmo jeito
-- que já faz com hinos e repertórios. As regras abaixo liberam leitura e
-- escrita para essa chave — igual às outras tabelas do projeto.
-- =====================================================================

alter table public.conjuntos enable row level security;

drop policy if exists "conjuntos_leitura" on public.conjuntos;
create policy "conjuntos_leitura"
  on public.conjuntos for select
  using (true);

drop policy if exists "conjuntos_insercao" on public.conjuntos;
create policy "conjuntos_insercao"
  on public.conjuntos for insert
  with check (true);

drop policy if exists "conjuntos_atualizacao" on public.conjuntos;
create policy "conjuntos_atualizacao"
  on public.conjuntos for update
  using (true) with check (true);

drop policy if exists "conjuntos_exclusao" on public.conjuntos;
create policy "conjuntos_exclusao"
  on public.conjuntos for delete
  using (true);

alter table public.escala_conjuntos enable row level security;

drop policy if exists "escala_leitura" on public.escala_conjuntos;
create policy "escala_leitura"
  on public.escala_conjuntos for select
  using (true);

drop policy if exists "escala_insercao" on public.escala_conjuntos;
create policy "escala_insercao"
  on public.escala_conjuntos for insert
  with check (true);

drop policy if exists "escala_atualizacao" on public.escala_conjuntos;
create policy "escala_atualizacao"
  on public.escala_conjuntos for update
  using (true) with check (true);

drop policy if exists "escala_exclusao" on public.escala_conjuntos;
create policy "escala_exclusao"
  on public.escala_conjuntos for delete
  using (true);
