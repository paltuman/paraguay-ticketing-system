-- =====================================================
-- SISTEMA DE TICKETS - ESQUEMA DE BASE DE DATOS
-- Exportación para pgAdmin4
-- Fecha: 2026-01-21
-- =====================================================

-- =====================================================
-- EXTENSIONES
-- =====================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- TIPOS ENUMERADOS (ENUMS)
-- =====================================================

-- Roles de la aplicación
CREATE TYPE public.app_role AS ENUM (
    'admin',
    'support_user', 
    'supervisor',
    'superadmin'
);

-- Estados de tickets
CREATE TYPE public.ticket_status AS ENUM (
    'open',
    'in_progress',
    'resolved',
    'closed'
);

-- Prioridades de tickets
CREATE TYPE public.ticket_priority AS ENUM (
    'low',
    'medium',
    'high',
    'urgent'
);

-- =====================================================
-- TABLAS
-- =====================================================

-- -----------------------------------------------------
-- Tabla: departments (Departamentos)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.departments IS 'Departamentos de la organización';
COMMENT ON COLUMN public.departments.id IS 'Identificador único del departamento';
COMMENT ON COLUMN public.departments.name IS 'Nombre del departamento';
COMMENT ON COLUMN public.departments.description IS 'Descripción del departamento';
COMMENT ON COLUMN public.departments.created_at IS 'Fecha de creación';

-- -----------------------------------------------------
-- Tabla: profiles (Perfiles de Usuario)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    position TEXT,
    avatar_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.profiles IS 'Perfiles de usuarios del sistema';
COMMENT ON COLUMN public.profiles.id IS 'ID del usuario (referencia a auth.users)';
COMMENT ON COLUMN public.profiles.full_name IS 'Nombre completo del usuario';
COMMENT ON COLUMN public.profiles.email IS 'Correo electrónico';
COMMENT ON COLUMN public.profiles.department_id IS 'Departamento asignado';
COMMENT ON COLUMN public.profiles.position IS 'Cargo o posición';
COMMENT ON COLUMN public.profiles.avatar_url IS 'URL de la imagen de perfil';
COMMENT ON COLUMN public.profiles.is_active IS 'Estado activo/inactivo del usuario';

-- Índices
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_department ON public.profiles(department_id);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON public.profiles(is_active);

-- -----------------------------------------------------
-- Tabla: user_roles (Roles de Usuario)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    role public.app_role NOT NULL DEFAULT 'support_user',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id, role)
);

COMMENT ON TABLE public.user_roles IS 'Roles asignados a los usuarios';
COMMENT ON COLUMN public.user_roles.user_id IS 'ID del usuario';
COMMENT ON COLUMN public.user_roles.role IS 'Rol asignado (admin, support_user, supervisor, superadmin)';

-- Índices
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);

-- -----------------------------------------------------
-- Tabla: tickets (Tickets de Soporte)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_number INTEGER NOT NULL DEFAULT nextval('tickets_ticket_number_seq'),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    status public.ticket_status NOT NULL DEFAULT 'open',
    priority public.ticket_priority NOT NULL DEFAULT 'medium',
    created_by UUID,
    assigned_to UUID,
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    closed_at TIMESTAMP WITH TIME ZONE
);

-- Secuencia para ticket_number
CREATE SEQUENCE IF NOT EXISTS tickets_ticket_number_seq;

COMMENT ON TABLE public.tickets IS 'Tickets de soporte técnico';
COMMENT ON COLUMN public.tickets.ticket_number IS 'Número secuencial del ticket';
COMMENT ON COLUMN public.tickets.title IS 'Título del ticket (5-200 caracteres)';
COMMENT ON COLUMN public.tickets.description IS 'Descripción detallada (20-5000 caracteres)';
COMMENT ON COLUMN public.tickets.status IS 'Estado actual del ticket';
COMMENT ON COLUMN public.tickets.priority IS 'Prioridad del ticket';
COMMENT ON COLUMN public.tickets.created_by IS 'Usuario que creó el ticket';
COMMENT ON COLUMN public.tickets.assigned_to IS 'Usuario asignado para resolver';
COMMENT ON COLUMN public.tickets.resolved_at IS 'Fecha de resolución';
COMMENT ON COLUMN public.tickets.closed_at IS 'Fecha de cierre';

-- Índices
CREATE INDEX IF NOT EXISTS idx_tickets_status ON public.tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_priority ON public.tickets(priority);
CREATE INDEX IF NOT EXISTS idx_tickets_created_by ON public.tickets(created_by);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_to ON public.tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tickets_department ON public.tickets(department_id);
CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON public.tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tickets_ticket_number ON public.tickets(ticket_number);

-- -----------------------------------------------------
-- Tabla: ticket_messages (Mensajes de Ticket)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ticket_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
    sender_id UUID,
    message TEXT NOT NULL,
    is_system_message BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'sent',
    voice_note_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.ticket_messages IS 'Mensajes del chat de tickets';
COMMENT ON COLUMN public.ticket_messages.message IS 'Contenido del mensaje (1-5000 caracteres)';
COMMENT ON COLUMN public.ticket_messages.is_system_message IS 'Indica si es un mensaje generado por el sistema';
COMMENT ON COLUMN public.ticket_messages.status IS 'Estado del mensaje (sent, delivered, read)';
COMMENT ON COLUMN public.ticket_messages.voice_note_url IS 'URL de la nota de voz adjunta';

-- Índices
CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket ON public.ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_sender ON public.ticket_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_created_at ON public.ticket_messages(created_at);

-- -----------------------------------------------------
-- Tabla: ticket_status_history (Historial de Estados)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ticket_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
    old_status public.ticket_status,
    new_status public.ticket_status NOT NULL,
    changed_by UUID,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.ticket_status_history IS 'Historial de cambios de estado de tickets';

-- Índices
CREATE INDEX IF NOT EXISTS idx_ticket_history_ticket ON public.ticket_status_history(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_history_created_at ON public.ticket_status_history(created_at);

-- -----------------------------------------------------
-- Tabla: ticket_attachments (Adjuntos de Ticket)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ticket_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
    message_id UUID REFERENCES public.ticket_messages(id) ON DELETE SET NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    file_type TEXT NOT NULL,
    uploaded_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.ticket_attachments IS 'Archivos adjuntos a tickets';
COMMENT ON COLUMN public.ticket_attachments.file_size IS 'Tamaño del archivo en bytes (máximo 10MB)';

-- Índices
CREATE INDEX IF NOT EXISTS idx_ticket_attachments_ticket ON public.ticket_attachments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_attachments_message ON public.ticket_attachments(message_id);

-- -----------------------------------------------------
-- Tabla: common_issues (Problemas Comunes)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.common_issues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    keywords TEXT[] DEFAULT '{}',
    usage_count INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.common_issues IS 'Catálogo de problemas comunes para sugerencias';

-- Índices
CREATE INDEX IF NOT EXISTS idx_common_issues_department ON public.common_issues(department_id);
CREATE INDEX IF NOT EXISTS idx_common_issues_is_active ON public.common_issues(is_active);
CREATE INDEX IF NOT EXISTS idx_common_issues_usage ON public.common_issues(usage_count DESC);

-- -----------------------------------------------------
-- Tabla: notifications (Notificaciones)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    ticket_id UUID REFERENCES public.tickets(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'info',
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.notifications IS 'Notificaciones para usuarios';

-- Índices
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- -----------------------------------------------------
-- Tabla: satisfaction_surveys (Encuestas de Satisfacción)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.satisfaction_surveys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID REFERENCES public.tickets(id) ON DELETE SET NULL,
    user_id UUID NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.satisfaction_surveys IS 'Encuestas de satisfacción del usuario';
COMMENT ON COLUMN public.satisfaction_surveys.rating IS 'Calificación del 1 al 5';

-- Índices
CREATE INDEX IF NOT EXISTS idx_surveys_ticket ON public.satisfaction_surveys(ticket_id);
CREATE INDEX IF NOT EXISTS idx_surveys_user ON public.satisfaction_surveys(user_id);
CREATE INDEX IF NOT EXISTS idx_surveys_rating ON public.satisfaction_surveys(rating);

-- -----------------------------------------------------
-- Tabla: audit_logs (Logs de Auditoría)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    details JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.audit_logs IS 'Registro de auditoría de acciones del sistema';

-- Índices
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- -----------------------------------------------------
-- Tabla: ticket_viewers (Visualizadores de Ticket)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ticket_viewers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    last_seen TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(ticket_id, user_id)
);

COMMENT ON TABLE public.ticket_viewers IS 'Usuarios actualmente viendo un ticket';

-- Índices
CREATE INDEX IF NOT EXISTS idx_ticket_viewers_ticket ON public.ticket_viewers(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_viewers_last_seen ON public.ticket_viewers(last_seen);

-- -----------------------------------------------------
-- Tabla: rate_limits (Límites de Tasa)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    action TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.rate_limits IS 'Control de límites de tasa para prevenir abuso';

-- Índices
CREATE INDEX IF NOT EXISTS idx_rate_limits_user_action ON public.rate_limits(user_id, action);
CREATE INDEX IF NOT EXISTS idx_rate_limits_created_at ON public.rate_limits(created_at);

-- =====================================================
-- VISTAS
-- =====================================================

-- -----------------------------------------------------
-- Vista: user_performance_stats (Estadísticas de Rendimiento)
-- -----------------------------------------------------
CREATE OR REPLACE VIEW public.user_performance_stats AS
SELECT 
    p.id AS user_id,
    p.department_id,
    p.full_name,
    p.avatar_url,
    COUNT(t.id) AS total_tickets,
    COUNT(CASE WHEN t.status = 'resolved' OR t.status = 'closed' THEN 1 END) AS resolved_tickets,
    COUNT(DISTINCT ss.id) AS total_surveys,
    ROUND(AVG(ss.rating), 2) AS avg_rating
FROM public.profiles p
LEFT JOIN public.tickets t ON t.assigned_to = p.id
LEFT JOIN public.satisfaction_surveys ss ON ss.ticket_id = t.id
GROUP BY p.id, p.department_id, p.full_name, p.avatar_url;

COMMENT ON VIEW public.user_performance_stats IS 'Estadísticas de rendimiento de usuarios/agentes';

-- =====================================================
-- FUNCIONES
-- =====================================================

-- -----------------------------------------------------
-- Función: has_role - Verificar si usuario tiene un rol
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role = _role
    )
$$;

COMMENT ON FUNCTION public.has_role IS 'Verifica si un usuario tiene un rol específico';

-- -----------------------------------------------------
-- Función: is_admin - Verificar si usuario es admin
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public.has_role(_user_id, 'admin') OR public.has_role(_user_id, 'superadmin')
$$;

COMMENT ON FUNCTION public.is_admin IS 'Verifica si un usuario es administrador';

-- -----------------------------------------------------
-- Función: is_superadmin - Verificar si usuario es superadmin
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_superadmin(_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role = 'superadmin'
    )
$$;

COMMENT ON FUNCTION public.is_superadmin IS 'Verifica si un usuario es super administrador';

-- -----------------------------------------------------
-- Función: insert_audit_log - Insertar log de auditoría
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.insert_audit_log(
    _action TEXT,
    _entity_type TEXT,
    _entity_id TEXT DEFAULT NULL,
    _details JSONB DEFAULT NULL,
    _user_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _new_id UUID;
BEGIN
    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, details)
    VALUES (COALESCE(_user_id, auth.uid()), _action, _entity_type, _entity_id, _details)
    RETURNING id INTO _new_id;
    
    RETURN _new_id;
END;
$$;

COMMENT ON FUNCTION public.insert_audit_log IS 'Inserta un registro de auditoría';

-- -----------------------------------------------------
-- Función: check_rate_limit - Verificar límite de tasa
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_rate_limit(
    p_user_id UUID,
    p_action TEXT,
    p_max_count INTEGER,
    p_window_minutes INTEGER
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

COMMENT ON FUNCTION public.check_rate_limit IS 'Verifica si el usuario ha excedido el límite de acciones';

-- -----------------------------------------------------
-- Función: record_rate_limit - Registrar acción para rate limit
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_rate_limit(p_action TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.rate_limits (user_id, action)
    VALUES (auth.uid(), p_action);
    
    -- Limpiar registros antiguos (más de 24 horas)
    DELETE FROM public.rate_limits
    WHERE created_at < now() - INTERVAL '24 hours';
END;
$$;

COMMENT ON FUNCTION public.record_rate_limit IS 'Registra una acción y limpia registros antiguos';

-- -----------------------------------------------------
-- Función: update_updated_at_column - Actualizar timestamp
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.update_updated_at_column IS 'Actualiza automáticamente el campo updated_at';

-- -----------------------------------------------------
-- Función: cleanup_old_audit_logs - Limpiar logs antiguos
-- -----------------------------------------------------
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

COMMENT ON FUNCTION public.cleanup_old_audit_logs IS 'Elimina logs de auditoría con más de 90 días';

-- -----------------------------------------------------
-- Función: reset_ticket_sequence_if_empty
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.reset_ticket_sequence_if_empty()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    remaining_tickets INTEGER;
BEGIN
    SELECT COUNT(*) INTO remaining_tickets FROM tickets;
    
    IF remaining_tickets = 0 THEN
        ALTER SEQUENCE tickets_ticket_number_seq RESTART WITH 1;
    END IF;
    
    RETURN OLD;
END;
$$;

COMMENT ON FUNCTION public.reset_ticket_sequence_if_empty IS 'Reinicia la secuencia de tickets si la tabla está vacía';

-- -----------------------------------------------------
-- Función: enforce_ticket_rate_limit - Límite de creación de tickets
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_ticket_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.check_rate_limit(auth.uid(), 'create_ticket', 10, 60) THEN
        RAISE EXCEPTION 'Rate limit exceeded. Please wait before creating another ticket.';
    END IF;
    
    PERFORM public.record_rate_limit('create_ticket');
    
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.enforce_ticket_rate_limit IS 'Limita la creación de tickets a 10 por hora';

-- -----------------------------------------------------
-- Función: enforce_message_rate_limit - Límite de mensajes
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_message_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.is_system_message = true THEN
        RETURN NEW;
    END IF;

    IF NOT public.check_rate_limit(auth.uid(), 'create_message', 30, 60) THEN
        RAISE EXCEPTION 'Rate limit exceeded. Please wait before sending another message.';
    END IF;
    
    PERFORM public.record_rate_limit('create_message');
    
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.enforce_message_rate_limit IS 'Limita el envío de mensajes a 30 por hora';

-- -----------------------------------------------------
-- Función: audit_ticket_status_change - Auditar cambios de estado
-- -----------------------------------------------------
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

COMMENT ON FUNCTION public.audit_ticket_status_change IS 'Registra cambios de estado en auditoría';

-- -----------------------------------------------------
-- Función: notify_admins_new_ticket - Notificar nuevos tickets
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_admins_new_ticket()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    admin_record RECORD;
    ticket_creator_name TEXT;
BEGIN
    PERFORM set_config('app.inserting_notification', 'true', true);

    SELECT full_name INTO ticket_creator_name
    FROM profiles WHERE id = NEW.created_by;

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

COMMENT ON FUNCTION public.notify_admins_new_ticket IS 'Envía notificaciones cuando se crea un ticket';

-- -----------------------------------------------------
-- Función: notify_on_new_message - Notificar nuevos mensajes
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_on_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    ticket_record RECORD;
    sender_name TEXT;
    is_sender_admin BOOLEAN;
BEGIN
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

COMMENT ON FUNCTION public.notify_on_new_message IS 'Envía notificaciones cuando hay nuevos mensajes';

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger para actualizar updated_at en profiles
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para actualizar updated_at en tickets
CREATE TRIGGER update_tickets_updated_at
    BEFORE UPDATE ON public.tickets
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para actualizar updated_at en common_issues
CREATE TRIGGER update_common_issues_updated_at
    BEFORE UPDATE ON public.common_issues
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para rate limit en tickets
CREATE TRIGGER enforce_ticket_rate_limit_trigger
    BEFORE INSERT ON public.tickets
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_ticket_rate_limit();

-- Trigger para rate limit en mensajes
CREATE TRIGGER enforce_message_rate_limit_trigger
    BEFORE INSERT ON public.ticket_messages
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_message_rate_limit();

-- Trigger para auditar cambios de estado
CREATE TRIGGER audit_ticket_status_trigger
    AFTER UPDATE ON public.tickets
    FOR EACH ROW
    EXECUTE FUNCTION public.audit_ticket_status_change();

-- Trigger para resetear secuencia de tickets
CREATE TRIGGER reset_ticket_sequence_trigger
    AFTER DELETE ON public.tickets
    FOR EACH ROW
    EXECUTE FUNCTION public.reset_ticket_sequence_if_empty();

-- Trigger para notificar nuevos tickets
CREATE TRIGGER notify_new_ticket_trigger
    AFTER INSERT ON public.tickets
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_admins_new_ticket();

-- Trigger para notificar nuevos mensajes
CREATE TRIGGER notify_new_message_trigger
    AFTER INSERT ON public.ticket_messages
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_on_new_message();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.common_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.satisfaction_surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_viewers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------
-- Políticas RLS: departments
-- -----------------------------------------------------
CREATE POLICY "Anyone can view departments" ON public.departments
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage departments" ON public.departments
    FOR ALL USING (is_admin(auth.uid()));

-- -----------------------------------------------------
-- Políticas RLS: profiles
-- -----------------------------------------------------
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (id = auth.uid());

CREATE POLICY "Admins can view all profiles" ON public.profiles
    FOR SELECT USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'supervisor'));

CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Admins can update all profiles" ON public.profiles
    FOR UPDATE USING (is_admin(auth.uid()));

CREATE POLICY "Superadmins can delete profiles" ON public.profiles
    FOR DELETE USING (is_superadmin(auth.uid()));

-- -----------------------------------------------------
-- Políticas RLS: user_roles
-- -----------------------------------------------------
CREATE POLICY "Users can view own roles" ON public.user_roles
    FOR SELECT USING (user_id = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY "Admins can manage roles" ON public.user_roles
    FOR ALL USING (is_admin(auth.uid()));

-- -----------------------------------------------------
-- Políticas RLS: tickets
-- -----------------------------------------------------
CREATE POLICY "Users can create tickets" ON public.tickets
    FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Support users can view own tickets" ON public.tickets
    FOR SELECT USING (
        created_by = auth.uid() OR 
        is_admin(auth.uid()) OR 
        has_role(auth.uid(), 'supervisor')
    );

CREATE POLICY "Admins can update tickets" ON public.tickets
    FOR UPDATE USING (is_admin(auth.uid()) OR created_by = auth.uid());

CREATE POLICY "Admins can delete tickets" ON public.tickets
    FOR DELETE USING (is_admin(auth.uid()));

-- -----------------------------------------------------
-- Políticas RLS: ticket_messages
-- -----------------------------------------------------
CREATE POLICY "Users can view messages of their tickets" ON public.ticket_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM tickets t
            WHERE t.id = ticket_messages.ticket_id
            AND (t.created_by = auth.uid() OR is_admin(auth.uid()))
        )
    );

CREATE POLICY "Users can send messages to their tickets" ON public.ticket_messages
    FOR INSERT WITH CHECK (
        sender_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM tickets t
            WHERE t.id = ticket_messages.ticket_id
            AND (t.created_by = auth.uid() OR is_admin(auth.uid()))
        )
    );

CREATE POLICY "Users can update message status" ON public.ticket_messages
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM tickets t
            WHERE t.id = ticket_messages.ticket_id
            AND (t.created_by = auth.uid() OR is_admin(auth.uid()))
        )
    );

-- -----------------------------------------------------
-- Políticas RLS: ticket_status_history
-- -----------------------------------------------------
CREATE POLICY "Users can view status history of their tickets" ON public.ticket_status_history
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM tickets t
            WHERE t.id = ticket_status_history.ticket_id
            AND (t.created_by = auth.uid() OR is_admin(auth.uid()) OR has_role(auth.uid(), 'supervisor'))
        )
    );

CREATE POLICY "Admins can insert status history" ON public.ticket_status_history
    FOR INSERT WITH CHECK (is_admin(auth.uid()) OR changed_by = auth.uid());

-- -----------------------------------------------------
-- Políticas RLS: ticket_attachments
-- -----------------------------------------------------
CREATE POLICY "Users can view attachments of their tickets" ON public.ticket_attachments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM tickets t
            WHERE t.id = ticket_attachments.ticket_id
            AND (t.created_by = auth.uid() OR is_admin(auth.uid()) OR has_role(auth.uid(), 'supervisor'))
        )
    );

CREATE POLICY "Users can insert attachments to their tickets" ON public.ticket_attachments
    FOR INSERT WITH CHECK (
        uploaded_by = auth.uid() AND
        EXISTS (
            SELECT 1 FROM tickets t
            WHERE t.id = ticket_attachments.ticket_id
            AND (t.created_by = auth.uid() OR is_admin(auth.uid()))
        )
    );

CREATE POLICY "Users can delete their own attachments" ON public.ticket_attachments
    FOR DELETE USING (uploaded_by = auth.uid() OR is_admin(auth.uid()));

-- -----------------------------------------------------
-- Políticas RLS: common_issues
-- -----------------------------------------------------
CREATE POLICY "Authenticated users can view active common issues" ON public.common_issues
    FOR SELECT USING (auth.uid() IS NOT NULL AND (is_active = true OR is_admin(auth.uid())));

CREATE POLICY "Admins can manage common issues" ON public.common_issues
    FOR ALL USING (is_admin(auth.uid()));

-- -----------------------------------------------------
-- Políticas RLS: notifications
-- -----------------------------------------------------
CREATE POLICY "Users can view own notifications" ON public.notifications
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Notifications from authorized sources" ON public.notifications
    FOR INSERT WITH CHECK (is_admin(auth.uid()) OR user_id = auth.uid() OR auth.uid() IS NULL);

CREATE POLICY "Users can update own notifications" ON public.notifications
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own notifications" ON public.notifications
    FOR DELETE USING (user_id = auth.uid());

-- -----------------------------------------------------
-- Políticas RLS: satisfaction_surveys
-- -----------------------------------------------------
CREATE POLICY "Users can view their own surveys" ON public.satisfaction_surveys
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all surveys" ON public.satisfaction_surveys
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_roles.user_id = auth.uid()
            AND role IN ('admin', 'supervisor', 'superadmin')
        )
    );

CREATE POLICY "Users can create their own surveys" ON public.satisfaction_surveys
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can create surveys" ON public.satisfaction_surveys
    FOR INSERT WITH CHECK (is_admin(auth.uid()) OR auth.uid() = user_id);

-- -----------------------------------------------------
-- Políticas RLS: audit_logs
-- -----------------------------------------------------
CREATE POLICY "Admins can view audit logs" ON public.audit_logs
    FOR SELECT USING (is_admin(auth.uid()));

-- -----------------------------------------------------
-- Políticas RLS: ticket_viewers
-- -----------------------------------------------------
CREATE POLICY "Users can view ticket viewers" ON public.ticket_viewers
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM tickets t
            WHERE t.id = ticket_viewers.ticket_id
            AND (t.created_by = auth.uid() OR is_admin(auth.uid()) OR has_role(auth.uid(), 'supervisor'))
        )
    );

CREATE POLICY "Users can insert viewer status" ON public.ticket_viewers
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own viewer status" ON public.ticket_viewers
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own viewer status" ON public.ticket_viewers
    FOR DELETE USING (user_id = auth.uid());

-- -----------------------------------------------------
-- Políticas RLS: rate_limits
-- -----------------------------------------------------
CREATE POLICY "Users can read own rate limits" ON public.rate_limits
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own rate limits" ON public.rate_limits
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- DATOS INICIALES (OPCIONAL)
-- =====================================================

-- Insertar departamentos de ejemplo
-- INSERT INTO public.departments (name, description) VALUES
--     ('Soporte Técnico', 'Departamento de soporte técnico general'),
--     ('Ventas', 'Departamento de ventas y comercial'),
--     ('Recursos Humanos', 'Departamento de recursos humanos'),
--     ('Finanzas', 'Departamento de finanzas y contabilidad');

-- =====================================================
-- NOTAS DE IMPLEMENTACIÓN
-- =====================================================

/*
NOTAS IMPORTANTES:

1. Este script está diseñado para PostgreSQL 14+
2. Las referencias a auth.users y auth.uid() son específicas de Supabase
3. Para usar en pgAdmin4 sin Supabase, reemplazar:
   - auth.uid() por una función personalizada o parámetro de sesión
   - Las referencias a auth.users por una tabla de usuarios local

4. Storage Buckets (configurar en Supabase):
   - avatars (público) - Imágenes de perfil
   - ticket-attachments (privado) - Adjuntos de tickets
   - voice-notes (privado) - Notas de voz

5. Realtime:
   - Habilitar para: ticket_messages, tickets, notifications

6. Edge Functions:
   - send-password-reset: Envío de emails de recuperación

7. Límites configurados:
   - Tickets: 10 por hora por usuario
   - Mensajes: 30 por hora por usuario
   - Retención de logs: 90 días
   - Retención de rate_limits: 24 horas
*/

-- =====================================================
-- FIN DEL SCRIPT
-- =====================================================
