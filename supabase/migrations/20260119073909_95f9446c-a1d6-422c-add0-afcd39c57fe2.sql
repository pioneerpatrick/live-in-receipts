-- Drop the old handle_new_user function and recreate it without super_admins reference
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  
  -- Assign default staff role (admins can upgrade later)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'staff')
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$function$;

-- Also drop the check_super_admin_email function since super_admins table no longer exists
DROP FUNCTION IF EXISTS public.check_super_admin_email() CASCADE;