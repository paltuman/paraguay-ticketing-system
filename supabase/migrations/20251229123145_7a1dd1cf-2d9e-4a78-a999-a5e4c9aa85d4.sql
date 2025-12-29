-- Add RLS policy for admins to update any profile (including is_active)
CREATE POLICY "Admins can update all profiles" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (public.is_admin(auth.uid()));

-- Enable realtime for profiles table to detect is_active changes
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;