
-- 1. Añadir nuevos valores al enum app_role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'end_user';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'level_1_support';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'level_2_support';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'level_3_support';

-- 2. Añadir columna support_level a tickets
ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS support_level smallint NOT NULL DEFAULT 1
  CHECK (support_level BETWEEN 1 AND 3);

CREATE INDEX IF NOT EXISTS idx_tickets_support_level ON public.tickets(support_level);
