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

create policy "Perfil visível para o próprio usuário"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Perfil editável pelo próprio usuário"
  on public.profiles for update
  using (auth.uid() = id);

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
