-- =====================================================
-- FIX: Allow superadmin to delete user profiles
-- =====================================================

-- Create a function to check if user is superadmin (if not exists)
CREATE OR REPLACE FUNCTION public.is_superadmin(_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'superadmin'
  )
$$;

-- Create DELETE policy for profiles - only superadmin can delete
CREATE POLICY "Superadmins can delete profiles"
ON public.profiles
FOR DELETE
USING (is_superadmin(auth.uid()));

-- Also add a comment for documentation
COMMENT ON POLICY "Superadmins can delete profiles" ON public.profiles IS 'Only superadmins can permanently delete user profiles';