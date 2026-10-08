-- StudioOS · tabela de perfis (opcional, mas recomendada)
-- Execute no Supabase: SQL Editor → New query → Run

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  channel text,
  avatar_url text,
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
create table if not exists public.projects (
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
create table if not exists public.project_members (
  project_id text references public.projects(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  role text not null default 'editor',
  primary key (project_id, user_id)
);

-- Tabela de Tarefas
create table if not exists public.tasks (
  id text primary key,
  project_id text references public.projects(id) on delete cascade not null,
  title text not null,
  status text not null default 'todo',
  assignee_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Ativar RLS
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.tasks enable row level security;

-- Políticas para Projetos (Dono ou Membro)
drop policy if exists "Projetos visíveis para dono e membros" on public.projects;
create policy "Projetos visíveis para dono e membros"
on public.projects for select
using (auth.uid() = owner_id or exists (select 1 from public.project_members where project_id = public.projects.id and user_id = auth.uid()));

drop policy if exists "Projetos editáveis por dono e membros" on public.projects;
create policy "Projetos editáveis por dono e membros"
on public.projects for update
using (auth.uid() = owner_id or exists (select 1 from public.project_members where project_id = public.projects.id and user_id = auth.uid()));

drop policy if exists "Projetos criáveis pelo usuário" on public.projects;
create policy "Projetos criáveis pelo usuário"
on public.projects for insert
with check (auth.uid() = owner_id);

drop policy if exists "Projetos deletáveis pelo dono" on public.projects;
create policy "Projetos deletáveis pelo dono"
on public.projects for delete
using (auth.uid() = owner_id);

-- Políticas para Membros
drop policy if exists "Membros visíveis para a equipe" on public.project_members;
create policy "Membros visíveis para a equipe"
on public.project_members for select
using (
  user_id = auth.uid() or 
  exists (select 1 from public.projects where id = public.project_members.project_id and owner_id = auth.uid()) or
  exists (select 1 from public.project_members pm where pm.project_id = public.project_members.project_id and pm.user_id = auth.uid())
);

drop policy if exists "Apenas o dono do projeto pode adicionar membros" on public.project_members;
create policy "Apenas o dono do projeto pode adicionar membros"
on public.project_members for insert
with check (exists (select 1 from public.projects where id = project_id and owner_id = auth.uid()));

drop policy if exists "Apenas o dono pode remover membros" on public.project_members;
create policy "Apenas o dono pode remover membros"
on public.project_members for delete
using (exists (select 1 from public.projects where id = project_id and owner_id = auth.uid()));

-- Políticas para Tarefas
drop policy if exists "Tarefas visíveis para dono e membros" on public.tasks;
create policy "Tarefas visíveis para dono e membros"
on public.tasks for select
using (
  exists (select 1 from public.projects where id = public.tasks.project_id and owner_id = auth.uid()) or 
  exists (select 1 from public.project_members where project_id = public.tasks.project_id and user_id = auth.uid())
);

drop policy if exists "Tarefas inseríveis por dono e membros" on public.tasks;
create policy "Tarefas inseríveis por dono e membros"
on public.tasks for insert
with check (
  exists (select 1 from public.projects where id = project_id and owner_id = auth.uid()) or 
  exists (select 1 from public.project_members where project_id = public.tasks.project_id and user_id = auth.uid())
);

drop policy if exists "Tarefas editáveis por dono e membros" on public.tasks;
create policy "Tarefas editáveis por dono e membros"
on public.tasks for update
using (
  exists (select 1 from public.projects where id = public.tasks.project_id and owner_id = auth.uid()) or 
  exists (select 1 from public.project_members where project_id = public.tasks.project_id and user_id = auth.uid())
);

drop policy if exists "Tarefas deletáveis por dono e membros" on public.tasks;
create policy "Tarefas deletáveis por dono e membros"
on public.tasks for delete
using (
  exists (select 1 from public.projects where id = public.tasks.project_id and owner_id = auth.uid()) or 
  exists (select 1 from public.project_members where project_id = public.tasks.project_id and user_id = auth.uid())
);

-- Ativar realtime (para colaboração online)
alter publication supabase_realtime add table public.projects;
alter publication supabase_realtime add table public.tasks;
alter publication supabase_realtime add table public.project_members;

-- Função para adicionar membro por @canal
create or replace function public.add_member_by_channel(p_project_id text, p_channel text, p_role text default 'editor')
returns boolean
language plpgsql
security definer set search_path = public
as $body
declare
  v_user_id uuid;
begin
  -- Checa se quem chama é o dono do projeto
  if not exists (select 1 from public.projects where id = p_project_id and owner_id = auth.uid()) then
    return false;
  end if;

  select id into v_user_id from public.profiles where channel = p_channel;
  if v_user_id is null then
    return false;
  end if;

  insert into public.project_members (project_id, user_id, role)
  values (p_project_id, v_user_id, p_role)
  on conflict do nothing;

  return true;
end;
$body;

-- Tabela de Aplica��es para Projeto
create table if not exists public.project_applications (
  id uuid primary key default gen_random_uuid(),
  project_id text references public.projects(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  role text not null default 'editor',
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  unique(project_id, user_id)
);

alter table public.project_applications enable row level security;

create policy "Dono pode ver aplicacoes"
on public.project_applications for select
using (exists (select 1 from public.projects where id = project_id and owner_id = auth.uid()));

create policy "Usuario pode ver suas aplicacoes"
on public.project_applications for select
using (user_id = auth.uid());

create policy "Qualquer um logado pode aplicar"
on public.project_applications for insert
with check (user_id = auth.uid());

create policy "Dono pode gerenciar aplicacoes"
on public.project_applications for update
using (exists (select 1 from public.projects where id = project_id and owner_id = auth.uid()));

create policy "Dono pode deletar aplicacoes"
on public.project_applications for delete
using (exists (select 1 from public.projects where id = project_id and owner_id = auth.uid()));

create or replace function apply_for_project(p_project_id text, p_role text)
returns boolean
language plpgsql
security definer
as $body$
begin
  insert into public.project_applications (project_id, user_id, role)
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
  from public.project_applications
  where id = p_application_id;

  if not found then return false; end if;

  select owner_id into v_owner_id
  from public.projects
  where id = v_project_id;

  if v_owner_id != auth.uid() then return false; end if;

  insert into public.project_members (project_id, user_id, role)
  values (v_project_id, v_user_id, v_role)
  on conflict (project_id, user_id) do update set role = v_role;

  update public.project_applications
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
  if not exists (select 1 from public.projects where projects.id = p_project_id and owner_id = auth.uid()) then
    return;
  end if;

  return query
  select 
    pa.id, pa.user_id, pa.role, pa.status, pa.created_at,
    p.channel, p.name, p.avatar_url
  from public.project_applications pa
  join public.profiles p on p.id = pa.user_id
  where pa.project_id = p_project_id and pa.status = 'pending'
  order by pa.created_at asc;
end;
$body$;

-- Tabela de Notas do Projeto
create table if not exists public.project_notes (
  id uuid primary key default gen_random_uuid(),
  project_id text references public.projects(id) on delete cascade not null,
  author_id uuid references auth.users(id) on delete cascade not null,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.project_notes enable row level security;

create policy "Notas visiveis para equipe"
on public.project_notes for select
using (
  exists (select 1 from public.projects where id = project_id and owner_id = auth.uid()) or 
  exists (select 1 from public.project_members where project_id = public.project_notes.project_id and user_id = auth.uid())
);

create policy "Membros podem criar notas"
on public.project_notes for insert
with check (
  exists (select 1 from public.projects where id = project_id and owner_id = auth.uid()) or 
  exists (select 1 from public.project_members where project_id = public.project_notes.project_id and user_id = auth.uid())
);

create policy "Autores podem editar notas"
on public.project_notes for update
using (author_id = auth.uid());

create policy "Dono e Autores podem deletar"
on public.project_notes for delete
using (
  author_id = auth.uid() or
  exists (select 1 from public.projects where id = project_id and owner_id = auth.uid())
);
