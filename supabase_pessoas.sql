-- =====================================================================
-- PESSOAS DOS APARELHOS
--
-- Como usar:
-- 1. Abra o painel do Supabase do projeto
-- 2. Menu lateral: SQL Editor  ->  New query
-- 3. Cole tudo isto e clique em RUN
--
-- Pode rodar mais de uma vez sem problema (usa IF NOT EXISTS).
--
-- O nome que a pessoa escreve na primeira vez que abre o sistema no celular
-- (ver src/services/usuario.ts). Uma linha por aparelho.
--
-- Fica guardado aqui por dois motivos:
-- 1. a lista de Configurações mostra quem é cada aparelho, e o registro não se
--    perde se a pessoa limpar os dados do navegador ou trocar de navegador no
--    mesmo celular;
-- 2. dá para consultar no painel do Supabase quem já acessou o sistema, sem
--    depender de alguém estar conectado naquele momento.
-- =====================================================================

create table if not exists public.pessoas_aparelhos (
  -- O mesmo código de aparelho usado em acessos_aparelhos.
  aparelho_id   text primary key,
  nome          text not null,
  /* Nome tecnico do aparelho ("Android · Chrome"), so para ajudar a
     identificar a linha no painel do Supabase. */
  aparelho      text default '',
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists pessoas_aparelhos_nome
  on public.pessoas_aparelhos (nome);

-- =====================================================================
-- PERMISSÕES
--
-- O sistema acessa o Supabase com a chave "anon" (pública), do mesmo jeito
-- que já faz com hinos e repertórios.
-- =====================================================================

alter table public.pessoas_aparelhos enable row level security;

drop policy if exists "pessoas_leitura" on public.pessoas_aparelhos;
create policy "pessoas_leitura"
  on public.pessoas_aparelhos for select
  using (true);

drop policy if exists "pessoas_insercao" on public.pessoas_aparelhos;
create policy "pessoas_insercao"
  on public.pessoas_aparelhos for insert
  with check (true);

drop policy if exists "pessoas_atualizacao" on public.pessoas_aparelhos;
create policy "pessoas_atualizacao"
  on public.pessoas_aparelhos for update
  using (true) with check (true);

drop policy if exists "pessoas_exclusao" on public.pessoas_aparelhos;
create policy "pessoas_exclusao"
  on public.pessoas_aparelhos for delete
  using (true);
