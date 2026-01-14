-- Drop the broad ALL policy and create specific operation policies
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;

-- Admin can INSERT roles (using has_role function to avoid recursion)
CREATE POLICY "Admins can insert roles" ON public.user_roles
FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admin can UPDATE roles
CREATE POLICY "Admins can update roles" ON public.user_roles
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admin can DELETE roles
CREATE POLICY "Admins can delete roles" ON public.user_roles
FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admin can SELECT all roles
CREATE POLICY "Admins can view all roles" ON public.user_roles
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));