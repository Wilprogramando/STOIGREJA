-- =====================================================================
-- APARÊNCIA DO SISTEMA (Configurações > Aparência)
--
-- Como usar:
-- 1. Abra o painel do Supabase do projeto
-- 2. Menu lateral: SQL Editor  ->  New query
-- 3. Cole tudo isto e clique em RUN
--
-- Pode rodar mais de uma vez sem problema (usa IF NOT EXISTS).
--
-- A aparência é uma só para a igreja inteira: cor, modo noturno, cantos e
-- espaçamento. Quem muda nas Configurações muda em TODOS os aparelhos.
-- Por isso a tabela tem uma linha única, de id = 'tema'.
--
-- Os campos ficam num jsonb em vez de uma coluna cada: assim uma escolha nova
-- na tela de Aparência não obriga a mexer no banco outra vez.
-- =====================================================================

create table if not exists public.tema_sistema (
  id            text primary key,
  dados         jsonb not null default '{}'::jsonb,
  atualizado_em timestamptz not null default now()
);

-- A linha que o sistema lê. Se já existir, fica como está.
insert into public.tema_sistema (id, dados)
values ('tema', '{}'::jsonb)
on conflict (id) do nothing;

-- =====================================================================
-- AVISO NA HORA PARA OS OUTROS APARELHOS
--
-- Sem isto o celular que já está com o sistema aberto só pega a cor nova na
-- próxima vez que abrir. Com isto, a troca chega na hora.
-- =====================================================================

-- O bloco só adiciona se ainda não estiver lá, para o arquivo poder rodar de
-- novo sem reclamar de "já está na publicação".
do $bloco$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'tema_sistema'
     )
  then
    alter publication supabase_realtime add table public.tema_sistema;
  end if;
end
$bloco$;

-- =====================================================================
-- PERMISSÕES
--
-- O sistema acessa o Supabase com a chave "anon" (pública), do mesmo jeito
-- que já faz com hinos e repertórios.
-- =====================================================================

alter table public.tema_sistema enable row level security;

drop policy if exists "tema_leitura" on public.tema_sistema;
create policy "tema_leitura"
  on public.tema_sistema for select
  using (true);

drop policy if exists "tema_insercao" on public.tema_sistema;
create policy "tema_insercao"
  on public.tema_sistema for insert
  with check (true);

drop policy if exists "tema_atualizacao" on public.tema_sistema;
create policy "tema_atualizacao"
  on public.tema_sistema for update
  using (true) with check (true);
