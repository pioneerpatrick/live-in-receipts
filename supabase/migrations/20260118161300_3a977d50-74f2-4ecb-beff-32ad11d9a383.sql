-- Add super admin for Technopanaly
-- First, we'll create a function that can be called after the user signs up
-- or if the user already exists, add them immediately

DO $$
DECLARE
  technopanaly_user_id UUID;
BEGIN
  -- Check if user already exists in auth.users (by looking at profiles or user_roles)
  SELECT user_id INTO technopanaly_user_id 
  FROM public.profiles 
  WHERE full_name ILIKE '%technopanaly%' 
  LIMIT 1;
  
  -- If found, add to super_admins
  IF technopanaly_user_id IS NOT NULL THEN
    INSERT INTO public.super_admins (user_id)
    VALUES (technopanaly_user_id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
END $$;

-- Create a trigger to automatically add user to super_admins when they sign up with technopanaly email
CREATE OR REPLACE FUNCTION public.check_super_admin_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Check if the new user's email matches super admin emails
  IF NEW.email = 'technopanaly@gmail.com' THEN
    INSERT INTO public.super_admins (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Also create admin role for this user
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on profiles (since that's created on user signup)
DROP TRIGGER IF EXISTS auto_super_admin_on_signup ON public.profiles;
CREATE TRIGGER auto_super_admin_on_signup
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.check_super_admin_email();

-- Also update the handle_new_user function to check for super admin email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  
  -- Check if this is the super admin email
  IF NEW.email = 'technopanaly@gmail.com' THEN
    -- Add to super_admins
    INSERT INTO public.super_admins (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Assign admin role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT DO NOTHING;
  ELSE
    -- Assign default staff role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'staff')
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;