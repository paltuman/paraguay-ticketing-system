-- Drop existing constraints if they exist (pointing to auth.users)
ALTER TABLE public.tickets DROP CONSTRAINT IF EXISTS tickets_created_by_fkey;
ALTER TABLE public.tickets DROP CONSTRAINT IF EXISTS tickets_assigned_to_fkey;
ALTER TABLE public.ticket_messages DROP CONSTRAINT IF EXISTS ticket_messages_sender_id_fkey;
ALTER TABLE public.ticket_status_history DROP CONSTRAINT IF EXISTS ticket_status_history_changed_by_fkey;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_department_id_fkey;

-- Recreate foreign key constraints pointing to profiles table
ALTER TABLE public.tickets
ADD CONSTRAINT tickets_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.tickets
ADD CONSTRAINT tickets_assigned_to_fkey 
FOREIGN KEY (assigned_to) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.ticket_messages
ADD CONSTRAINT ticket_messages_sender_id_fkey 
FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.ticket_status_history
ADD CONSTRAINT ticket_status_history_changed_by_fkey 
FOREIGN KEY (changed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_department_id_fkey 
FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE SET NULL;