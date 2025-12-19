-- Add message status and voice note support to ticket_messages
ALTER TABLE public.ticket_messages 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read')),
ADD COLUMN IF NOT EXISTS voice_note_url TEXT;

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
  ticket_id UUID REFERENCES public.tickets(id) ON DELETE CASCADE,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications" 
ON public.notifications 
FOR SELECT 
USING (user_id = auth.uid());

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications" 
ON public.notifications 
FOR UPDATE 
USING (user_id = auth.uid());

-- System can insert notifications for any user
CREATE POLICY "System can insert notifications" 
ON public.notifications 
FOR INSERT 
WITH CHECK (true);

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications" 
ON public.notifications 
FOR DELETE 
USING (user_id = auth.uid());

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Create storage bucket for avatars if not exists
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for voice notes
INSERT INTO storage.buckets (id, name, public) 
VALUES ('voice-notes', 'voice-notes', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for avatars
CREATE POLICY "Avatar images are publicly accessible" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatar" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own avatar" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for voice notes
CREATE POLICY "Users can view voice notes in their tickets" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'voice-notes');

CREATE POLICY "Users can upload voice notes" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'voice-notes' AND auth.uid() IS NOT NULL);

-- Create ticket_viewers table for presence tracking
CREATE TABLE IF NOT EXISTS public.ticket_viewers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  last_seen TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(ticket_id, user_id)
);

-- Enable RLS on ticket_viewers
ALTER TABLE public.ticket_viewers ENABLE ROW LEVEL SECURITY;

-- Anyone can view who is viewing tickets they have access to
CREATE POLICY "Users can view ticket viewers" 
ON public.ticket_viewers 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM tickets t 
  WHERE t.id = ticket_viewers.ticket_id 
  AND (t.created_by = auth.uid() OR is_admin(auth.uid()) OR has_role(auth.uid(), 'supervisor'::app_role))
));

-- Users can insert/update their own viewer status
CREATE POLICY "Users can manage their viewer status" 
ON public.ticket_viewers 
FOR ALL 
USING (user_id = auth.uid());

-- Enable realtime for ticket_viewers
ALTER PUBLICATION supabase_realtime ADD TABLE public.ticket_viewers;