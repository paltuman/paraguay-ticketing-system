-- =====================================================
-- FIX: Voice notes storage policy - Restrict to ticket participants only
-- =====================================================
DROP POLICY IF EXISTS "Users can view voice notes in their tickets" ON storage.objects;

CREATE POLICY "Users can view voice notes in their tickets"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'voice-notes' AND
  (
    -- Admins and supervisors can view all
    is_admin(auth.uid()) OR 
    has_role(auth.uid(), 'supervisor') OR
    -- Users can only view voice notes from their tickets
    EXISTS (
      SELECT 1 FROM public.ticket_messages tm
      JOIN public.tickets t ON t.id = tm.ticket_id
      WHERE tm.voice_note_url LIKE '%' || storage.objects.name || '%'
      AND (t.created_by = auth.uid() OR t.assigned_to = auth.uid())
    )
  )
);

-- =====================================================
-- FIX: Notifications - More restrictive insert policy
-- =====================================================
DROP POLICY IF EXISTS "Service functions can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;

-- Allow inserts only from triggers (SECURITY DEFINER context) or for own notifications
CREATE POLICY "Controlled notification inserts"
ON public.notifications
FOR INSERT
WITH CHECK (
  -- Users can only create notifications for themselves (if needed)
  user_id = auth.uid()
  OR
  -- Admins can create for anyone
  is_admin(auth.uid())
);