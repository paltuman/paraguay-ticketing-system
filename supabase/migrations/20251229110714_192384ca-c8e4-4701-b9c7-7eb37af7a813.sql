-- Create trigger function for notifying admins on new tickets
CREATE OR REPLACE FUNCTION public.notify_admins_new_ticket()
RETURNS TRIGGER AS $$
DECLARE
  admin_user RECORD;
BEGIN
  -- Get all admin users (admin and superadmin)
  FOR admin_user IN 
    SELECT DISTINCT ur.user_id 
    FROM public.user_roles ur 
    WHERE ur.role IN ('admin', 'superadmin')
    AND ur.user_id != NEW.created_by  -- Exclude ticket creator
  LOOP
    -- Insert notification for each admin
    INSERT INTO public.notifications (user_id, title, message, type, ticket_id)
    VALUES (
      admin_user.user_id,
      'Nuevo Ticket Registrado',
      'Se ha registrado un nuevo ticket: ' || NEW.title,
      'ticket',
      NEW.id
    );
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on tickets table for new ticket notifications
DROP TRIGGER IF EXISTS trigger_notify_admins_new_ticket ON public.tickets;
CREATE TRIGGER trigger_notify_admins_new_ticket
  AFTER INSERT ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admins_new_ticket();

-- Create trigger function for notifying on new messages
CREATE OR REPLACE FUNCTION public.notify_on_new_message()
RETURNS TRIGGER AS $$
DECLARE
  ticket_record RECORD;
  admin_user RECORD;
  notification_user_id UUID;
BEGIN
  -- Skip system messages
  IF NEW.is_system_message = true THEN
    RETURN NEW;
  END IF;

  -- Get ticket details
  SELECT * INTO ticket_record FROM public.tickets WHERE id = NEW.ticket_id;
  
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- Notify admins if the message is from the ticket creator
  IF NEW.sender_id = ticket_record.created_by THEN
    -- Notify all admins except the sender
    FOR admin_user IN 
      SELECT DISTINCT ur.user_id 
      FROM public.user_roles ur 
      WHERE ur.role IN ('admin', 'superadmin')
      AND ur.user_id != NEW.sender_id
    LOOP
      INSERT INTO public.notifications (user_id, title, message, type, ticket_id)
      VALUES (
        admin_user.user_id,
        'Nuevo Mensaje en Ticket',
        'Hay un nuevo mensaje en el ticket: ' || ticket_record.title,
        'message',
        NEW.ticket_id
      );
    END LOOP;
  ELSE
    -- If message is from admin, notify ticket creator
    IF ticket_record.created_by IS NOT NULL AND ticket_record.created_by != NEW.sender_id THEN
      INSERT INTO public.notifications (user_id, title, message, type, ticket_id)
      VALUES (
        ticket_record.created_by,
        'Nueva Respuesta en tu Ticket',
        'Has recibido una respuesta en el ticket: ' || ticket_record.title,
        'message',
        NEW.ticket_id
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on ticket_messages table for new message notifications
DROP TRIGGER IF EXISTS trigger_notify_on_new_message ON public.ticket_messages;
CREATE TRIGGER trigger_notify_on_new_message
  AFTER INSERT ON public.ticket_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_new_message();