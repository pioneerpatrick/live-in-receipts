-- Add notification_email column to backup_settings
ALTER TABLE public.backup_settings 
ADD COLUMN IF NOT EXISTS notification_email TEXT,
ADD COLUMN IF NOT EXISTS email_notifications_enabled BOOLEAN DEFAULT false;