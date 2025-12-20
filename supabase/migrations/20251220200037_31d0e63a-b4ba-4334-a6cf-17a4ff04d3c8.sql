-- Fix security definer view by recreating without security definer
DROP VIEW IF EXISTS public.user_performance_stats;

CREATE VIEW public.user_performance_stats AS
SELECT 
  p.id as user_id,
  p.full_name,
  p.avatar_url,
  p.department_id,
  COALESCE(AVG(ss.rating), 0) as avg_rating,
  COUNT(DISTINCT ss.id) as total_surveys,
  COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'resolved') as resolved_tickets,
  COUNT(DISTINCT t.id) as total_tickets
FROM public.profiles p
LEFT JOIN public.tickets t ON t.assigned_to = p.id OR t.created_by = p.id
LEFT JOIN public.satisfaction_surveys ss ON ss.ticket_id = t.id
GROUP BY p.id, p.full_name, p.avatar_url, p.department_id;

-- Add UPDATE policy for ticket_messages to allow marking as read
CREATE POLICY "Users can update message status" ON public.ticket_messages
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM tickets t 
      WHERE t.id = ticket_messages.ticket_id 
      AND (t.created_by = auth.uid() OR is_admin(auth.uid()))
    )
  );