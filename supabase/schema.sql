-- =====================================================================
--  BSS Eventos · Painel de custos
--  Banco de dados completo (tabelas, permissões, gatilhos e storage).
--
--  Como usar: Supabase › SQL Editor › New query › cole TODO este
--  arquivo › Run. Pode ser executado uma única vez num projeto novo.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------
create type public.papel_evento  as enum ('admin', 'editor', 'leitor');
create type public.status_gasto  as enum ('pago', 'pendente');
create type public.status_evento as enum ('planejamento', 'andamento', 'encerrado');

-- ---------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------

-- Uma linha por pessoa que pode entrar no painel (criada automaticamente
-- quando o usuário é convidado/criado no Supabase Auth).
create table public.perfis (
  id           uuid primary key references auth.users (id) on delete cascade,
  nome         text not null default '',
  email        text not null,
  super_admin  boolean not null default false,   -- administrador geral da BSS
  ultimo_acesso timestamptz,
  criado_em    timestamptz not null default now()
);
create unique index perfis_email_idx on public.perfis (lower(email));

create table public.eventos (
  id               uuid primary key default gen_random_uuid(),
  nome             text not null check (length(trim(nome)) > 0),
  data_evento      date,
  local            text,
  orcamento_total  numeric(12,2) not null default 0 check (orcamento_total >= 0),
  status           public.status_evento not null default 'planejamento',
  criado_por       uuid references public.perfis (id) on delete set null default auth.uid(),
  criado_em        timestamptz not null default now()
);

-- Quem participa de cada evento e com qual papel.
create table public.evento_membros (
  evento_id      uuid not null references public.eventos (id) on delete cascade,
  perfil_id      uuid not null references public.perfis (id) on delete cascade,
  papel          public.papel_evento not null default 'editor',
  adicionado_em  timestamptz not null default now(),
  primary key (evento_id, perfil_id)
);
create index evento_membros_perfil_idx on public.evento_membros (perfil_id);

create table public.categorias (
  id                  uuid primary key default gen_random_uuid(),
  evento_id           uuid not null references public.eventos (id) on delete cascade,
  nome                text not null check (length(trim(nome)) > 0),
  cor                 text not null default '#9A9EA3' check (cor ~ '^#[0-9A-Fa-f]{6}$'),
  orcamento_previsto  numeric(12,2) not null default 0 check (orcamento_previsto >= 0),
  ordem               int not null default 0,
  criado_em           timestamptz not null default now(),
  unique (evento_id, nome),
  unique (id, evento_id)
);

create table public.gastos (
  id                uuid primary key default gen_random_uuid(),
  evento_id         uuid not null references public.eventos (id) on delete cascade,
  categoria_id      uuid,
  descricao         text not null check (length(trim(descricao)) > 0),
  valor             numeric(12,2) not null check (valor > 0),
  data_gasto        date not null default current_date,
  fornecedor        text,
  forma_pagamento   text,
  status            public.status_gasto not null default 'pendente',
  vencimento        date,
  responsavel_id    uuid references public.perfis (id) on delete set null,
  comprovante_path  text,
  observacoes       text,
  criado_por        uuid references public.perfis (id) on delete set null default auth.uid(),
  criado_em         timestamptz not null default now(),
  atualizado_em     timestamptz not null default now(),
  -- a categoria precisa ser do MESMO evento do gasto
  foreign key (categoria_id, evento_id)
    references public.categorias (id, evento_id) on delete set null (categoria_id)
);
create index gastos_evento_data_idx on public.gastos (evento_id, data_gasto desc);

-- Histórico ("Atividade recente"), preenchido automaticamente.
create table public.atividades (
  id          bigint generated always as identity primary key,
  evento_id   uuid not null references public.eventos (id) on delete cascade,
  perfil_id   uuid references public.perfis (id) on delete set null,
  acao        text not null,          -- criou | editou | pagou | anexou | excluiu
  descricao   text not null,
  valor       numeric(12,2),
  criado_em   timestamptz not null default now()
);
create index atividades_evento_idx on public.atividades (evento_id, criado_em desc);

-- ---------------------------------------------------------------------
-- Funções de permissão (usadas pelas regras de acesso)
-- ---------------------------------------------------------------------
create or replace function public.eh_super_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select p.super_admin from public.perfis p where p.id = auth.uid()), false);
$$;

create or replace function public.papel_no_evento(ev uuid)
returns public.papel_evento language sql stable security definer set search_path = '' as $$
  select m.papel from public.evento_membros m
   where m.evento_id = ev and m.perfil_id = auth.uid();
$$;

create or replace function public.pode_ver_evento(ev uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.eh_super_admin()
      or exists (select 1 from public.evento_membros m
                  where m.evento_id = ev and m.perfil_id = auth.uid());
$$;

create or replace function public.pode_lancar_gastos(ev uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.eh_super_admin()
      or coalesce(public.papel_no_evento(ev) in ('admin', 'editor'), false);
$$;

create or replace function public.eh_admin_evento(ev uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.eh_super_admin()
      or coalesce(public.papel_no_evento(ev) = 'admin', false);
$$;

create or replace function public.compartilha_evento(outro uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
      from public.evento_membros eu
      join public.evento_membros ele on ele.evento_id = eu.evento_id
     where eu.perfil_id = auth.uid() and ele.perfil_id = outro
  );
$$;

-- Extrai o id do evento da pasta do arquivo: "<evento_id>/<arquivo>"
create or replace function public.evento_do_caminho(caminho text)
returns uuid language plpgsql immutable set search_path = '' as $$
begin
  return split_part(caminho, '/', 1)::uuid;
exception when others then
  return null;
end;
$$;

-- ---------------------------------------------------------------------
-- Gatilhos
-- ---------------------------------------------------------------------

-- Cria o perfil quando alguém é criado/convidado no Auth.
-- O PRIMEIRO usuário do sistema vira administrador geral.
create or replace function public.ao_criar_usuario()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.perfis (id, nome, email, super_admin)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'nome'), ''), split_part(new.email, '@', 1)),
    new.email,
    not exists (select 1 from public.perfis)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger ao_criar_usuario
  after insert on auth.users
  for each row execute function public.ao_criar_usuario();

-- Guarda o último acesso (para mostrar "convite pendente" / "último acesso").
create or replace function public.ao_entrar_usuario()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.perfis set ultimo_acesso = new.last_sign_in_at, email = new.email
   where id = new.id;
  return new;
end;
$$;

create trigger ao_entrar_usuario
  after update of last_sign_in_at, email on auth.users
  for each row execute function public.ao_entrar_usuario();

-- Quem cria o evento vira administrador dele.
create or replace function public.ao_criar_evento()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is not null then
    insert into public.evento_membros (evento_id, perfil_id, papel)
    values (new.id, auth.uid(), 'admin')
    on conflict do nothing;
  end if;
  return new;
end;
$$;

create trigger ao_criar_evento
  after insert on public.eventos
  for each row execute function public.ao_criar_evento();

-- Um evento nunca pode ficar sem administrador.
create or replace function public.protege_ultimo_admin()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.papel = 'admin'
     and (tg_op = 'DELETE' or new.papel <> 'admin')
     and exists (select 1 from public.eventos e where e.id = old.evento_id)
     and not exists (
       select 1 from public.evento_membros m
        where m.evento_id = old.evento_id and m.papel = 'admin' and m.perfil_id <> old.perfil_id
     ) then
    raise exception 'O evento precisa ter pelo menos um administrador.';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger protege_ultimo_admin
  before update or delete on public.evento_membros
  for each row execute function public.protege_ultimo_admin();

-- Mantém atualizado_em e registra o histórico.
create or replace function public.ao_alterar_gasto()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

create trigger ao_alterar_gasto
  before update on public.gastos
  for each row execute function public.ao_alterar_gasto();

create or replace function public.registra_atividade()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_acao text;
begin
  if tg_op = 'INSERT' then
    v_acao := 'criou';
  elsif tg_op = 'DELETE' then
    v_acao := 'excluiu';
  elsif old.status = 'pendente' and new.status = 'pago' then
    v_acao := 'pagou';
  elsif old.comprovante_path is null and new.comprovante_path is not null then
    v_acao := 'anexou';
  else
    v_acao := 'editou';
  end if;

  if tg_op = 'DELETE' then
    -- se o evento inteiro está sendo apagado, não registra
    if exists (select 1 from public.eventos e where e.id = old.evento_id) then
      insert into public.atividades (evento_id, perfil_id, acao, descricao, valor)
      values (old.evento_id, auth.uid(), v_acao, old.descricao, old.valor);
    end if;
    return old;
  end if;

  insert into public.atividades (evento_id, perfil_id, acao, descricao, valor)
  values (new.evento_id, auth.uid(), v_acao, new.descricao, new.valor);
  return new;
end;
$$;

create trigger registra_atividade
  after insert or update or delete on public.gastos
  for each row execute function public.registra_atividade();

-- ---------------------------------------------------------------------
-- Regras de acesso (Row Level Security)
-- ---------------------------------------------------------------------
alter table public.perfis          enable row level security;
alter table public.eventos         enable row level security;
alter table public.evento_membros  enable row level security;
alter table public.categorias      enable row level security;
alter table public.gastos          enable row level security;
alter table public.atividades      enable row level security;

-- Ninguém sem login acessa nada.
revoke all on all tables in schema public from anon;

-- perfis: vê a si mesmo e quem está nos mesmos eventos; só edita o próprio nome
create policy "perfis: ver" on public.perfis for select to authenticated
  using (id = auth.uid() or public.eh_super_admin() or public.compartilha_evento(id));
create policy "perfis: editar o próprio" on public.perfis for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
revoke insert, update, delete on public.perfis from authenticated;
grant update (nome) on public.perfis to authenticated;

-- eventos
create policy "eventos: ver" on public.eventos for select to authenticated
  using (public.pode_ver_evento(id));
create policy "eventos: criar (admin geral)" on public.eventos for insert to authenticated
  with check (public.eh_super_admin());
create policy "eventos: editar (admin do evento)" on public.eventos for update to authenticated
  using (public.eh_admin_evento(id)) with check (public.eh_admin_evento(id));
create policy "eventos: excluir (admin geral)" on public.eventos for delete to authenticated
  using (public.eh_super_admin());

-- membros
create policy "membros: ver" on public.evento_membros for select to authenticated
  using (public.pode_ver_evento(evento_id));
create policy "membros: adicionar" on public.evento_membros for insert to authenticated
  with check (public.eh_admin_evento(evento_id));
create policy "membros: alterar" on public.evento_membros for update to authenticated
  using (public.eh_admin_evento(evento_id)) with check (public.eh_admin_evento(evento_id));
create policy "membros: remover" on public.evento_membros for delete to authenticated
  using (public.eh_admin_evento(evento_id));

-- categorias
create policy "categorias: ver" on public.categorias for select to authenticated
  using (public.pode_ver_evento(evento_id));
create policy "categorias: criar" on public.categorias for insert to authenticated
  with check (public.eh_admin_evento(evento_id));
create policy "categorias: alterar" on public.categorias for update to authenticated
  using (public.eh_admin_evento(evento_id)) with check (public.eh_admin_evento(evento_id));
create policy "categorias: excluir" on public.categorias for delete to authenticated
  using (public.eh_admin_evento(evento_id));

-- gastos: todos do evento veem; admin e editor lançam;
-- editor altera só o que ele lançou; admin altera e exclui qualquer um
create policy "gastos: ver" on public.gastos for select to authenticated
  using (public.pode_ver_evento(evento_id));
create policy "gastos: lançar" on public.gastos for insert to authenticated
  with check (public.pode_lancar_gastos(evento_id) and criado_por = auth.uid());
create policy "gastos: alterar" on public.gastos for update to authenticated
  using (public.eh_admin_evento(evento_id)
         or (public.papel_no_evento(evento_id) = 'editor' and criado_por = auth.uid()))
  with check (public.eh_admin_evento(evento_id)
         or (public.papel_no_evento(evento_id) = 'editor' and criado_por = auth.uid()));
create policy "gastos: excluir" on public.gastos for delete to authenticated
  using (public.eh_admin_evento(evento_id));

-- atividades: só leitura (quem escreve é o gatilho)
create policy "atividades: ver" on public.atividades for select to authenticated
  using (public.pode_ver_evento(evento_id));
revoke insert, update, delete on public.atividades from authenticated;

-- ---------------------------------------------------------------------
-- Comprovantes (Storage) — pasta por evento: comprovantes/<evento_id>/...
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('comprovantes', 'comprovantes', false, 5242880,
        array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'])
on conflict (id) do nothing;

create policy "comprovantes: ver" on storage.objects for select to authenticated
  using (bucket_id = 'comprovantes' and public.pode_ver_evento(public.evento_do_caminho(name)));
create policy "comprovantes: enviar" on storage.objects for insert to authenticated
  with check (bucket_id = 'comprovantes' and public.pode_lancar_gastos(public.evento_do_caminho(name)));
create policy "comprovantes: apagar" on storage.objects for delete to authenticated
  using (bucket_id = 'comprovantes' and public.pode_lancar_gastos(public.evento_do_caminho(name)));
