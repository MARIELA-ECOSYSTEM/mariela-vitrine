-- Create a private schema
CREATE SCHEMA IF NOT EXISTS private;

-- Move is_admin to private schema
CREATE OR REPLACE FUNCTION private.is_admin() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select exists (
    select 1
    from public.user_roles
    where user_id = auth.uid()
      and role = 'admin'
  )
$$;

-- Move has_role to private schema and keep the hardening
CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role) 
RETURNS boolean
LANGUAGE sql 
STABLE 
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
      and (
        _user_id = auth.uid() -- Can check own role
        OR 
        exists ( -- Or if the caller is an admin
          select 1 from public.user_roles 
          where user_id = auth.uid() 
          and role = 'admin'
        )
      )
  )
$$;

-- Grant execution to authenticated users in the private schema
GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated;

-- Revoke execution from public for the old functions and then drop them
-- (Wait, dropping them might break RLS temporarily, better to update policies first)

-- Update app_config policies
DROP POLICY IF EXISTS "Admins can insert config" ON public.app_config;
CREATE POLICY "Admins can insert config"
  ON public.app_config
  FOR INSERT
  TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can update config" ON public.app_config;
CREATE POLICY "Admins can update config"
  ON public.app_config
  FOR UPDATE
  TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can delete config" ON public.app_config;
CREATE POLICY "Admins can delete config"
  ON public.app_config
  FOR DELETE
  TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can read all config" ON public.app_config;
CREATE POLICY "Admins can read all config"
  ON public.app_config
  FOR SELECT
  TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role));

-- Update user_roles policies
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Admins can view all roles" 
ON public.user_roles 
FOR SELECT 
TO authenticated 
USING (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
-- This policy was redundant if we have specific insert/update/delete policies, 
-- but I'll recreate it correctly if needed. The pg_policies showed specific ones too.

DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
CREATE POLICY "Admins can insert roles"
  ON public.user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
CREATE POLICY "Admins can update roles"
  ON public.user_roles
  FOR UPDATE
  TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
CREATE POLICY "Admins can delete roles"
  ON public.user_roles
  FOR DELETE
  TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role));

-- Finally, drop the public functions that cause linter warnings
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);
DROP FUNCTION IF EXISTS public.is_admin();

-- Also handle_updated_at: it's a trigger function, move to private or revoke properly
ALTER FUNCTION public.handle_updated_at() SECURITY INVOKER; -- Better as invoker for triggers if they don't need elevation
-- Wait, if it's SECURITY INVOKER, it runs as the user. Users don't have access to set updated_at usually?
-- Actually, the user is the one performing the UPDATE, so they have permission on the table.
-- Let's just revoke public access to it.
REVOKE EXECUTE ON FUNCTION public.handle_updated_at() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_updated_at() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_updated_at() FROM authenticated;
