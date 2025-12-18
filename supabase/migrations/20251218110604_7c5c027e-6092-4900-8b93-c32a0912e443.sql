-- Create ticket_attachments table FIRST
CREATE TABLE public.ticket_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  message_id UUID REFERENCES public.ticket_messages(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_type TEXT NOT NULL,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on ticket_attachments
ALTER TABLE public.ticket_attachments ENABLE ROW LEVEL SECURITY;

-- RLS policies for ticket_attachments
CREATE POLICY "Users can view attachments of their tickets"
ON public.ticket_attachments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tickets t
    WHERE t.id = ticket_attachments.ticket_id
    AND (t.created_by = auth.uid() OR public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'supervisor'))
  )
);

CREATE POLICY "Users can insert attachments to their tickets"
ON public.ticket_attachments FOR INSERT
WITH CHECK (
  uploaded_by = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.tickets t
    WHERE t.id = ticket_attachments.ticket_id
    AND (t.created_by = auth.uid() OR public.is_admin(auth.uid()))
  )
);

CREATE POLICY "Users can delete their own attachments"
ON public.ticket_attachments FOR DELETE
USING (
  uploaded_by = auth.uid() OR public.is_admin(auth.uid())
);

-- Create common_issues table
CREATE TABLE public.common_issues (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  keywords TEXT[] DEFAULT '{}',
  usage_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on common_issues
ALTER TABLE public.common_issues ENABLE ROW LEVEL SECURITY;

-- RLS policies for common_issues
CREATE POLICY "Anyone can view active common issues"
ON public.common_issues FOR SELECT
USING (is_active = true OR public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage common issues"
ON public.common_issues FOR ALL
USING (public.is_admin(auth.uid()));

-- Trigger for updated_at on common_issues
CREATE TRIGGER update_common_issues_updated_at
BEFORE UPDATE ON public.common_issues
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes for better performance
CREATE INDEX idx_ticket_attachments_ticket_id ON public.ticket_attachments(ticket_id);
CREATE INDEX idx_ticket_attachments_message_id ON public.ticket_attachments(message_id);
CREATE INDEX idx_common_issues_department_id ON public.common_issues(department_id);
CREATE INDEX idx_common_issues_usage_count ON public.common_issues(usage_count DESC);

-- Now create storage bucket for ticket attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('ticket-attachments', 'ticket-attachments', false, 5242880);

-- Storage policies for ticket-attachments bucket
CREATE POLICY "Users can view attachments of their tickets storage"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'ticket-attachments' AND
  (
    EXISTS (
      SELECT 1 FROM public.ticket_attachments ta
      JOIN public.tickets t ON t.id = ta.ticket_id
      WHERE ta.file_path = name
      AND (t.created_by = auth.uid() OR public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'supervisor'))
    )
  )
);

CREATE POLICY "Users can upload attachments storage"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'ticket-attachments' AND
  auth.uid() IS NOT NULL
);

CREATE POLICY "Users can delete their own attachments storage"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'ticket-attachments' AND
  (
    EXISTS (
      SELECT 1 FROM public.ticket_attachments ta
      WHERE ta.file_path = name
      AND ta.uploaded_by = auth.uid()
    )
    OR public.is_admin(auth.uid())
  )
);