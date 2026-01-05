-- Create function to clean up orphaned plots
CREATE OR REPLACE FUNCTION public.cleanup_orphaned_plots()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cleaned_count INTEGER;
BEGIN
  UPDATE plots 
  SET status = 'available', sold_at = NULL 
  WHERE status IN ('sold', 'reserved') AND client_id IS NULL;
  
  GET DIAGNOSTICS cleaned_count = ROW_COUNT;
  
  RETURN cleaned_count;
END;
$$;