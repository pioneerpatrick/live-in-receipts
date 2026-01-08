-- Create a function to get public client payment data for QR code scanning
-- This bypasses RLS to allow anyone with the client ID to view payment history

CREATE OR REPLACE FUNCTION public.get_client_payment_history(p_client_id uuid)
RETURNS TABLE (
  client_id uuid,
  client_name text,
  client_phone text,
  project_name text,
  plot_number text,
  total_price numeric,
  discount numeric,
  total_paid numeric,
  balance numeric,
  percent_paid numeric,
  payment_id uuid,
  payment_amount numeric,
  payment_method text,
  payment_date timestamptz,
  previous_balance numeric,
  new_balance numeric,
  receipt_number text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id as client_id,
    c.name as client_name,
    c.phone as client_phone,
    c.project_name,
    c.plot_number,
    c.total_price,
    c.discount,
    c.total_paid,
    c.balance,
    c.percent_paid,
    p.id as payment_id,
    p.amount as payment_amount,
    p.payment_method,
    p.payment_date,
    p.previous_balance,
    p.new_balance,
    p.receipt_number
  FROM clients c
  LEFT JOIN payments p ON p.client_id = c.id
  WHERE c.id = p_client_id
  ORDER BY p.payment_date DESC;
END;
$$;