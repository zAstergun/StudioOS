-- StudioOS · tabela de perfis (opcional, mas recomendada)
-- Execute no Supabase: SQL Editor → New query → Run

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  channel text,
  avatar_url text,
  bio text,
  links jsonb default '{}'::jsonb,
  card_visibility jsonb default '{"stats": true, "projects": true, "video": true, "achievements": true}'::jsonb,
  featured_video jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Adiciona restrição para garantir que o @ seja único na tabela
alter table public.profiles drop constraint if exists profiles_channel_key;
alter table public.profiles add constraint profiles_channel_key unique (channel);

drop policy if exists "Perfil visível para o próprio usuário" on public.profiles;
drop policy if exists "Perfis são visíveis publicamente" on public.profiles;

create policy "Perfis são visíveis publicamente"
  on public.profiles for select
  using (true);

drop policy if exists "Perfil editável pelo próprio usuário" on public.profiles;
create policy "Perfil editável pelo próprio usuário"
  on public.profiles for update
  using (auth.uid() = id);

-- Função para o login por username (necessária para buscar o email pelo canal)
create or replace function public.get_email_by_channel(p_channel text)
returns text
language plpgsql
security definer set search_path = public
as $$
declare
  v_email text;
begin
  select u.email into v_email
  from auth.users u
  join public.profiles p on u.id = p.id
  where p.channel = p_channel
  limit 1;
  
  return v_email;
end;
$$;

-- Cria o perfil automaticamente no cadastro, usando os metadados enviados
-- pelo formulário (full_name, channel), pelo Google (name, avatar_url, picture)
-- ou pelo Discord (global_name, user_name, full_name, avatar_url)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, channel, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      new.raw_user_meta_data -> 'custom_claims' ->> 'global_name',
      new.raw_user_meta_data ->> 'user_name',
      split_part(coalesce(new.email, 'criador@local'), '@', 1)
    ),
    coalesce(
      new.raw_user_meta_data ->> 'channel',
      nullif('@' || coalesce(new.raw_user_meta_data ->> 'user_name', ''), '@')
    ),
    coalesce(
      new.raw_user_meta_data ->> 'avatar_url',
      new.raw_user_meta_data ->> 'picture'
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Tabela de Histórico e Lixeira (StudioOS)
create table if not exists public.studioos_history (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  tool text not null,
  tool_name text not null,
  title text not null,
  summary text not null,
  tag text,
  content text not null,
  created_at bigint not null,
  favorite boolean default false,
  deleted_at bigint
);

-- Ativar RLS (Segurança a nível de linha)
alter table public.studioos_history enable row level security;


-- Funcao para verificar dono do projeto sem causar recursao nas politicas

-- Funcao para verificar se usuario e membro
create or replace function public.is_project_member(pid text)
returns boolean
language sql
security definer set search_path = public
as $$
  select exists(select 1 from public.studioos_project_members where project_id = pid and user_id = auth.uid());
$$;

create or replace function public.is_project_owner(p_project_id text)
returns boolean
language sql
security definer set search_path = public
as $$
  select exists(select 1 from public.studioos_projects where id = p_project_id and owner_id = auth.uid());
$$;

-- Políticas de acesso (O usuário só vê, cria e edita o próprio histórico)
drop policy if exists "Usuários podem ver seu próprio histórico" on public.studioos_history;
create policy "Usuários podem ver seu próprio histórico" 
on public.studioos_history for select 
using (auth.uid() = user_id);

drop policy if exists "Usuários podem criar seu próprio histórico" on public.studioos_history;
create policy "Usuários podem criar seu próprio histórico" 
on public.studioos_history for insert 
with check (auth.uid() = user_id);

drop policy if exists "Usuários podem atualizar seu próprio histórico" on public.studioos_history;
create policy "Usuários podem atualizar seu próprio histórico" 
on public.studioos_history for update 
using (auth.uid() = user_id);

drop policy if exists "Usuários podem excluir seu próprio histórico" on public.studioos_history;
create policy "Usuários podem excluir seu próprio histórico" 
on public.studioos_history for delete 
using (auth.uid() = user_id);

-- Função para o usuário deletar a própria conta
create or replace function public.delete_user()
returns void
language sql
security definer
as $$
  delete from auth.users where id = auth.uid();
$$;

-- Configuração do Storage de Avatares
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true) on conflict do nothing;

drop policy if exists "Avatares são publicamente visíveis" on storage.objects;
create policy "Avatares são publicamente visíveis" on storage.objects for select using (bucket_id = 'avatars');

drop policy if exists "Usuários podem subir seus avatares" on storage.objects;
create policy "Usuários podem subir seus avatares" on storage.objects for insert with check (bucket_id = 'avatars' and auth.uid()::text = owner::text);

drop policy if exists "Usuários podem atualizar seus avatares" on storage.objects;
create policy "Usuários podem atualizar seus avatares" on storage.objects for update with check (bucket_id = 'avatars' and auth.uid()::text = owner::text);

drop policy if exists "Usuários podem deletar seus avatares" on storage.objects;
create policy "Usuários podem deletar seus avatares" on storage.objects for delete using (bucket_id = 'avatars' and auth.uid()::text = owner::text);

-- Tabela de Projetos
create table if not exists public.studioos_projects (
  id text primary key,
  name text not null,
  status text not null default 'planning',
  progress integer not null default 0,
  last_update text not null,
  color text not null default '#F2604C',
  owner_id uuid references auth.users(id) on delete cascade not null,
  created_at timestamptz not null default now()
);

-- Tabela de Membros do Projeto (para compartilhamento)
create table if not exists public.studioos_project_members (
  project_id text references public.studioos_projects(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  role text not null default 'editor',
  primary key (project_id, user_id)
);

-- Tabela de Tarefas
create table if not exists public.studioos_tasks (
  id text primary key,
  project_id text references public.studioos_projects(id) on delete cascade not null,
  title text not null,
  status text not null default 'todo',
  assignee_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Ativar RLS
alter table public.studioos_projects enable row level security;
alter table public.studioos_project_members enable row level security;
alter table public.studioos_tasks enable row level security;

-- Políticas para Projetos (Dono ou Membro)
drop policy if exists "Projetos visíveis para dono e membros" on public.studioos_projects;
create policy "Projetos visíveis para dono e membros"
on public.studioos_projects for select
using (auth.uid() = owner_id or exists (select 1 from public.studioos_project_members where project_id = public.studioos_projects.id and user_id = auth.uid()));

drop policy if exists "Projetos editáveis por dono e membros" on public.studioos_projects;
create policy "Projetos editáveis por dono e membros"
on public.studioos_projects for update
using (auth.uid() = owner_id or exists (select 1 from public.studioos_project_members where project_id = public.studioos_projects.id and user_id = auth.uid()));

drop policy if exists "Projetos criáveis pelo usuário" on public.studioos_projects;
create policy "Projetos criáveis pelo usuário"
on public.studioos_projects for insert
with check (auth.uid() = owner_id);

drop policy if exists "Projetos deletáveis pelo dono" on public.studioos_projects;
create policy "Projetos deletáveis pelo dono"
on public.studioos_projects for delete
using (auth.uid() = owner_id);

-- Políticas para Membros
drop policy if exists "Membros visíveis para a equipe" on public.studioos_project_members;
create policy "Membros visíveis para a equipe"
on public.studioos_project_members for select
using (
  user_id = auth.uid() or 
  public.is_project_owner(public.studioos_project_members.project_id) or
  public.is_project_member(project_id)
);

drop policy if exists "Apenas o dono do projeto pode adicionar membros" on public.studioos_project_members;
create policy "Apenas o dono do projeto pode adicionar membros"
on public.studioos_project_members for insert
with check (public.is_project_owner(project_id));

drop policy if exists "Apenas o dono pode remover membros" on public.studioos_project_members;
create policy "Apenas o dono pode remover membros"
on public.studioos_project_members for delete
using (public.is_project_owner(project_id));

-- Políticas para Tarefas
drop policy if exists "Tarefas visíveis para dono e membros" on public.studioos_tasks;
create policy "Tarefas visíveis para dono e membros"
on public.studioos_tasks for select
using (
  exists (select 1 from public.studioos_projects where id = public.studioos_tasks.project_id and owner_id = auth.uid()) or 
  exists (select 1 from public.studioos_project_members where project_id = public.studioos_tasks.project_id and user_id = auth.uid())
);

drop policy if exists "Tarefas inseríveis por dono e membros" on public.studioos_tasks;
create policy "Tarefas inseríveis por dono e membros"
on public.studioos_tasks for insert
with check (
  public.is_project_owner(project_id) or 
  exists (select 1 from public.studioos_project_members where project_id = public.studioos_tasks.project_id and user_id = auth.uid())
);

drop policy if exists "Tarefas editáveis por dono e membros" on public.studioos_tasks;
create policy "Tarefas editáveis por dono e membros"
on public.studioos_tasks for update
using (
  exists (select 1 from public.studioos_projects where id = public.studioos_tasks.project_id and owner_id = auth.uid()) or 
  exists (select 1 from public.studioos_project_members where project_id = public.studioos_tasks.project_id and user_id = auth.uid())
);

drop policy if exists "Tarefas deletáveis por dono e membros" on public.studioos_tasks;
create policy "Tarefas deletáveis por dono e membros"
on public.studioos_tasks for delete
using (
  exists (select 1 from public.studioos_projects where id = public.studioos_tasks.project_id and owner_id = auth.uid()) or 
  exists (select 1 from public.studioos_project_members where project_id = public.studioos_tasks.project_id and user_id = auth.uid())
);

-- Ativar realtime (para colaboração online)
alter publication supabase_realtime add table public.studioos_projects;
alter publication supabase_realtime add table public.studioos_tasks;
alter publication supabase_realtime add table public.studioos_project_members;

-- Função para adicionar membro por @canal
create or replace function public.add_member_by_channel(p_project_id text, p_channel text, p_role text default 'editor')
returns boolean
language plpgsql
security definer set search_path = public
as $body$
declare
  v_user_id uuid;
begin
  -- Checa se quem chama é o dono do projeto
  if not exists (select 1 from public.studioos_projects where id = p_project_id and owner_id = auth.uid()) then
    return false;
  end if;

  select id into v_user_id from public.profiles where channel = p_channel;
  if v_user_id is null then
    return false;
  end if;

  insert into public.studioos_project_members (project_id, user_id, role)
  values (p_project_id, v_user_id, p_role)
  on conflict do nothing;

  return true;
end;
$body$;

-- Tabela de Aplica��es para Projeto
create table if not exists public.studioos_project_applications (
  id uuid primary key default gen_random_uuid(),
  project_id text references public.studioos_projects(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  role text not null default 'editor',
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  unique(project_id, user_id)
);

alter table public.studioos_project_applications enable row level security;

create policy "Dono pode ver aplicacoes"
on public.studioos_project_applications for select
using (public.is_project_owner(project_id));

create policy "Usuario pode ver suas aplicacoes"
on public.studioos_project_applications for select
using (user_id = auth.uid());

create policy "Qualquer um logado pode aplicar"
on public.studioos_project_applications for insert
with check (user_id = auth.uid());

create policy "Dono pode gerenciar aplicacoes"
on public.studioos_project_applications for update
using (public.is_project_owner(project_id));

create policy "Dono pode deletar aplicacoes"
on public.studioos_project_applications for delete
using (public.is_project_owner(project_id));

create or replace function apply_for_project(p_project_id text, p_role text)
returns boolean
language plpgsql
security definer
as $body$
begin
  insert into public.studioos_project_applications (project_id, user_id, role)
  values (p_project_id, auth.uid(), p_role)
  on conflict (project_id, user_id) do update set status = 'pending', role = p_role;
  return true;
end;
$body$;

create or replace function accept_application(p_application_id uuid)
returns boolean
language plpgsql
security definer
as $body$
declare
  v_project_id text;
  v_user_id uuid;
  v_role text;
  v_owner_id uuid;
begin
  select project_id, user_id, role into v_project_id, v_user_id, v_role
  from public.studioos_project_applications
  where id = p_application_id;

  if not found then return false; end if;

  select owner_id into v_owner_id
  from public.studioos_projects
  where id = v_project_id;

  if v_owner_id != auth.uid() then return false; end if;

  insert into public.studioos_project_members (project_id, user_id, role)
  values (v_project_id, v_user_id, v_role)
  on conflict (project_id, user_id) do update set role = v_role;

  update public.studioos_project_applications
  set status = 'accepted'
  where id = p_application_id;
  
  return true;
end;
$body$;
create or replace function get_project_applications(p_project_id text)
returns table(
  id uuid,
  user_id uuid,
  role text,
  status text,
  created_at timestamptz,
  channel text,
  name text,
  avatar_url text
)
language plpgsql
security definer
as $body$
begin
  if not exists (select 1 from public.studioos_projects where studioos_projects.id = p_project_id and owner_id = auth.uid()) then
    return;
  end if;

  return query
  select 
    pa.id, pa.user_id, pa.role, pa.status, pa.created_at,
    p.channel, p.full_name as name, p.avatar_url
  from public.studioos_project_applications pa
  join public.profiles p on p.id = pa.user_id
  where pa.project_id = p_project_id and pa.status = 'pending'
  order by pa.created_at asc;
end;
$body$;

-- Tabela de Notas do Projeto
create table if not exists public.studioos_project_notes (
  id uuid primary key default gen_random_uuid(),
  project_id text references public.studioos_projects(id) on delete cascade not null,
  author_id uuid references auth.users(id) on delete cascade not null,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.studioos_project_notes enable row level security;

create policy "Notas visiveis para equipe"
on public.studioos_project_notes for select
using (
  public.is_project_owner(project_id) or 
  exists (select 1 from public.studioos_project_members where project_id = public.studioos_project_notes.project_id and user_id = auth.uid())
);

create policy "Membros podem criar notas"
on public.studioos_project_notes for insert
with check (
  public.is_project_owner(project_id) or 
  exists (select 1 from public.studioos_project_members where project_id = public.studioos_project_notes.project_id and user_id = auth.uid())
);

create policy "Autores podem editar notas"
on public.studioos_project_notes for update
using (author_id = auth.uid());

create policy "Dono e Autores podem deletar"
on public.studioos_project_notes for delete
using (
  author_id = auth.uid() or
  public.is_project_owner(project_id)
);
-- ==============================================================================
-- StudioOS · Sistema de Curtidas de Perfis (Exclusivo StudioOS)
-- Separado da conta Aster global, focado no ecossistema e estatísticas do estúdio
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

-- Função para consultar status de like e contagem no StudioOS
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
set search_path = public, auth
as $$
declare
  v_uid uuid;
  v_is_temp boolean;
  v_exists boolean;
  v_new_count bigint;
  v_liked boolean;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'Usuário não autenticado';
  end if;

  -- Bloquear contas de teste temporárias de curtir perfis
  select coalesce((raw_user_meta_data->>'is_temporary')::boolean, false)
  into v_is_temp
  from auth.users
  where id = v_uid;

  if v_is_temp then
    raise exception 'Contas de teste não podem curtir perfis. Crie uma conta definitiva para interagir.';
  end if;
  
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

  select count(*) into v_new_count
  from public.studioos_profile_likes
  where target_user_id = p_target_id;

  update public.profiles
  set stats = jsonb_set(
    coalesce(stats, '{}'::jsonb),
    '{likes_count}',
    to_jsonb(v_new_count)
  )
  where id = p_target_id;

  return jsonb_build_object(
    'liked', v_liked,
    'likes_count', v_new_count
  );
end;
$$;

-- Função para alternar like de convidado/visitante no StudioOS
create or replace function public.studioos_toggle_profile_like_guest(p_target_id uuid, p_liked boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count bigint;
begin
  select count(*) into v_count
  from public.studioos_profile_likes
  where target_user_id = p_target_id;

  if p_liked then
    v_count := v_count + 1;
  else
    v_count := greatest(0, v_count - 1);
  end if;

  update public.profiles
  set stats = jsonb_set(
    coalesce(stats, '{}'::jsonb),
    '{likes_count}',
    to_jsonb(v_count)
  )
  where id = p_target_id;

  return jsonb_build_object(
    'liked', p_liked,
    'likes_count', v_count
  );
end;
$$;

-- Aliases para retrocompatibilidade
create or replace function public.get_profile_likes_info(p_target_id uuid)
returns jsonb language sql security definer as $$ select public.studioos_get_profile_likes_info(p_target_id); $$;

create or replace function public.toggle_profile_like(p_target_id uuid)
returns jsonb language sql security definer as $$ select public.studioos_toggle_profile_like(p_target_id); $$;

create or replace function public.toggle_profile_like_guest(p_target_id uuid, p_liked boolean)
returns jsonb language sql security definer as $$ select public.studioos_toggle_profile_like_guest(p_target_id, p_liked); $$;

grant execute on function public.studioos_get_profile_likes_info(uuid) to anon, authenticated;
grant execute on function public.studioos_toggle_profile_like(uuid) to authenticated;
grant execute on function public.studioos_toggle_profile_like_guest(uuid, boolean) to anon, authenticated;
grant execute on function public.get_profile_likes_info(uuid) to anon, authenticated;
grant execute on function public.toggle_profile_like(uuid) to authenticated;
grant execute on function public.toggle_profile_like_guest(uuid, boolean) to anon, authenticated;

-- Função oficial para buscar o ranking público dos criadores no StudioOS
create or replace function public.studioos_get_creators_ranking()
returns table (
  id uuid,
  full_name text,
  channel text,
  avatar_url text,
  bio text,
  likes_count bigint,
  completed_projects bigint,
  total_projects bigint,
  ideias_ranqueadas bigint,
  total_runs bigint,
  streak bigint
)
language sql
security definer
set search_path = public
as $$
  select
    p.id,
    coalesce(nullif(trim(p.full_name), ''), 'Criador StudioOS') as full_name,
    coalesce(nullif(trim(p.channel), ''), 'user_' || substr(p.id::text, 1, 6)) as channel,
    p.avatar_url,
    p.bio,
    coalesce((select count(*) from public.studioos_profile_likes l where l.target_user_id = p.id), ((p.stats->>'likes_count')::bigint), 0::bigint) as likes_count,
    coalesce((select count(*) from public.studioos_projects pr where pr.owner_id = p.id and (pr.status = 'completed' or pr.progress >= 100)), ((p.stats->>'projetos_concluidos')::bigint), 0::bigint) as completed_projects,
    coalesce((select count(*) from public.studioos_projects pr where pr.owner_id = p.id and pr.status != 'trashed'), ((p.stats->>'projetos')::bigint), 0::bigint) as total_projects,
    coalesce(((p.stats->>'ideias_ranqueadas')::bigint), 0::bigint) as ideias_ranqueadas,
    coalesce(((p.stats->>'total_runs')::bigint), 0::bigint) as total_runs,
    coalesce(((p.stats->>'streak')::bigint), 0::bigint) as streak
  from public.profiles p
  order by likes_count desc, completed_projects desc, ideias_ranqueadas desc;
$$;

grant execute on function public.studioos_get_creators_ranking() to anon, authenticated;

-- ==============================================================================
-- StudioOS · Sistema de Comentários de Perfis
-- Regra 1: Qualquer um pode visualizar os comentários públicos.
-- Regra 2: Apenas usuários autenticados com conta real podem comentar nos perfis.
-- Regra 3: O autor do comentário OU o dono do perfil podem apagar os comentários.
-- ==============================================================================

create table if not exists public.studioos_profile_comments (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.studioos_profile_comments enable row level security;

create policy "comments_select_all" on public.studioos_profile_comments for select using (true);
create policy "comments_insert_authenticated" on public.studioos_profile_comments for insert with check (auth.uid() = author_id);
create policy "comments_delete_owner_or_author" on public.studioos_profile_comments for delete using (auth.uid() = author_id or auth.uid() = profile_id);

create or replace function public.studioos_get_profile_comments(p_profile_id uuid)
returns table (
  id uuid,
  profile_id uuid,
  author_id uuid,
  content text,
  created_at timestamptz,
  author_name text,
  author_channel text,
  author_avatar text
)
language sql
security definer
set search_path = public
as $$
  select
    c.id,
    c.profile_id,
    c.author_id,
    c.content,
    c.created_at,
    coalesce(p.full_name, 'Criador') as author_name,
    p.channel as author_channel,
    p.avatar_url as author_avatar
  from public.studioos_profile_comments c
  join public.profiles p on p.id = c.author_id
  where c.profile_id = p_profile_id
  order by c.created_at desc;
$$;

grant execute on function public.studioos_get_profile_comments(uuid) to anon, authenticated;
grant select, insert, update, delete on table public.studioos_profile_comments to anon, authenticated;




-- Regra de negócio: Usuário só pode alterar o @usuario se o e-mail estiver confirmado
create or replace function public.check_channel_update_email_verified()
returns trigger as $$
declare
  v_confirmed_at timestamptz;
begin
  if old.channel is not null and new.channel is distinct from old.channel then
    select email_confirmed_at into v_confirmed_at from auth.users where id = new.id;
    if v_confirmed_at is null then
      raise exception 'Você só pode alterar seu nome de usuário após confirmar o seu e-mail.';
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_check_channel_update_email_verified on public.profiles;
create trigger trg_check_channel_update_email_verified
before update of channel on public.profiles
for each row
execute function public.check_channel_update_email_verified();

-- Bloqueio de comentários em perfis para contas de teste temporárias
create or replace function public.check_comment_not_test_account()
returns trigger as $$
declare
  v_is_temp boolean;
begin
  select coalesce((raw_user_meta_data->>'is_temporary')::boolean, false)
  into v_is_temp
  from auth.users
  where id = new.author_id;

  if v_is_temp then
    raise exception 'Contas de teste não podem comentar em perfis. Crie uma conta definitiva para interagir.';
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public, auth;

drop trigger if exists trg_check_comment_not_test_account on public.studioos_profile_comments;
create trigger trg_check_comment_not_test_account
before insert on public.studioos_profile_comments
for each row
execute function public.check_comment_not_test_account();

-- Limpeza automtica de contas temporrias de teste aps 24h
create or replace function public.cleanup_expired_test_accounts()
returns integer as $$
declare
  v_count integer := 0;
begin
  with deleted as (
    delete from auth.users
    where (raw_user_meta_data->>'is_temporary')::boolean = true
      and (raw_user_meta_data->>'expires_at')::timestamptz < now()
    returning id
  )
  select count(*) into v_count from deleted;
  return v_count;
end;
$$ language plpgsql security definer set search_path = public, auth;
