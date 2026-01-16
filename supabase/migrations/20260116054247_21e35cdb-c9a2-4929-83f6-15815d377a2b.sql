-- Add CASCADE DELETE to payments table
ALTER TABLE public.payments 
DROP CONSTRAINT IF EXISTS payments_client_id_fkey;

ALTER TABLE public.payments
ADD CONSTRAINT payments_client_id_fkey 
FOREIGN KEY (client_id) 
REFERENCES public.clients(id) 
ON DELETE CASCADE;

-- Add CASCADE DELETE to cancelled_sales table (for client_id)
ALTER TABLE public.cancelled_sales 
DROP CONSTRAINT IF EXISTS cancelled_sales_client_id_fkey;

ALTER TABLE public.cancelled_sales
ADD CONSTRAINT cancelled_sales_client_id_fkey 
FOREIGN KEY (client_id) 
REFERENCES public.clients(id) 
ON DELETE CASCADE;

-- Add CASCADE DELETE to cancelled_sales table (for transferred_to_client_id) - SET NULL instead of CASCADE
ALTER TABLE public.cancelled_sales 
DROP CONSTRAINT IF EXISTS cancelled_sales_transferred_to_client_id_fkey;

ALTER TABLE public.cancelled_sales
ADD CONSTRAINT cancelled_sales_transferred_to_client_id_fkey 
FOREIGN KEY (transferred_to_client_id) 
REFERENCES public.clients(id) 
ON DELETE SET NULL;

-- Add CASCADE DELETE to expenses table
ALTER TABLE public.expenses 
DROP CONSTRAINT IF EXISTS expenses_client_id_fkey;

ALTER TABLE public.expenses
ADD CONSTRAINT expenses_client_id_fkey 
FOREIGN KEY (client_id) 
REFERENCES public.clients(id) 
ON DELETE CASCADE;

-- Add SET NULL to plots table (return plot to available when client deleted)
ALTER TABLE public.plots 
DROP CONSTRAINT IF EXISTS plots_client_id_fkey;

ALTER TABLE public.plots
ADD CONSTRAINT plots_client_id_fkey 
FOREIGN KEY (client_id) 
REFERENCES public.clients(id) 
ON DELETE SET NULL;

-- Create trigger to reset plot status when client_id is set to NULL
CREATE OR REPLACE FUNCTION public.reset_plot_on_client_delete()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.client_id IS NOT NULL AND NEW.client_id IS NULL THEN
    NEW.status := 'available';
    NEW.sold_at := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_reset_plot_on_client_delete ON public.plots;

CREATE TRIGGER trigger_reset_plot_on_client_delete
BEFORE UPDATE ON public.plots
FOR EACH ROW
EXECUTE FUNCTION public.reset_plot_on_client_delete();