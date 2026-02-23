
-- 1. Fix departments: require authentication for viewing
DROP POLICY IF EXISTS "Anyone can view departments" ON public.departments;
CREATE POLICY "Authenticated users can view departments"
ON public.departments
FOR SELECT
TO authenticated
USING (true);

-- 2. Fix notifications INSERT: remove auth.uid() IS NULL condition
DROP POLICY IF EXISTS "Notifications from authorized sources" ON public.notifications;
CREATE POLICY "Notifications from authorized sources"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (
  is_admin(auth.uid()) 
  OR (user_id = auth.uid()) 
  OR (current_setting('app.inserting_notification', true) = 'true')
);

-- 3. Add ON DELETE CASCADE to ticket-related foreign keys
-- ticket_messages
ALTER TABLE public.ticket_messages DROP CONSTRAINT IF EXISTS ticket_messages_ticket_id_fkey;
ALTER TABLE public.ticket_messages ADD CONSTRAINT ticket_messages_ticket_id_fkey
  FOREIGN KEY (ticket_id) REFERENCES public.tickets(id) ON DELETE CASCADE;

-- ticket_attachments
ALTER TABLE public.ticket_attachments DROP CONSTRAINT IF EXISTS ticket_attachments_ticket_id_fkey;
ALTER TABLE public.ticket_attachments ADD CONSTRAINT ticket_attachments_ticket_id_fkey
  FOREIGN KEY (ticket_id) REFERENCES public.tickets(id) ON DELETE CASCADE;

ALTER TABLE public.ticket_attachments DROP CONSTRAINT IF EXISTS ticket_attachments_message_id_fkey;
ALTER TABLE public.ticket_attachments ADD CONSTRAINT ticket_attachments_message_id_fkey
  FOREIGN KEY (message_id) REFERENCES public.ticket_messages(id) ON DELETE CASCADE;

-- ticket_status_history
ALTER TABLE public.ticket_status_history DROP CONSTRAINT IF EXISTS ticket_status_history_ticket_id_fkey;
ALTER TABLE public.ticket_status_history ADD CONSTRAINT ticket_status_history_ticket_id_fkey
  FOREIGN KEY (ticket_id) REFERENCES public.tickets(id) ON DELETE CASCADE;

-- ticket_viewers
ALTER TABLE public.ticket_viewers DROP CONSTRAINT IF EXISTS ticket_viewers_ticket_id_fkey;
ALTER TABLE public.ticket_viewers ADD CONSTRAINT ticket_viewers_ticket_id_fkey
  FOREIGN KEY (ticket_id) REFERENCES public.tickets(id) ON DELETE CASCADE;

-- notifications referencing tickets
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_ticket_id_fkey;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_ticket_id_fkey
  FOREIGN KEY (ticket_id) REFERENCES public.tickets(id) ON DELETE CASCADE;

-- satisfaction_surveys referencing tickets
ALTER TABLE public.satisfaction_surveys DROP CONSTRAINT IF EXISTS satisfaction_surveys_ticket_id_fkey;
ALTER TABLE public.satisfaction_surveys ADD CONSTRAINT satisfaction_surveys_ticket_id_fkey
  FOREIGN KEY (ticket_id) REFERENCES public.tickets(id) ON DELETE CASCADE;
