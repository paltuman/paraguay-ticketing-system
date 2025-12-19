-- Allow unauthenticated users to read departments (needed for registration flow)
DROP POLICY IF EXISTS "Anyone can view departments" ON public.departments;

CREATE POLICY "Anyone can view departments"
ON public.departments
FOR SELECT
TO anon, authenticated
USING (true);
