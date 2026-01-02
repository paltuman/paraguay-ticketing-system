-- =====================================================
-- FIX: Profiles - Restrict full profile access, create function for limited info
-- =====================================================

-- Drop the policy that might allow viewing other profiles
DROP POLICY IF EXISTS "Users can view limited profile info of ticket participants" ON public.profiles;

-- Ensure only own profile or admin/supervisor can view full profiles
-- The existing policies should handle this:
-- - "Users can view own profile" - SELECT for id = auth.uid()
-- - "Admins can view all profiles" - SELECT for is_admin() or supervisor

-- Create a secure function to get limited profile info for ticket participants
-- This returns only name and avatar, not email or position
CREATE OR REPLACE FUNCTION public.get_ticket_participant_info(p_ticket_id UUID)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  avatar_url TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT p.id, p.full_name, p.avatar_url
  FROM profiles p
  JOIN tickets t ON (t.created_by = p.id OR t.assigned_to = p.id)
  WHERE t.id = p_ticket_id
  AND (
    -- User must be a participant in this ticket
    t.created_by = auth.uid()
    OR t.assigned_to = auth.uid()
    -- Or be an admin/supervisor
    OR is_admin(auth.uid())
    OR has_role(auth.uid(), 'supervisor')
  );
$$;

-- Create a function to get message sender info (limited)
CREATE OR REPLACE FUNCTION public.get_message_sender_info(p_sender_id UUID, p_ticket_id UUID)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  avatar_url TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.full_name, p.avatar_url
  FROM profiles p
  WHERE p.id = p_sender_id
  AND EXISTS (
    SELECT 1 FROM tickets t
    WHERE t.id = p_ticket_id
    AND (
      t.created_by = auth.uid()
      OR t.assigned_to = auth.uid()
      OR is_admin(auth.uid())
      OR has_role(auth.uid(), 'supervisor')
    )
  );
$$;

-- Add comments for documentation
COMMENT ON FUNCTION public.get_ticket_participant_info IS 'Returns limited profile info (name, avatar) for ticket participants. Does not expose email or position to regular users.';
COMMENT ON FUNCTION public.get_message_sender_info IS 'Returns limited profile info (name, avatar) for message senders. Does not expose email or position to regular users.';