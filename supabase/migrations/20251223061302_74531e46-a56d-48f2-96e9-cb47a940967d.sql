-- Create clients table to store client/buyer information
CREATE TABLE public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  project_name TEXT NOT NULL,
  plot_number TEXT NOT NULL,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  number_of_plots INTEGER NOT NULL DEFAULT 1,
  total_price NUMERIC NOT NULL DEFAULT 0,
  discount NUMERIC NOT NULL DEFAULT 0,
  total_paid NUMERIC NOT NULL DEFAULT 0,
  balance NUMERIC NOT NULL DEFAULT 0,
  sales_agent TEXT,
  commission NUMERIC DEFAULT 0,
  commission_received NUMERIC DEFAULT 0,
  commission_balance NUMERIC DEFAULT 0,
  payment_period TEXT,
  completion_date DATE,
  next_payment_date DATE,
  notes TEXT,
  status TEXT DEFAULT 'ongoing',
  sale_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create payments table to store payment records
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'Cash',
  payment_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  previous_balance NUMERIC NOT NULL DEFAULT 0,
  new_balance NUMERIC NOT NULL DEFAULT 0,
  receipt_number TEXT NOT NULL,
  agent_name TEXT,
  authorized_by TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for clients - all authenticated users can view
CREATE POLICY "Authenticated users can view clients" 
ON public.clients 
FOR SELECT 
TO authenticated
USING (true);

-- Only admins can insert clients
CREATE POLICY "Admins and staff can insert clients" 
ON public.clients 
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Admins and staff can update clients
CREATE POLICY "Admins and staff can update clients" 
ON public.clients 
FOR UPDATE 
TO authenticated
USING (true);

-- Only admins can delete clients
CREATE POLICY "Admins can delete clients" 
ON public.clients 
FOR DELETE 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for payments
CREATE POLICY "Authenticated users can view payments" 
ON public.payments 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert payments" 
ON public.payments 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Admins can update payments" 
ON public.payments 
FOR UPDATE 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete payments" 
ON public.payments 
FOR DELETE 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create trigger for automatic timestamp updates on clients
CREATE TRIGGER update_clients_updated_at
BEFORE UPDATE ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();