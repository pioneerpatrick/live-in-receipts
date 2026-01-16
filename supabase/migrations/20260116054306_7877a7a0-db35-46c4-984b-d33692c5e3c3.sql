-- Fix function search_path security issue
CREATE OR REPLACE FUNCTION public.reset_plot_on_client_delete()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.client_id IS NOT NULL AND NEW.client_id IS NULL THEN
    NEW.status := 'available';
    NEW.sold_at := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;