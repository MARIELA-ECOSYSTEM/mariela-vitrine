-- Revoke default execution from PUBLIC for all functions in the public schema
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;

-- Re-grant execution to authenticated users for necessary functions
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- Hardening handle_updated_at (trigger function) - should only be called by the system
REVOKE EXECUTE ON FUNCTION public.handle_updated_at() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_updated_at() FROM anon;

-- Update has_role to prevent info leakage (checking other users' roles)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role) 
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
