ALTER TABLE public.common_issues ADD COLUMN IF NOT EXISTS support_level smallint NOT NULL DEFAULT 1;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS common_issue_id uuid REFERENCES public.common_issues(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.set_ticket_support_level()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  priority_level smallint;
  issue_level smallint := 1;
BEGIN
  priority_level := CASE NEW.priority
    WHEN 'urgent' THEN 3
    WHEN 'high' THEN 2
    ELSE 1
  END;

  IF NEW.common_issue_id IS NOT NULL THEN
    SELECT COALESCE(ci.support_level, 1) INTO issue_level
    FROM public.common_issues ci WHERE ci.id = NEW.common_issue_id;
  END IF;

  NEW.support_level := GREATEST(priority_level, COALESCE(issue_level, 1));
  RETURN NEW;
END;
$function$;