-- Remove duplicate and overly permissive public read policies
DROP POLICY IF EXISTS "Allow public read access" ON public.app_config;
DROP POLICY IF EXISTS "Permitir leitura pública de configurações" ON public.app_config;

-- Create specific policy for mannequins_config (public read)
CREATE POLICY "Public can read mannequins config" ON public.app_config
FOR SELECT
USING (key = 'mannequins_config');

-- Create admin-only policy for reading all other config
CREATE POLICY "Admins can read all config" ON public.app_config
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));