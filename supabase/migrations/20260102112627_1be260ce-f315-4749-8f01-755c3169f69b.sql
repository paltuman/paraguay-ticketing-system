-- =====================================================
-- FIX 1: user_performance_stats - Add RLS (it's a view, needs SECURITY INVOKER)
-- =====================================================
-- The view already exists with SECURITY INVOKER, just need to ensure proper access

-- =====================================================
-- FIX 2: notifications - Restrict INSERT to service role only via triggers
-- =====================================================
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;

-- Create a more restrictive policy - notifications only via database triggers/functions
CREATE POLICY "Service functions can insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (
  -- Only allow inserts from database triggers/functions (not direct user calls)
  -- This works because triggers run with SECURITY DEFINER context
  current_setting('role', true) = 'service_role'
  OR
  -- Or via authenticated triggers that set a specific flag
  current_setting('app.inserting_notification', true) = 'true'
);

-- =====================================================
-- FIX 3: departments - Restrict to authenticated users only
-- =====================================================
DROP POLICY IF EXISTS "Anyone can view departments" ON public.departments;

CREATE POLICY "Authenticated users can view departments"
ON public.departments
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- =====================================================
-- FIX 4: common_issues - Restrict to authenticated users only
-- =====================================================
DROP POLICY IF EXISTS "Anyone can view active common issues" ON public.common_issues;

CREATE POLICY "Authenticated users can view active common issues"
ON public.common_issues
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND (is_active = true OR is_admin(auth.uid()))
);

-- =====================================================
-- FIX 5: satisfaction_surveys - Restrict survey viewing
-- =====================================================
DROP POLICY IF EXISTS "Admins can view surveys by ticket" ON public.satisfaction_surveys;

-- More restrictive: only admins/supervisors and survey owners can view
CREATE POLICY "Authorized users can view surveys by ticket"
ON public.satisfaction_surveys
FOR SELECT
USING (
  -- User's own survey
  auth.uid() = user_id
  OR
  -- Admins and supervisors only
  is_admin(auth.uid())
  OR
  has_role(auth.uid(), 'supervisor')
);

-- =====================================================
-- FIX 6: Update notify functions to set app context
-- =====================================================
CREATE OR REPLACE FUNCTION public.notify_admins_new_ticket()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_record RECORD;
  ticket_creator_name TEXT;
BEGIN
  -- Set context to allow notification inserts
  PERFORM set_config('app.inserting_notification', 'true', true);

  -- Get the ticket creator's name
  SELECT full_name INTO ticket_creator_name
  FROM profiles WHERE id = NEW.created_by;

  -- If ticket is auto-assigned, notify only the assigned admin
  IF NEW.assigned_to IS NOT NULL THEN
    IF NEW.assigned_to != NEW.created_by THEN
      INSERT INTO notifications (user_id, title, message, type, ticket_id)
      VALUES (
        NEW.assigned_to,
        'Nuevo ticket asignado #' || NEW.ticket_number,
        'Se te ha asignado: ' || NEW.title,
        'ticket',
        NEW.id
      );
    END IF;
  ELSE
    FOR admin_record IN 
      SELECT DISTINCT ur.user_id 
      FROM user_roles ur
      WHERE ur.role IN ('admin', 'superadmin')
      AND ur.user_id != COALESCE(NEW.created_by, '00000000-0000-0000-0000-000000000000'::uuid)
    LOOP
      INSERT INTO notifications (user_id, title, message, type, ticket_id)
      VALUES (
        admin_record.user_id,
        'Nuevo ticket #' || NEW.ticket_number,
        COALESCE(ticket_creator_name, 'Usuario') || ' creó: ' || NEW.title,
        'ticket',
        NEW.id
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_on_new_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ticket_record RECORD;
  sender_name TEXT;
  is_sender_admin BOOLEAN;
BEGIN
  -- Set context to allow notification inserts
  PERFORM set_config('app.inserting_notification', 'true', true);

  IF NEW.is_system_message = true THEN
    RETURN NEW;
  END IF;

  SELECT id, ticket_number, title, created_by, assigned_to 
  INTO ticket_record
  FROM tickets WHERE id = NEW.ticket_id;

  SELECT full_name INTO sender_name
  FROM profiles WHERE id = NEW.sender_id;

  SELECT EXISTS(
    SELECT 1 FROM user_roles 
    WHERE user_id = NEW.sender_id 
    AND role IN ('admin', 'superadmin', 'supervisor')
  ) INTO is_sender_admin;

  IF is_sender_admin THEN
    IF ticket_record.created_by IS NOT NULL AND ticket_record.created_by != NEW.sender_id THEN
      INSERT INTO notifications (user_id, title, message, type, ticket_id)
      VALUES (
        ticket_record.created_by,
        'Respuesta en ticket #' || ticket_record.ticket_number,
        COALESCE(sender_name, 'Soporte') || ': ' || LEFT(NEW.message, 100),
        'message',
        NEW.ticket_id
      );
    END IF;
  ELSE
    IF ticket_record.assigned_to IS NOT NULL AND ticket_record.assigned_to != NEW.sender_id THEN
      INSERT INTO notifications (user_id, title, message, type, ticket_id)
      VALUES (
        ticket_record.assigned_to,
        'Mensaje en ticket #' || ticket_record.ticket_number,
        COALESCE(sender_name, 'Usuario') || ': ' || LEFT(NEW.message, 100),
        'message',
        NEW.ticket_id
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;