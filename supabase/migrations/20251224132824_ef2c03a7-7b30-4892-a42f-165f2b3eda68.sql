-- 1. Trigger automático para auditar cambios de estado en tickets
CREATE OR REPLACE FUNCTION public.audit_ticket_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM public.insert_audit_log(
      'ticket_status_changed',
      'ticket',
      NEW.id::text,
      jsonb_build_object(
        'ticket_number', NEW.ticket_number,
        'old_status', OLD.status,
        'new_status', NEW.status,
        'title', NEW.title
      ),
      auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_ticket_status_change ON public.tickets;
CREATE TRIGGER on_ticket_status_change
  AFTER UPDATE ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_ticket_status_change();

-- 2. Trigger para notificar a admins cuando se crean nuevos tickets
CREATE OR REPLACE FUNCTION public.notify_admins_new_ticket()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_id uuid;
BEGIN
  -- Notificar a todos los admins
  FOR admin_id IN 
    SELECT user_id FROM public.user_roles WHERE role = 'admin'
  LOOP
    IF admin_id <> NEW.created_by THEN
      INSERT INTO public.notifications (user_id, title, message, type, ticket_id)
      VALUES (
        admin_id,
        'Nuevo Ticket #' || NEW.ticket_number,
        'Se ha creado un nuevo ticket: ' || NEW.title,
        'info',
        NEW.id
      );
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_new_ticket_notify_admins ON public.tickets;
CREATE TRIGGER on_new_ticket_notify_admins
  AFTER INSERT ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admins_new_ticket();

-- 3. Permitir a los admins crear encuestas de satisfacción para cualquier ticket
DROP POLICY IF EXISTS "Admins can create surveys" ON public.satisfaction_surveys;
CREATE POLICY "Admins can create surveys"
ON public.satisfaction_surveys
FOR INSERT
WITH CHECK (
  is_admin(auth.uid()) OR auth.uid() = user_id
);

-- 4. Permitir ver encuestas por ticket_id para admins
DROP POLICY IF EXISTS "Admins can view surveys by ticket" ON public.satisfaction_surveys;
CREATE POLICY "Admins can view surveys by ticket"
ON public.satisfaction_surveys
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tickets t 
    WHERE t.id = satisfaction_surveys.ticket_id 
    AND (t.assigned_to = auth.uid() OR is_admin(auth.uid()))
  )
);