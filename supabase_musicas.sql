-- =====================================================================
-- MÚSICAS PARA OUVIR (menu "Ouvir Música" > "Minhas músicas")
--
-- Como usar:
-- 1. Abra o painel do Supabase do projeto
-- 2. Menu lateral: SQL Editor  ->  New query
-- 3. Cole tudo isto e clique em RUN
--
-- Pode rodar mais de uma vez sem problema (usa IF NOT EXISTS).
--
-- Cria duas coisas:
--   - a tabela com o cadastro das músicas (nome, cantor, duração, endereço)
--   - o espaço de arquivos ("balde") onde ficam os MP3 enviados
-- =====================================================================

create table if not exists public.musicas_audio (
  id        text primary key,
  nome      text not null,
  cantor    text default '',
  url       text not null,
  arquivo   text default '',
  duracao   integer default 0,
  criado_em timestamptz not null default now()
);

create index if not exists musicas_audio_nome_idx on public.musicas_audio (nome);

-- =====================================================================
-- PERMISSÕES DA TABELA
-- O sistema acessa com a chave "anon" (pública), igual aos hinos.
-- =====================================================================

alter table public.musicas_audio enable row level security;

drop policy if exists "musicas_leitura" on public.musicas_audio;
create policy "musicas_leitura" on public.musicas_audio for select using (true);

drop policy if exists "musicas_insercao" on public.musicas_audio;
create policy "musicas_insercao" on public.musicas_audio for insert with check (true);

drop policy if exists "musicas_atualizacao" on public.musicas_audio;
create policy "musicas_atualizacao" on public.musicas_audio for update using (true) with check (true);

drop policy if exists "musicas_exclusao" on public.musicas_audio;
create policy "musicas_exclusao" on public.musicas_audio for delete using (true);

-- =====================================================================
-- ESPAÇO DE ARQUIVOS DAS MÚSICAS (Storage)
--
-- "public = true" deixa o áudio tocar direto no celular, sem login.
-- O limite por arquivo está em 50 MB - uma música em MP3 costuma ter 5 MB.
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit)
values ('musicas', 'musicas', true, 52428800)
on conflict (id) do update
  set public = true,
      file_size_limit = 52428800;

drop policy if exists "musicas_arquivos_leitura" on storage.objects;
create policy "musicas_arquivos_leitura"
  on storage.objects for select
  using (bucket_id = 'musicas');

drop policy if exists "musicas_arquivos_envio" on storage.objects;
create policy "musicas_arquivos_envio"
  on storage.objects for insert
  with check (bucket_id = 'musicas');

drop policy if exists "musicas_arquivos_exclusao" on storage.objects;
create policy "musicas_arquivos_exclusao"
  on storage.objects for delete
  using (bucket_id = 'musicas');
