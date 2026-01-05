-- Add buying_price column to projects table for profit/loss calculations
ALTER TABLE public.projects ADD COLUMN buying_price numeric DEFAULT 0;