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
