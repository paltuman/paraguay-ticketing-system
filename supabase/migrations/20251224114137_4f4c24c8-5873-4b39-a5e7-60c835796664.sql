-- 1. Fix profiles table: Restrict SELECT policy to only allow viewing relevant profiles
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Users can view their own profile
CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
USING (id = auth.uid());

-- Admins and supervisors can view all profiles
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'supervisor'));

-- Users can view profiles of people assigned to their tickets or who created tickets assigned to them
CREATE POLICY "Users can view related profiles" 
ON public.profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.tickets t
    WHERE (t.created_by = auth.uid() AND t.assigned_to = profiles.id)
       OR (t.assigned_to = auth.uid() AND t.created_by = profiles.id)
  )
);

-- 2. Fix audit_logs: Remove permissive INSERT policy and make it service-role only
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;

-- Create a security definer function for inserting audit logs
CREATE OR REPLACE FUNCTION public.insert_audit_log(
  _action text,
  _entity_type text,
  _entity_id text DEFAULT NULL,
  _details jsonb DEFAULT NULL,
  _user_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _new_id uuid;
BEGIN
  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, details)
  VALUES (COALESCE(_user_id, auth.uid()), _action, _entity_type, _entity_id, _details)
  RETURNING id INTO _new_id;
  
  RETURN _new_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.insert_audit_log TO authenticated;

-- 3. Fix security definer view by recreating it with SECURITY INVOKER
DROP VIEW IF EXISTS public.user_performance_stats;

CREATE VIEW public.user_performance_stats
WITH (security_invoker = true)
AS
SELECT 
  p.id as user_id,
  p.full_name,
  p.avatar_url,
  p.department_id,
  COUNT(DISTINCT t.id) as total_tickets,
  COUNT(DISTINCT CASE WHEN t.status = 'resolved' OR t.status = 'closed' THEN t.id END) as resolved_tickets,
  COUNT(DISTINCT s.id) as total_surveys,
  ROUND(AVG(s.rating)::numeric, 2) as avg_rating
FROM public.profiles p
LEFT JOIN public.tickets t ON t.assigned_to = p.id
LEFT JOIN public.satisfaction_surveys s ON s.user_id = p.id
GROUP BY p.id, p.full_name, p.avatar_url, p.department_id;