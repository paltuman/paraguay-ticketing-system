
-- Función: set support_level basado en prioridad
CREATE OR REPLACE FUNCTION public.set_ticket_support_level()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.support_level IS NULL OR TG_OP = 'INSERT' THEN
    NEW.support_level := CASE NEW.priority
      WHEN 'urgent' THEN 3
      WHEN 'high' THEN 2
      ELSE 1
    END;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_ticket_support_level ON public.tickets;
CREATE TRIGGER trg_set_ticket_support_level
  BEFORE INSERT OR UPDATE OF priority ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.set_ticket_support_level();

-- Función: auto-asignar al agente del nivel con menos carga
CREATE OR REPLACE FUNCTION public.auto_assign_ticket_by_level()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_role app_role;
  best_agent uuid;
BEGIN
  IF NEW.assigned_to IS NOT NULL THEN
    RETURN NEW;
  END IF;

  target_role := CASE NEW.support_level
    WHEN 3 THEN 'level_3_support'::app_role
    WHEN 2 THEN 'level_2_support'::app_role
    ELSE 'level_1_support'::app_role
  END;

  -- Buscar agente del nivel con menos tickets abiertos
  SELECT ur.user_id INTO best_agent
  FROM public.user_roles ur
  JOIN public.profiles p ON p.id = ur.user_id
  WHERE ur.role = target_role
    AND COALESCE(p.is_active, true) = true
    AND ur.user_id <> COALESCE(NEW.created_by, '00000000-0000-0000-0000-000000000000'::uuid)
  ORDER BY (
    SELECT COUNT(*) FROM public.tickets t
    WHERE t.assigned_to = ur.user_id
      AND t.status IN ('open','in_progress')
  ) ASC, random()
  LIMIT 1;

  -- Fallback: administradores
  IF best_agent IS NULL THEN
    SELECT ur.user_id INTO best_agent
    FROM public.user_roles ur
    JOIN public.profiles p ON p.id = ur.user_id
    WHERE ur.role IN ('admin','superadmin')
      AND COALESCE(p.is_active, true) = true
      AND ur.user_id <> COALESCE(NEW.created_by, '00000000-0000-0000-0000-000000000000'::uuid)
    ORDER BY (
      SELECT COUNT(*) FROM public.tickets t
      WHERE t.assigned_to = ur.user_id
        AND t.status IN ('open','in_progress')
    ) ASC, random()
    LIMIT 1;
  END IF;

  NEW.assigned_to := best_agent;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_assign_ticket_by_level ON public.tickets;
CREATE TRIGGER trg_auto_assign_ticket_by_level
  BEFORE INSERT ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.auto_assign_ticket_by_level();
