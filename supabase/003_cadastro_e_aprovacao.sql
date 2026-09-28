-- =====================================================================
--  BSS Eventos · Painel de custos
--  Atualização 003 — Cadastro pelo próprio painel com APROVAÇÃO
--
--  • A pessoa cria a conta (e-mail e senha) na tela de entrada.
--  • A conta fica "aguardando aprovação" e não vê nada até ser aprovada.
--  • Aprovação: só por um administrador geral, no painel
--    (Equipe › Pedidos de acesso).
--  • Administradores gerais veem todos os eventos, todos os logs e a equipe online.
--
--  Como usar: Supabase › SQL Editor › New query › cole TODO este arquivo › Run.
--  Rode UMA vez, depois do 002.
-- =====================================================================

alter table public.perfis add column if not exists aprovado boolean not null default false;
alter table public.perfis add column if not exists aprovado_em timestamptz;

-- Quem já existia foi convidado por um administrador: já está aprovado.
update public.perfis set aprovado = true, aprovado_em = coalesce(aprovado_em, now()) where not aprovado;

-- Novos usuários: só o PRIMEIRO do sistema nasce aprovado e administrador geral.
create or replace function public.ao_criar_usuario()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_primeiro boolean := not exists (select 1 from public.perfis);
begin
  insert into public.perfis (id, nome, email, super_admin, aprovado, aprovado_em)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'nome'), ''), split_part(new.email, '@', 1)),
    new.email,
    v_primeiro,
    v_primeiro,
    case when v_primeiro then now() end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- Permissões passam a exigir conta aprovada
-- ---------------------------------------------------------------------
create or replace function public.eh_aprovado()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select p.aprovado from public.perfis p where p.id = auth.uid()), false);
$$;

create or replace function public.eh_super_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select p.super_admin and p.aprovado from public.perfis p where p.id = auth.uid()), false);
$$;

create or replace function public.papel_no_evento(ev uuid)
returns public.papel_evento language sql stable security definer set search_path = '' as $$
  select m.papel
    from public.evento_membros m
    join public.perfis p on p.id = m.perfil_id and p.aprovado
   where m.evento_id = ev and m.perfil_id = auth.uid();
$$;

create or replace function public.pode_ver_evento(ev uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.eh_super_admin() or public.papel_no_evento(ev) is not null;
$$;

create or replace function public.compartilha_evento(outro uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.eh_aprovado() and exists (
    select 1
      from public.evento_membros eu
      join public.evento_membros ele on ele.evento_id = eu.evento_id
     where eu.perfil_id = auth.uid() and ele.perfil_id = outro
  );
$$;

create or replace function public.administra(outro uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.eh_super_admin() or outro = auth.uid() or (public.eh_aprovado() and exists (
    select 1
      from public.evento_membros eu
      join public.evento_membros ele on ele.evento_id = eu.evento_id
     where eu.perfil_id = auth.uid() and eu.papel = 'admin' and ele.perfil_id = outro
  ));
$$;

-- Quem ainda não foi aprovado não entra na lista de online
create or replace function public.registrar_sinal(p_chave text, p_dispositivo text default null, p_pagina text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or coalesce(p_chave, '') = '' or not public.eh_aprovado() then return; end if;

  update public.sessoes
     set fim = ultimo_sinal, motivo_fim = 'inatividade'
   where perfil_id = auth.uid() and fim is null and ultimo_sinal < now() - interval '3 minutes';

  update public.sessoes
     set ultimo_sinal = now(),
         pagina = coalesce(left(p_pagina, 120), pagina),
         dispositivo = coalesce(left(p_dispositivo, 80), dispositivo)
   where perfil_id = auth.uid() and chave = left(p_chave, 64) and fim is null;

  if not found then
    insert into public.sessoes (perfil_id, chave, dispositivo, pagina)
    values (auth.uid(), left(p_chave, 64), left(p_dispositivo, 80), left(p_pagina, 120));
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- Aprovar contas e definir administradores gerais (só administradores gerais)
-- ---------------------------------------------------------------------
create or replace function public.aprovar_usuario(p_id uuid, p_admin_geral boolean default false)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_nome text;
begin
  if not public.eh_super_admin() then
    raise exception 'Só administradores gerais podem aprovar contas.';
  end if;
  update public.perfis
     set aprovado = true, aprovado_em = now(), super_admin = coalesce(p_admin_geral, false)
   where id = p_id and not aprovado
  returning nome into v_nome;
  if v_nome is null then
    raise exception 'Conta não encontrada ou já aprovada.';
  end if;
  perform public.registrar_log(null, 'usuario.aprovado', v_nome,
    jsonb_build_object('admin_geral', coalesce(p_admin_geral, false)));
end;
$$;

create or replace function public.definir_admin_geral(p_id uuid, p_valor boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_nome text;
  v_antes boolean;
begin
  if not public.eh_super_admin() then
    raise exception 'Só administradores gerais podem alterar administradores.';
  end if;
  select nome, super_admin into v_nome, v_antes from public.perfis where id = p_id and aprovado;
  if v_nome is null then
    raise exception 'Conta não encontrada.';
  end if;
  if not p_valor and v_antes and (select count(*) from public.perfis where super_admin and aprovado) <= 1 then
    raise exception 'O painel precisa ter pelo menos um administrador geral.';
  end if;
  update public.perfis set super_admin = p_valor where id = p_id;
  if v_antes is distinct from p_valor then
    perform public.registrar_log(null, 'usuario.admin_geral', v_nome,
      jsonb_build_object('admin_geral', jsonb_build_array(v_antes, p_valor)));
  end if;
end;
$$;

-- Aprovação feita direto na tabela (Supabase › Table Editor) também fica no log
create or replace function public.log_aprovacao_direta()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.aprovado and not old.aprovado then
    new.aprovado_em := coalesce(new.aprovado_em, now());
    if auth.uid() is null then  -- feito pelo painel do Supabase, não pelo app
      insert into public.auditoria (evento_id, perfil_id, acao, descricao, detalhes)
      values (null, null, 'usuario.aprovado', new.nome,
              jsonb_build_object('admin_geral', new.super_admin, 'via', 'supabase'));
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists log_aprovacao_direta on public.perfis;
create trigger log_aprovacao_direta
  before update of aprovado on public.perfis
  for each row execute function public.log_aprovacao_direta();

grant execute on function public.aprovar_usuario(uuid, boolean) to authenticated;
grant execute on function public.definir_admin_geral(uuid, boolean) to authenticated;
grant execute on function public.eh_aprovado() to authenticated;
revoke execute on function public.aprovar_usuario(uuid, boolean) from anon;
revoke execute on function public.definir_admin_geral(uuid, boolean) from anon;
