-- ========================================================
-- FIX RLS & ELIMINAÇÃO DEFINITIVA DE RECURSÃO INFINITA
-- ========================================================

-- 1. Dropar funções e políticas antigas dependentes
DROP FUNCTION IF EXISTS public.is_project_owner(text) CASCADE;
DROP FUNCTION IF EXISTS public.is_project_member(text) CASCADE;

-- 2. Funções de checagem em PLPGSQL SECURITY DEFINER
-- O uso de plpgsql impede que o query planner do Postgres faça inlining da função
-- na política RLS, garantindo execução com privilégios de superuser (BYPASSRLS)
CREATE OR REPLACE FUNCTION public.is_project_owner(p_project_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.studioos_projects
    WHERE id = p_project_id AND owner_id = auth.uid()
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_project_member(p_project_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.studioos_project_members
    WHERE project_id = p_project_id AND user_id = auth.uid()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_project_owner(text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_project_member(text) TO authenticated, anon;

-- 3. Políticas em studioos_projects
DROP POLICY IF EXISTS "Projetos visíveis para dono e membros" ON public.studioos_projects;
CREATE POLICY "Projetos visíveis para dono e membros"
ON public.studioos_projects FOR SELECT
USING (
  auth.uid() = owner_id OR
  public.is_project_member(id)
);

DROP POLICY IF EXISTS "Projetos editáveis por dono e membros" ON public.studioos_projects;
CREATE POLICY "Projetos editáveis por dono e membros"
ON public.studioos_projects FOR UPDATE
USING (
  auth.uid() = owner_id OR
  public.is_project_member(id)
)
WITH CHECK (true);

DROP POLICY IF EXISTS "Projetos criáveis pelo usuário" ON public.studioos_projects;
CREATE POLICY "Projetos criáveis pelo usuário"
ON public.studioos_projects FOR INSERT
WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Projetos deletáveis pelo dono" ON public.studioos_projects;
CREATE POLICY "Projetos deletáveis pelo dono"
ON public.studioos_projects FOR DELETE
USING (auth.uid() = owner_id);

-- 4. Políticas em studioos_project_members
DROP POLICY IF EXISTS "Membros visíveis para a equipe" ON public.studioos_project_members;
CREATE POLICY "Membros visíveis para a equipe"
ON public.studioos_project_members FOR SELECT
USING (
  user_id = auth.uid() OR
  public.is_project_owner(project_id) OR
  public.is_project_member(project_id)
);

DROP POLICY IF EXISTS "Apenas o dono do projeto pode adicionar membros" ON public.studioos_project_members;
CREATE POLICY "Apenas o dono do projeto pode adicionar membros"
ON public.studioos_project_members FOR INSERT
WITH CHECK (public.is_project_owner(project_id) OR user_id = auth.uid());

DROP POLICY IF EXISTS "Apenas o dono ou o próprio membro podem remover membros" ON public.studioos_project_members;
DROP POLICY IF EXISTS "Apenas o dono pode remover membros" ON public.studioos_project_members;
CREATE POLICY "Apenas o dono ou o próprio membro podem remover membros"
ON public.studioos_project_members FOR DELETE
USING (public.is_project_owner(project_id) OR user_id = auth.uid());

DROP POLICY IF EXISTS "Dono ou membro podem atualizar membros" ON public.studioos_project_members;
CREATE POLICY "Dono ou membro podem atualizar membros"
ON public.studioos_project_members FOR UPDATE
USING (public.is_project_owner(project_id) OR user_id = auth.uid())
WITH CHECK (public.is_project_owner(project_id) OR user_id = auth.uid());

-- 5. Políticas para Tarefas (studioos_tasks)
DROP POLICY IF EXISTS "Tarefas visíveis para dono e membros" ON public.studioos_tasks;
CREATE POLICY "Tarefas visíveis para dono e membros"
ON public.studioos_tasks FOR SELECT
USING (
  public.is_project_owner(project_id) OR
  public.is_project_member(project_id)
);

DROP POLICY IF EXISTS "Tarefas inseríveis por dono e membros" ON public.studioos_tasks;
CREATE POLICY "Tarefas inseríveis por dono e membros"
ON public.studioos_tasks FOR INSERT
WITH CHECK (
  public.is_project_owner(project_id) OR
  public.is_project_member(project_id)
);

DROP POLICY IF EXISTS "Tarefas editáveis por dono e membros" ON public.studioos_tasks;
CREATE POLICY "Tarefas editáveis por dono e membros"
ON public.studioos_tasks FOR UPDATE
USING (
  public.is_project_owner(project_id) OR
  public.is_project_member(project_id)
);

DROP POLICY IF EXISTS "Tarefas deletáveis por dono e membros" ON public.studioos_tasks;
CREATE POLICY "Tarefas deletáveis por dono e membros"
ON public.studioos_tasks FOR DELETE
USING (
  public.is_project_owner(project_id) OR
  public.is_project_member(project_id)
);

-- 6. Políticas para Aplicações (studioos_project_applications)
DROP POLICY IF EXISTS "Dono pode ver aplicacoes" ON public.studioos_project_applications;
CREATE POLICY "Dono pode ver aplicacoes"
ON public.studioos_project_applications FOR SELECT
USING (public.is_project_owner(project_id));

DROP POLICY IF EXISTS "Usuario pode ver suas aplicacoes" ON public.studioos_project_applications;
CREATE POLICY "Usuario pode ver suas aplicacoes"
ON public.studioos_project_applications FOR SELECT
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Qualquer um logado pode aplicar" ON public.studioos_project_applications;
CREATE POLICY "Qualquer um logado pode aplicar"
ON public.studioos_project_applications FOR INSERT
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Dono pode gerenciar aplicacoes" ON public.studioos_project_applications;
CREATE POLICY "Dono pode gerenciar aplicacoes"
ON public.studioos_project_applications FOR UPDATE
USING (public.is_project_owner(project_id));

DROP POLICY IF EXISTS "Usuario pode atualizar sua propria aplicacao" ON public.studioos_project_applications;
CREATE POLICY "Usuario pode atualizar sua propria aplicacao"
ON public.studioos_project_applications FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Dono pode deletar aplicacoes" ON public.studioos_project_applications;
DROP POLICY IF EXISTS "Dono ou usuario pode deletar aplicacoes" ON public.studioos_project_applications;
CREATE POLICY "Dono ou usuario pode deletar aplicacoes"
ON public.studioos_project_applications FOR DELETE
USING (public.is_project_owner(project_id) OR user_id = auth.uid());

-- 7. Função RPC leave_project (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.leave_project(p_project_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.studioos_project_members
  WHERE project_id = p_project_id AND user_id = auth.uid();

  DELETE FROM public.studioos_project_applications
  WHERE project_id = p_project_id AND user_id = auth.uid();

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.leave_project(text) TO authenticated, anon;

-- 8. Função RPC para transferir propriedade
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
