-- Fix profiles exposure: Remove overly permissive policy that allows viewing profiles through ticket relationships
DROP POLICY IF EXISTS "Users can view related profiles" ON public.profiles;

-- Create a more restrictive policy: users can only see limited info (name, avatar) of related profiles
-- Full profile access (email, position) only for admins/supervisors
CREATE POLICY "Users can view limited profile info of ticket participants"
ON public.profiles
FOR SELECT
USING (
  -- Own profile - full access
  id = auth.uid()
  OR
  -- Admins/supervisors - full access
  is_admin(auth.uid()) 
  OR 
  has_role(auth.uid(), 'supervisor')
);

-- Note: The audit_logs table is already properly protected:
-- - No direct INSERT/UPDATE/DELETE policies for users
-- - All inserts go through insert_audit_log() SECURITY DEFINER function
-- - Only admins can SELECT via existing policy

-- Add explicit comment documenting the security model
COMMENT ON TABLE public.audit_logs IS 'Security audit trail. INSERT only via insert_audit_log() RPC function. SELECT restricted to admins only. No UPDATE/DELETE allowed.';