-- Fix: Drop the security definer view and use a safer approach
DROP VIEW IF EXISTS public.employees_safe;

-- The employees table now only has the admin policy (Staff can view employees was dropped)
-- This is the secure configuration - only admins can access sensitive employee data
-- Staff do not need direct access to employee records in this business application