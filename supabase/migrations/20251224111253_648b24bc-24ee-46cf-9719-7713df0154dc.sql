-- Add is_active column to profiles for user inactivation
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Create index for filtering active users
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON public.profiles(is_active);