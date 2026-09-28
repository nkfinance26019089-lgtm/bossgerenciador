-- =====================================================================
--  BSS Eventos · Painel de custos
--  Atualização 002 — Equipe online, histórico de acessos e LOGS
--
--  Como usar: Supabase › SQL Editor › New query › cole TODO este
--  arquivo › Run. Rode UMA vez, depois do schema.sql.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Sessões: quando cada pessoa entrou, se está online e quando saiu
-- ---------------------------------------------------------------------
create table public.sessoes (
  id            bigint generated always as identity primary key,
  perfil_id     uuid not null references public.perfis (id) on delete cascade,
  chave         text not null,                 -- identifica o navegador/aparelho
  inicio        timestamptz not null default now(),
  ultimo_sinal  timestamptz not null default now(),
  fim           timestamptz,
  motivo_fim    text,                          -- 'saiu' | 'inatividade'
  dispositivo   text,
  pagina        text
);
create index sessoes_perfil_idx on public.sessoes (perfil_id, inicio desc);
create index sessoes_abertas_idx on public.sessoes (ultimo_sinal desc) where fim is null;

-- ---------------------------------------------------------------------
-- 2. Auditoria (logs): tudo que é criado, alterado ou excluído
-- ---------------------------------------------------------------------
create table public.auditoria (
  id          bigint generated always as identity primary key,
  evento_id   uuid references public.eventos (id) on delete set null,
  perfil_id   uuid references public.perfis (id) on delete set null,
  acao        text not null,        -- ex.: gasto.criado, gasto.editado, membro.removido, sessao.login
  descricao   text not null,
  detalhes    jsonb,                -- campos alterados: {"valor": ["2180.00", "2280.00"]}
  criado_em   timestamptz not null default now()
);
create index auditoria_evento_idx on public.auditoria (evento_id, criado_em desc);
create index auditoria_perfil_idx on public.auditoria (perfil_id, criado_em desc);

-- ---------------------------------------------------------------------
-- 3. Funções auxiliares
-- ---------------------------------------------------------------------

-- O usuário atual é administrador de algum evento em que "outro" participa?
create or replace function public.administra(outro uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.eh_super_admin() or outro = auth.uid() or exists (
    select 1
      from public.evento_membros eu
      join public.evento_membros ele on ele.evento_id = eu.evento_id
     where eu.perfil_id = auth.uid() and eu.papel = 'admin' and ele.perfil_id = outro
  );
$$;

-- Diferença entre duas versões de uma linha: só os campos que mudaram.
create or replace function public.diferenca(antes jsonb, depois jsonb)
returns jsonb language sql immutable set search_path = '' as $$
  select coalesce(jsonb_object_agg(k, jsonb_build_array(antes -> k, depois -> k)), '{}'::jsonb)
    from jsonb_object_keys(coalesce(depois, '{}'::jsonb)) as k
   where (antes -> k) is distinct from (depois -> k);
$$;

create or replace function public.registrar_log(p_evento uuid, p_acao text, p_descricao text, p_detalhes jsonb default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  -- durante a exclusão de um evento inteiro, os itens filhos não geram log
  if p_evento is not null and not exists (select 1 from public.eventos e where e.id = p_evento) then
    return;
  end if;
  insert into public.auditoria (evento_id, perfil_id, acao, descricao, detalhes)
  values (p_evento, auth.uid(), p_acao, left(p_descricao, 300),
          case when p_detalhes = '{}'::jsonb then null else p_detalhes end);
end;
$$;
revoke execute on function public.registrar_log(uuid, text, text, jsonb) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 4. Gatilhos de auditoria
-- ---------------------------------------------------------------------

-- Gastos: versão "legível" (com nomes de categoria e responsável)
create or replace function public.gasto_legivel(g public.gastos)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'descricao', g.descricao,
    'valor', g.valor,
    'data_gasto', g.data_gasto,
    'categoria', (select c.nome from public.categorias c where c.id = g.categoria_id),
    'fornecedor', g.fornecedor,
    'forma_pagamento', g.forma_pagamento,
    'status', g.status,
    'vencimento', g.vencimento,
    'responsavel', (select p.nome from public.perfis p where p.id = g.responsavel_id),
    'comprovante', g.comprovante_path is not null,
    'observacoes', g.observacoes
  );
$$;

create or replace function public.log_gastos()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_dif jsonb;
  v_acao text;
begin
  if tg_op = 'INSERT' then
    perform public.registrar_log(new.evento_id, 'gasto.criado', new.descricao, public.gasto_legivel(new));
  elsif tg_op = 'DELETE' then
    perform public.registrar_log(old.evento_id, 'gasto.excluido', old.descricao, public.gasto_legivel(old));
  else
    v_dif := public.diferenca(public.gasto_legivel(old), public.gasto_legivel(new));
    if v_dif = '{}'::jsonb then return new; end if;
    v_acao := case
      when old.status = 'pendente' and new.status = 'pago' and (v_dif - 'status' - 'vencimento') = '{}'::jsonb then 'gasto.pago'
      when (v_dif - 'comprovante') = '{}'::jsonb then 'gasto.comprovante'
      else 'gasto.editado' end;
    perform public.registrar_log(new.evento_id, v_acao, new.descricao, v_dif);
  end if;
  return coalesce(new, old);
end;
$$;

create or replace function public.log_categorias()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    perform public.registrar_log(new.evento_id, 'categoria.criada', new.nome,
      jsonb_build_object('orcamento_previsto', new.orcamento_previsto));
  elsif tg_op = 'DELETE' then
    perform public.registrar_log(old.evento_id, 'categoria.excluida', old.nome, null);
  else
    perform public.registrar_log(new.evento_id, 'categoria.editada', new.nome,
      public.diferenca(
        jsonb_build_object('nome', old.nome, 'orcamento_previsto', old.orcamento_previsto, 'cor', old.cor),
        jsonb_build_object('nome', new.nome, 'orcamento_previsto', new.orcamento_previsto, 'cor', new.cor)));
  end if;
  return coalesce(new, old);
end;
$$;

create or replace function public.log_membros()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_nome text;
begin
  select p.nome into v_nome from public.perfis p where p.id = coalesce(new.perfil_id, old.perfil_id);
  if tg_op = 'INSERT' then
    perform public.registrar_log(new.evento_id, 'membro.adicionado', coalesce(v_nome, '—'),
      jsonb_build_object('papel', new.papel));
  elsif tg_op = 'DELETE' then
    perform public.registrar_log(old.evento_id, 'membro.removido', coalesce(v_nome, '—'),
      jsonb_build_object('papel', old.papel));
  elsif old.papel is distinct from new.papel then
    perform public.registrar_log(new.evento_id, 'membro.papel', coalesce(v_nome, '—'),
      jsonb_build_object('papel', jsonb_build_array(old.papel, new.papel)));
  end if;
  return coalesce(new, old);
end;
$$;

create or replace function public.log_eventos()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    perform public.registrar_log(new.id, 'evento.criado', new.nome,
      jsonb_build_object('orcamento_total', new.orcamento_total));
  elsif tg_op = 'DELETE' then
    perform public.registrar_log(null, 'evento.excluido', old.nome, null);
  else
    perform public.registrar_log(new.id, 'evento.editado', new.nome,
      public.diferenca(
        jsonb_build_object('nome', old.nome, 'data_evento', old.data_evento, 'local', old.local,
                           'orcamento_total', old.orcamento_total, 'status', old.status),
        jsonb_build_object('nome', new.nome, 'data_evento', new.data_evento, 'local', new.local,
                           'orcamento_total', new.orcamento_total, 'status', new.status)));
  end if;
  return coalesce(new, old);
end;
$$;

-- O log de evento criado precisa rodar DEPOIS de o criador virar membro
create trigger log_eventos after insert or update or delete on public.eventos
  for each row execute function public.log_eventos();
create trigger log_gastos after insert or update or delete on public.gastos
  for each row execute function public.log_gastos();
create trigger log_categorias after insert or update or delete on public.categorias
  for each row execute function public.log_categorias();
create trigger log_membros after insert or update or delete on public.evento_membros
  for each row execute function public.log_membros();

-- Traz o histórico antigo ("Atividade recente") para os logs e remove a tabela antiga
insert into public.auditoria (evento_id, perfil_id, acao, descricao, detalhes, criado_em)
select a.evento_id, a.perfil_id,
       case a.acao when 'criou' then 'gasto.criado' when 'pagou' then 'gasto.pago'
                   when 'anexou' then 'gasto.comprovante' when 'excluiu' then 'gasto.excluido'
                   else 'gasto.editado' end,
       a.descricao,
       case when a.valor is not null then jsonb_build_object('valor', a.valor) end,
       a.criado_em
  from public.atividades a;

drop trigger if exists registra_atividade on public.gastos;
drop function if exists public.registra_atividade();
drop table if exists public.atividades;

-- ---------------------------------------------------------------------
-- 5. Presença: sinal de vida, entrada e saída
-- ---------------------------------------------------------------------

-- Chamado pelo navegador a cada 30 s enquanto a pessoa usa o painel.
create or replace function public.registrar_sinal(p_chave text, p_dispositivo text default null, p_pagina text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or coalesce(p_chave, '') = '' then return; end if;

  -- sessões sem sinal há mais de 3 minutos: encerradas no último sinal
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

-- Chamado ao clicar em "Sair".
create or replace function public.encerrar_sessao(p_chave text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then return; end if;
  update public.sessoes set fim = now(), motivo_fim = 'saiu'
   where perfil_id = auth.uid() and fim is null and (chave = left(p_chave, 64) or coalesce(p_chave, '') = '');
  perform public.registrar_log(null, 'sessao.logout', 'Saiu do painel', null);
end;
$$;

-- Chamado logo depois do login (senha ou link de acesso).
create or replace function public.registrar_login(p_dispositivo text default null, p_via text default 'senha')
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then return; end if;
  perform public.registrar_log(null, 'sessao.login', 'Entrou no painel',
    jsonb_build_object('dispositivo', left(p_dispositivo, 80), 'via', left(p_via, 20)));
end;
$$;

-- Quem está online agora (sinal nos últimos 90 s), entre as pessoas que você pode ver.
create or replace function public.pessoas_online(p_evento uuid default null)
returns table (perfil_id uuid, nome text, pagina text, dispositivo text, desde timestamptz, ultimo_sinal timestamptz)
language sql stable security definer set search_path = '' as $$
  select distinct on (s.perfil_id)
         s.perfil_id, p.nome, s.pagina, s.dispositivo, s.inicio, s.ultimo_sinal
    from public.sessoes s
    join public.perfis p on p.id = s.perfil_id
   where s.fim is null
     and s.ultimo_sinal > now() - interval '90 seconds'
     and auth.uid() is not null
     and (p_evento is null or exists (select 1 from public.evento_membros m where m.evento_id = p_evento and m.perfil_id = s.perfil_id))
     and (p_evento is null or public.pode_ver_evento(p_evento))
     and (s.perfil_id = auth.uid() or public.eh_super_admin() or public.compartilha_evento(s.perfil_id))
   order by s.perfil_id, s.ultimo_sinal desc;
$$;

-- ---------------------------------------------------------------------
-- 6. Permissões
-- ---------------------------------------------------------------------
alter table public.sessoes   enable row level security;
alter table public.auditoria enable row level security;
revoke all on public.sessoes, public.auditoria from anon;
revoke insert, update, delete on public.sessoes, public.auditoria from authenticated;

-- Histórico de acessos: a própria pessoa, o admin geral e admins dos eventos em que ela está
create policy "sessoes: ver" on public.sessoes for select to authenticated
  using (public.administra(perfil_id));

-- Logs:
--  • de um evento: administradores veem tudo; demais membros veem os logs de gastos (atividade recente)
--  • gerais (entrada/saída, evento excluído): a própria pessoa, o admin geral e admins da pessoa
create policy "auditoria: ver" on public.auditoria for select to authenticated
  using (
    case
      when evento_id is not null then
        public.eh_admin_evento(evento_id) or (public.pode_ver_evento(evento_id) and acao like 'gasto.%')
      else
        perfil_id = auth.uid() or public.eh_super_admin() or (perfil_id is not null and public.administra(perfil_id))
    end
  );

grant execute on function public.registrar_sinal(text, text, text) to authenticated;
grant execute on function public.encerrar_sessao(text) to authenticated;
grant execute on function public.registrar_login(text, text) to authenticated;
grant execute on function public.pessoas_online(uuid) to authenticated;
revoke execute on function public.registrar_sinal(text, text, text) from anon;
revoke execute on function public.encerrar_sessao(text) from anon;
revoke execute on function public.registrar_login(text, text) from anon;
revoke execute on function public.pessoas_online(uuid) from anon;
