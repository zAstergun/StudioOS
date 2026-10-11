-- ========================================================
-- FIX RLS & FUNÇÃO PARA SAIR DE PROJETOS NO STUDIOOS
-- ========================================================

-- 1. Políticas RLS para studioos_project_members
DROP POLICY IF EXISTS "Membros visíveis para a equipe" ON public.studioos_project_members;
DROP POLICY IF EXISTS "Apenas o dono do projeto pode adicionar membros" ON public.studioos_project_members;
DROP POLICY IF EXISTS "Apenas o dono pode remover membros" ON public.studioos_project_members;
DROP POLICY IF EXISTS "Apenas o dono ou o próprio membro podem remover membros" ON public.studioos_project_members;

CREATE POLICY "Membros visíveis para a equipe"
ON public.studioos_project_members FOR SELECT
USING (
  user_id = auth.uid() OR 
  public.is_project_owner(project_id) OR
  EXISTS (SELECT 1 FROM public.studioos_project_members pm WHERE pm.project_id = studioos_project_members.project_id AND pm.user_id = auth.uid())
);

CREATE POLICY "Apenas o dono do projeto pode adicionar membros"
ON public.studioos_project_members FOR INSERT
WITH CHECK (public.is_project_owner(project_id) OR user_id = auth.uid());

-- Permite que tanto o proprietário quanto o próprio participante excluam o registro de membro
CREATE POLICY "Apenas o dono ou o próprio membro podem remover membros"
ON public.studioos_project_members FOR DELETE
USING (public.is_project_owner(project_id) OR user_id = auth.uid());

-- 2. Políticas RLS para studioos_project_applications
DROP POLICY IF EXISTS "Dono pode deletar aplicacoes" ON public.studioos_project_applications;
DROP POLICY IF EXISTS "Dono ou usuario pode deletar aplicacoes" ON public.studioos_project_applications;
CREATE POLICY "Dono ou usuario pode deletar aplicacoes"
ON public.studioos_project_applications FOR DELETE
USING (public.is_project_owner(project_id) OR user_id = auth.uid());

-- 3. Função RPC para desvinculação completa e segura (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.leave_project(p_project_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Remove o membro da equipe
  DELETE FROM public.studioos_project_members
  WHERE project_id = p_project_id AND user_id = auth.uid();

  -- Remove qualquer solicitação/aplicação pendente ou aprovada
  DELETE FROM public.studioos_project_applications
  WHERE project_id = p_project_id AND user_id = auth.uid();

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.leave_project(text) TO authenticated, anon;

-- 4. Função RPC para transferir propriedade
CREATE OR REPLACE FUNCTION public.transfer_project_ownership(p_project_id text, p_new_owner_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_old_owner_id uuid;
BEGIN
  SELECT owner_id INTO v_old_owner_id
  FROM public.studioos_projects
  WHERE id = p_project_id;

  IF v_old_owner_id != auth.uid() THEN
    RETURN false;
  END IF;

  IF v_old_owner_id = p_new_owner_id THEN
    RETURN true;
  END IF;

  UPDATE public.studioos_projects
  SET owner_id = p_new_owner_id
  WHERE id = p_project_id;

  INSERT INTO public.studioos_project_members (project_id, user_id, role)
  VALUES (p_project_id, v_old_owner_id, 'editor')
  ON CONFLICT (project_id, user_id) DO UPDATE SET role = 'editor';

  DELETE FROM public.studioos_project_members
  WHERE project_id = p_project_id AND user_id = p_new_owner_id;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.transfer_project_ownership(text, uuid) TO authenticated, anon;
