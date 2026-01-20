-- Create backups storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('database-backups', 'database-backups', false)
ON CONFLICT (id) DO NOTHING;

-- Only admins can access backups
CREATE POLICY "Admins can view backups"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'database-backups' 
  AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can upload backups"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'database-backups' 
  AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can delete backups"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'database-backups' 
  AND public.has_role(auth.uid(), 'admin')
);

-- Create a table to track backup history and schedule settings
CREATE TABLE IF NOT EXISTS public.backup_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  auto_backup_enabled BOOLEAN DEFAULT false,
  backup_frequency TEXT DEFAULT 'weekly', -- 'daily', 'weekly', 'monthly'
  last_backup_at TIMESTAMP WITH TIME ZONE,
  next_backup_at TIMESTAMP WITH TIME ZONE,
  retention_days INTEGER DEFAULT 30,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.backup_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can access backup settings
CREATE POLICY "Admins can view backup settings"
ON public.backup_settings FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update backup settings"
ON public.backup_settings FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert backup settings"
ON public.backup_settings FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create backup history table
CREATE TABLE IF NOT EXISTS public.backup_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  backup_type TEXT DEFAULT 'manual', -- 'manual', 'scheduled'
  status TEXT DEFAULT 'completed', -- 'completed', 'failed'
  record_count INTEGER,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.backup_history ENABLE ROW LEVEL SECURITY;

-- Only admins can access backup history
CREATE POLICY "Admins can view backup history"
ON public.backup_history FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert backup history"
ON public.backup_history FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete backup history"
ON public.backup_history FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Insert default backup settings
INSERT INTO public.backup_settings (auto_backup_enabled, backup_frequency, retention_days)
VALUES (false, 'weekly', 30)
ON CONFLICT DO NOTHING;