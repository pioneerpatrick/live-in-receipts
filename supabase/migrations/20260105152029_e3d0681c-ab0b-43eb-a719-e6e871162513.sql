-- Enable replica identity full for clients table for real-time updates
ALTER TABLE public.clients REPLICA IDENTITY FULL;

-- Add clients to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.clients;