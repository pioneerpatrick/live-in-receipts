-- Add outcome tracking and audit fields to cancelled_sales
ALTER TABLE public.cancelled_sales 
ADD COLUMN IF NOT EXISTS outcome_type TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS transferred_to_client_id UUID REFERENCES public.clients(id),
ADD COLUMN IF NOT EXISTS transferred_to_project TEXT,
ADD COLUMN IF NOT EXISTS transferred_to_plot TEXT,
ADD COLUMN IF NOT EXISTS audit_notes TEXT,
ADD COLUMN IF NOT EXISTS income_retained NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS expense_recorded NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS processed_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS processed_by UUID;

-- Add comments for documentation
COMMENT ON COLUMN public.cancelled_sales.outcome_type IS 'pending, transferred, refunded, retained, partial_refund';
COMMENT ON COLUMN public.cancelled_sales.transferred_to_client_id IS 'If client transferred to new plot, reference to new client record';
COMMENT ON COLUMN public.cancelled_sales.income_retained IS 'Amount retained as income (cancellation fees + forfeit)';
COMMENT ON COLUMN public.cancelled_sales.expense_recorded IS 'Amount recorded as refund expense';