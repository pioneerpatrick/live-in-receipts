-- This migration resets the password for technopanaly@gmail.com to Kareem@2025
-- Note: This requires the supabase admin API which we'll use in the next step

-- For now, let's ensure the user's profile is properly set up
UPDATE public.profiles 
SET full_name = 'PATRICK KIMANTHI'
WHERE user_id = 'f6d27202-3e83-4c9a-af91-34a09a2635e2';

-- Ensure the user has admin role
UPDATE public.user_roles 
SET role = 'admin'
WHERE user_id = 'f6d27202-3e83-4c9a-af91-34a09a2635e2';