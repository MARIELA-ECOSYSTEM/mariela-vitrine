DROP POLICY IF EXISTS "Allow insert mannequins config" ON public.app_config;
DROP POLICY IF EXISTS "Allow update mannequins config" ON public.app_config;
DROP POLICY IF EXISTS "Allow delete mannequins config" ON public.app_config;

CREATE POLICY "Admins can insert config"
  ON public.app_config
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can update config"
  ON public.app_config
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can delete config"
  ON public.app_config
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));