-- Create cancelled_sales table to track cancelled/returned sales
CREATE TABLE public.cancelled_sales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  client_name TEXT NOT NULL,
  client_phone TEXT,
  project_name TEXT NOT NULL,
  plot_number TEXT NOT NULL,
  original_sale_date DATE,
  cancellation_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  total_price NUMERIC NOT NULL DEFAULT 0,
  total_paid NUMERIC NOT NULL DEFAULT 0,
  refund_amount NUMERIC NOT NULL DEFAULT 0,
  refund_status TEXT NOT NULL DEFAULT 'pending', -- pending, partial, completed, none
  cancellation_fee NUMERIC NOT NULL DEFAULT 0,
  net_refund NUMERIC NOT NULL DEFAULT 0, -- refund_amount - cancellation_fee
  cancellation_reason TEXT,
  notes TEXT,
  cancelled_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cancelled_sales ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage cancelled sales"
ON public.cancelled_sales
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff can view cancelled sales"
ON public.cancelled_sales
FOR SELECT
USING (has_role(auth.uid(), 'staff'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_cancelled_sales_updated_at
BEFORE UPDATE ON public.cancelled_sales
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();