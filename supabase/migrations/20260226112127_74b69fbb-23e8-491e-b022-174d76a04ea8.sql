
-- Drop the restrictive SELECT policy and recreate as PERMISSIVE for public read access (needed for registration)
DROP POLICY IF EXISTS "Authenticated users can view departments" ON public.departments;

CREATE POLICY "Anyone can view departments"
  ON public.departments
  FOR SELECT
  USING (true);
