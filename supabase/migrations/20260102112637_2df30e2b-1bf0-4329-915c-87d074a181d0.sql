-- FIX: Departments must be public for registration form
DROP POLICY IF EXISTS "Authenticated users can view departments" ON public.departments;

CREATE POLICY "Anyone can view departments"
ON public.departments
FOR SELECT
USING (true);