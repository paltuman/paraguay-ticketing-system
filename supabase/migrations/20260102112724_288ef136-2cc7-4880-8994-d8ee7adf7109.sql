-- Ensure the superadmin email has proper role in database
INSERT INTO public.user_roles (user_id, role)
SELECT p.id, 'superadmin'::app_role
FROM public.profiles p
WHERE p.email = 'subsistema.pai@mspbs.gov.py'
AND NOT EXISTS (
  SELECT 1 FROM public.user_roles ur 
  WHERE ur.user_id = p.id AND ur.role = 'superadmin'
);

-- Update notification triggers to use SECURITY DEFINER (they bypass RLS)
-- The triggers already run with SECURITY DEFINER, so they can insert notifications

-- But we need to ensure triggers can insert - update the policy to allow trigger context
DROP POLICY IF EXISTS "Controlled notification inserts" ON public.notifications;

CREATE POLICY "Notifications from authorized sources"
ON public.notifications
FOR INSERT
WITH CHECK (
  -- Admins can create for anyone
  is_admin(auth.uid())
  OR
  -- Users can only create notifications for themselves
  user_id = auth.uid()
  OR
  -- Allow from SECURITY DEFINER context (triggers run as function owner)
  -- When auth.uid() returns NULL in trigger context, allow it
  (auth.uid() IS NULL)
);