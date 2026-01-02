-- Add input validation constraints for tickets
ALTER TABLE public.tickets 
ADD CONSTRAINT tickets_title_length CHECK (char_length(title) BETWEEN 5 AND 200);

ALTER TABLE public.tickets 
ADD CONSTRAINT tickets_description_length CHECK (char_length(description) BETWEEN 20 AND 5000);

-- Add constraint for ticket_messages
ALTER TABLE public.ticket_messages 
ADD CONSTRAINT messages_content_length CHECK (char_length(message) BETWEEN 1 AND 5000);

-- Create rate limiting table
CREATE TABLE public.rate_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient rate limit lookups
CREATE INDEX idx_rate_limits_lookup ON public.rate_limits (user_id, action, created_at DESC);

-- Enable RLS
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Allow users to insert their own rate limit records
CREATE POLICY "Users can insert own rate limits"
ON public.rate_limits
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow users to read their own rate limits
CREATE POLICY "Users can read own rate limits"
ON public.rate_limits
FOR SELECT
USING (auth.uid() = user_id);

-- Create function to check rate limits
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_user_id UUID,
  p_action TEXT,
  p_max_count INT,
  p_window_minutes INT
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*) < p_max_count
  FROM public.rate_limits
  WHERE user_id = p_user_id
    AND action = p_action
    AND created_at > now() - (p_window_minutes || ' minutes')::INTERVAL;
$$;

-- Create function to record rate limit action
CREATE OR REPLACE FUNCTION public.record_rate_limit(
  p_action TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.rate_limits (user_id, action)
  VALUES (auth.uid(), p_action);
  
  -- Clean up old rate limit records (older than 24 hours)
  DELETE FROM public.rate_limits
  WHERE created_at < now() - INTERVAL '24 hours';
END;
$$;

-- Create trigger function to enforce rate limits on ticket creation
CREATE OR REPLACE FUNCTION public.enforce_ticket_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user has exceeded ticket creation limit (10 per hour)
  IF NOT public.check_rate_limit(auth.uid(), 'create_ticket', 10, 60) THEN
    RAISE EXCEPTION 'Rate limit exceeded. Please wait before creating another ticket.';
  END IF;
  
  -- Record this action
  PERFORM public.record_rate_limit('create_ticket');
  
  RETURN NEW;
END;
$$;

-- Create trigger for ticket rate limiting
CREATE TRIGGER enforce_ticket_rate_limit_trigger
BEFORE INSERT ON public.tickets
FOR EACH ROW
EXECUTE FUNCTION public.enforce_ticket_rate_limit();

-- Create trigger function to enforce rate limits on message creation
CREATE OR REPLACE FUNCTION public.enforce_message_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Skip system messages
  IF NEW.is_system_message = true THEN
    RETURN NEW;
  END IF;

  -- Check if user has exceeded message creation limit (30 per hour)
  IF NOT public.check_rate_limit(auth.uid(), 'create_message', 30, 60) THEN
    RAISE EXCEPTION 'Rate limit exceeded. Please wait before sending another message.';
  END IF;
  
  -- Record this action
  PERFORM public.record_rate_limit('create_message');
  
  RETURN NEW;
END;
$$;

-- Create trigger for message rate limiting
CREATE TRIGGER enforce_message_rate_limit_trigger
BEFORE INSERT ON public.ticket_messages
FOR EACH ROW
EXECUTE FUNCTION public.enforce_message_rate_limit();

-- Add data retention policy for audit_logs (auto-delete after 90 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_audit_logs()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.audit_logs
  WHERE created_at < now() - INTERVAL '90 days';
END;
$$;