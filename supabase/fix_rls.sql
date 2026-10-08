DROP POLICY IF EXISTS "Membros visíveis para a equipe" ON public.studioos_project_members;
DROP POLICY IF EXISTS "Apenas o dono do projeto pode adicionar membros" ON public.studioos_project_members;
DROP POLICY IF EXISTS "Apenas o dono pode remover membros" ON public.studioos_project_members;

CREATE POLICY "Membros visíveis para a equipe"
ON public.studioos_project_members FOR SELECT
USING (
  user_id = auth.uid() OR 
  public.is_project_owner(project_id) OR
  EXISTS (SELECT 1 FROM public.studioos_project_members pm WHERE pm.project_id = studioos_project_members.project_id AND pm.user_id = auth.uid())
);

CREATE POLICY "Apenas o dono do projeto pode adicionar membros"
ON public.studioos_project_members FOR INSERT
WITH CHECK (public.is_project_owner(project_id));

CREATE POLICY "Apenas o dono pode remover membros"
ON public.studioos_project_members FOR DELETE
USING (public.is_project_owner(project_id));
