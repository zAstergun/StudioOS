create or replace function public.is_project_owner(p_project_id text)
returns boolean
language sql
security definer set search_path = public
as $$
  select exists(select 1 from public.studioos_projects where id = p_project_id and owner_id = auth.uid());
$$;

DO $$ 
DECLARE
    pol record;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'studioos_project_members' AND schemaname = 'public' LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.studioos_project_members', pol.policyname);
    END LOOP;
END $$;

create policy "Membros visíveis para a equipe"
on public.studioos_project_members for select
using (
  user_id = auth.uid() or 
  public.is_project_owner(public.studioos_project_members.project_id) or
  exists (select 1 from public.studioos_project_members pm where pm.project_id = public.studioos_project_members.project_id and pm.user_id = auth.uid())
);

create policy "Apenas o dono do projeto pode adicionar membros"
on public.studioos_project_members for insert
with check (public.is_project_owner(project_id));

create policy "Apenas o dono pode remover membros"
on public.studioos_project_members for delete
using (public.is_project_owner(project_id));
