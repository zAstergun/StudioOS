-- ==============================================================================
-- StudioOS · Sistema de Curtidas de Perfis (Exclusivo StudioOS)
-- Separado da conta Aster global, focado no ecossistema e estatísticas do estúdio
-- Regra: Apenas usuários autenticados com conta podem curtir outros criadores.
-- Contabilização: Atualiza atômica e permanentemente as curtidas recebidas.
-- ==============================================================================

create table if not exists public.studioos_profile_likes (
  id uuid primary key default gen_random_uuid(),
  target_user_id uuid not null references public.profiles(id) on delete cascade,
  liker_user_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint studioos_profile_likes_target_liker_key unique (target_user_id, liker_user_id)
);

alter table public.studioos_profile_likes enable row level security;

drop policy if exists "Likes do StudioOS são visíveis publicamente" on public.studioos_profile_likes;
create policy "Likes do StudioOS são visíveis publicamente"
  on public.studioos_profile_likes for select
  using (true);

drop policy if exists "Usuários podem dar like em perfis do StudioOS" on public.studioos_profile_likes;
create policy "Usuários podem dar like em perfis do StudioOS"
  on public.studioos_profile_likes for insert
  with check (auth.uid() = liker_user_id);

drop policy if exists "Usuários podem remover seu like em perfis do StudioOS" on public.studioos_profile_likes;
create policy "Usuários podem remover seu like em perfis do StudioOS"
  on public.studioos_profile_likes for delete
  using (auth.uid() = liker_user_id);

-- Função para consultar status de like e contagem de curtidas recebidas no StudioOS
create or replace function public.studioos_get_profile_likes_info(p_target_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count bigint;
  v_liked boolean := false;
  v_uid uuid;
begin
  v_uid := auth.uid();
  
  -- Contabiliza curtidas recebidas pelo perfil consultado
  select count(*) into v_count
  from public.studioos_profile_likes
  where target_user_id = p_target_id;
  
  if v_uid is not null then
    select exists(
      select 1 from public.studioos_profile_likes
      where target_user_id = p_target_id and liker_user_id = v_uid
    ) into v_liked;
  end if;
  
  return jsonb_build_object(
    'likes_count', coalesce(v_count, 0),
    'liked', coalesce(v_liked, false)
  );
end;
$$;

-- Função para alternar like de usuário autenticado no StudioOS
create or replace function public.studioos_toggle_profile_like(p_target_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_exists boolean;
  v_new_count bigint;
  v_liked boolean;
begin
  v_uid := auth.uid();
  -- Regra estrita: apenas usuários autenticados com conta podem curtir
  if v_uid is null then
    raise exception 'Apenas usuários autenticados com conta podem curtir perfis no StudioOS';
  end if;
  
  -- Não permite auto-curtida
  if v_uid = p_target_id then
    raise exception 'Você não pode curtir seu próprio perfil no StudioOS';
  end if;

  select exists(
    select 1 from public.studioos_profile_likes
    where target_user_id = p_target_id and liker_user_id = v_uid
  ) into v_exists;

  if v_exists then
    delete from public.studioos_profile_likes
    where target_user_id = p_target_id and liker_user_id = v_uid;
    v_liked := false;
  else
    insert into public.studioos_profile_likes (target_user_id, liker_user_id)
    values (p_target_id, v_uid)
    on conflict (target_user_id, liker_user_id) do nothing;
    v_liked := true;
  end if;

  -- Contabiliza curtidas recebidas pelo criador alvo
  select count(*) into v_new_count
  from public.studioos_profile_likes
  where target_user_id = p_target_id;

  -- Atualiza e persiste de forma atômica no perfil do criador alvo
  update public.profiles
  set stats = jsonb_set(
    jsonb_set(
      coalesce(stats, '{}'::jsonb),
      '{likes_count}',
      to_jsonb(v_new_count)
    ),
    '{curtidas_recebidas}',
    to_jsonb(v_new_count)
  )
  where id = p_target_id;

  return jsonb_build_object(
    'liked', v_liked,
    'likes_count', v_new_count
  );
end;
$$;

-- Modo convidado bloqueado: apenas contas reais
create or replace function public.studioos_toggle_profile_like_guest(p_target_id uuid, p_liked boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'Apenas usuários autenticados com conta podem curtir perfis no StudioOS';
end;
$$;

-- Aliases para retrocompatibilidade
create or replace function public.get_profile_likes_info(p_target_id uuid)
returns jsonb language sql security definer as $$ select public.studioos_get_profile_likes_info(p_target_id); $$;

create or replace function public.toggle_profile_like(p_target_id uuid)
returns jsonb language sql security definer as $$ select public.studioos_toggle_profile_like(p_target_id); $$;

create or replace function public.toggle_profile_like_guest(p_target_id uuid, p_liked boolean)
returns jsonb language sql security definer as $$ select public.studioos_toggle_profile_like_guest(p_target_id, p_liked); $$;

-- Permissões: Somente authenticated pode curtir. Anon só pode visualizar contagem.
grant execute on function public.studioos_get_profile_likes_info(uuid) to anon, authenticated;
grant execute on function public.get_profile_likes_info(uuid) to anon, authenticated;

revoke execute on function public.studioos_toggle_profile_like(uuid) from anon;
revoke execute on function public.toggle_profile_like(uuid) from anon;
revoke execute on function public.studioos_toggle_profile_like_guest(uuid, boolean) from anon, authenticated;
revoke execute on function public.toggle_profile_like_guest(uuid, boolean) from anon, authenticated;

grant execute on function public.studioos_toggle_profile_like(uuid) to authenticated;
grant execute on function public.toggle_profile_like(uuid) to authenticated;
