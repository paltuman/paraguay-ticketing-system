-- Create satisfaction surveys table
CREATE TABLE public.satisfaction_surveys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID REFERENCES public.tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.satisfaction_surveys ENABLE ROW LEVEL SECURITY;

-- Policies for satisfaction surveys
CREATE POLICY "Users can create their own surveys" ON public.satisfaction_surveys
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own surveys" ON public.satisfaction_surveys
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all surveys" ON public.satisfaction_surveys
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor', 'superadmin'))
  );

-- Create user stats view for leaderboard
CREATE OR REPLACE VIEW public.user_performance_stats AS
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

-- Add unique constraint to ticket_viewers
ALTER TABLE public.ticket_viewers 
ADD CONSTRAINT ticket_viewers_unique UNIQUE (ticket_id, user_id);

-- Enable realtime for satisfaction_surveys
ALTER PUBLICATION supabase_realtime ADD TABLE public.satisfaction_surveys;