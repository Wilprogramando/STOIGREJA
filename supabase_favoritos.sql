-- =====================================================================
-- MÚSICAS FAVORITAS (menu "Ouvir Música")
--
-- Como usar:
-- 1. Abra o painel do Supabase do projeto
-- 2. Menu lateral: SQL Editor  ->  New query
-- 3. Cole tudo isto e clique em RUN
--
-- Pode rodar mais de uma vez sem problema (usa IF NOT EXISTS).
--
-- Guarda os favoritos na nuvem, então a marcação feita em um celular
-- aparece em todos os aparelhos da equipe.
-- =====================================================================

create table if not exists public.favoritos_musicas (
  id        text primary key,
  tipo      text not null default 'cadastrada',  -- 'cadastrada' ou 'internet'
  nome      text not null,
  cantor    text default '',
  capa      text default '',
  previa    text default '',
  youtube   text default '',
  criado_em timestamptz not null default now()
);

create index if not exists favoritos_musicas_criado_em_idx
  on public.favoritos_musicas (criado_em desc);

-- =====================================================================
-- PERMISSÕES
-- O sistema acessa com a chave "anon" (pública), igual aos hinos.
-- =====================================================================

alter table public.favoritos_musicas enable row level security;

drop policy if exists "favoritos_leitura" on public.favoritos_musicas;
create policy "favoritos_leitura" on public.favoritos_musicas for select using (true);

drop policy if exists "favoritos_insercao" on public.favoritos_musicas;
create policy "favoritos_insercao" on public.favoritos_musicas for insert with check (true);

drop policy if exists "favoritos_atualizacao" on public.favoritos_musicas;
create policy "favoritos_atualizacao"
  on public.favoritos_musicas for update using (true) with check (true);

drop policy if exists "favoritos_exclusao" on public.favoritos_musicas;
create policy "favoritos_exclusao" on public.favoritos_musicas for delete using (true);
