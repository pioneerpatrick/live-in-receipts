-- Add percent_paid column to clients table
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS percent_paid numeric DEFAULT 0;

-- Create a function to auto-calculate percent_paid when total_paid or total_price changes
CREATE OR REPLACE FUNCTION public.calculate_percent_paid()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.total_price > 0 THEN
    NEW.percent_paid = ROUND((NEW.total_paid / NEW.total_price) * 100, 2);
  ELSE
    NEW.percent_paid = 0;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger to auto-calculate percent_paid on insert/update
DROP TRIGGER IF EXISTS calculate_percent_paid_trigger ON public.clients;
CREATE TRIGGER calculate_percent_paid_trigger
BEFORE INSERT OR UPDATE ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.calculate_percent_paid();