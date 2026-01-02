-- 1. Corregir duplicación de notificaciones - Reemplazar funciones con lógica mejorada
DROP FUNCTION IF EXISTS notify_admins_new_ticket() CASCADE;
DROP FUNCTION IF EXISTS notify_on_new_message() CASCADE;

-- Función mejorada para notificar sobre nuevos tickets (sin duplicados)
CREATE OR REPLACE FUNCTION notify_admins_new_ticket()
RETURNS TRIGGER AS $$
DECLARE
  admin_record RECORD;
  ticket_creator_name TEXT;
BEGIN
  -- Get the ticket creator's name
  SELECT full_name INTO ticket_creator_name
  FROM profiles WHERE id = NEW.created_by;

  -- If ticket is auto-assigned, notify only the assigned admin
  IF NEW.assigned_to IS NOT NULL THEN
    -- Only notify assigned admin (not the creator if they're the same)
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
    -- Notify all admins except the creator
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Función mejorada para notificar sobre nuevos mensajes (sin duplicados)
CREATE OR REPLACE FUNCTION notify_on_new_message()
RETURNS TRIGGER AS $$
DECLARE
  ticket_record RECORD;
  sender_name TEXT;
  is_sender_admin BOOLEAN;
BEGIN
  -- Skip system messages
  IF NEW.is_system_message = true THEN
    RETURN NEW;
  END IF;

  -- Get ticket info
  SELECT id, ticket_number, title, created_by, assigned_to 
  INTO ticket_record
  FROM tickets WHERE id = NEW.ticket_id;

  -- Get sender name
  SELECT full_name INTO sender_name
  FROM profiles WHERE id = NEW.sender_id;

  -- Check if sender is an admin
  SELECT EXISTS(
    SELECT 1 FROM user_roles 
    WHERE user_id = NEW.sender_id 
    AND role IN ('admin', 'superadmin', 'supervisor')
  ) INTO is_sender_admin;

  -- Route notification appropriately (only one notification per message)
  IF is_sender_admin THEN
    -- Admin sent message, notify ticket creator only
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
    -- User sent message, notify assigned admin only
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recrear triggers
CREATE TRIGGER trigger_notify_admins_new_ticket
AFTER INSERT ON tickets
FOR EACH ROW
EXECUTE FUNCTION notify_admins_new_ticket();

CREATE TRIGGER trigger_notify_on_new_message
AFTER INSERT ON ticket_messages
FOR EACH ROW
EXECUTE FUNCTION notify_on_new_message();

-- 2. Agregar constraint único para encuestas por ticket y usuario (una sola encuesta por ticket por usuario)
ALTER TABLE satisfaction_surveys 
ADD CONSTRAINT unique_survey_per_ticket_user UNIQUE (ticket_id, user_id);

-- 3. Corregir RLS de ticket_viewers para permitir INSERT sin errores
DROP POLICY IF EXISTS "Users can manage their viewer status" ON ticket_viewers;

CREATE POLICY "Users can insert viewer status" ON ticket_viewers
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own viewer status" ON ticket_viewers
FOR UPDATE TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can delete own viewer status" ON ticket_viewers
FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- 4. Función para limpiar contador de tickets cuando se borran todos
CREATE OR REPLACE FUNCTION reset_ticket_sequence_if_empty()
RETURNS TRIGGER AS $$
DECLARE
  remaining_tickets INTEGER;
BEGIN
  SELECT COUNT(*) INTO remaining_tickets FROM tickets;
  
  IF remaining_tickets = 0 THEN
    -- Reset the sequence to start from 1
    ALTER SEQUENCE tickets_ticket_number_seq RESTART WITH 1;
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger para reiniciar contador cuando se borran tickets
DROP TRIGGER IF EXISTS trigger_reset_ticket_sequence ON tickets;
CREATE TRIGGER trigger_reset_ticket_sequence
AFTER DELETE ON tickets
FOR EACH STATEMENT
EXECUTE FUNCTION reset_ticket_sequence_if_empty();