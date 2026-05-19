CREATE TABLE IF NOT EXISTS public.regions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view regions" ON public.regions FOR SELECT USING (true);
CREATE POLICY "Admins manage regions" ON public.regions FOR ALL USING (is_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.districts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id uuid NOT NULL REFERENCES public.regions(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (region_id, name)
);
CREATE INDEX IF NOT EXISTS idx_districts_region ON public.districts(region_id);
ALTER TABLE public.districts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view districts" ON public.districts FOR SELECT USING (true);
CREATE POLICY "Admins manage districts" ON public.districts FOR ALL USING (is_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.health_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  district_id uuid NOT NULL REFERENCES public.districts(id) ON DELETE CASCADE,
  name text NOT NULL,
  service_type text NOT NULL DEFAULT 'public' CHECK (service_type IN ('public','private')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (district_id, name)
);
CREATE INDEX IF NOT EXISTS idx_health_services_district ON public.health_services(district_id);
CREATE INDEX IF NOT EXISTS idx_health_services_type ON public.health_services(service_type);
ALTER TABLE public.health_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view health services" ON public.health_services FOR SELECT USING (true);
CREATE POLICY "Admins manage health services" ON public.health_services FOR ALL USING (is_admin(auth.uid()));

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS region_id uuid REFERENCES public.regions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS district_id uuid REFERENCES public.districts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS health_service_id uuid REFERENCES public.health_services(id) ON DELETE SET NULL;