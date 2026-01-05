-- Create projects table
CREATE TABLE public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  total_plots INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create plots table
CREATE TABLE public.plots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  plot_number TEXT NOT NULL,
  size TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'sold', 'reserved')),
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  sold_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id, plot_number)
);

-- Enable RLS on both tables
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plots ENABLE ROW LEVEL SECURITY;

-- Projects policies (admin only for write, all authenticated for read)
CREATE POLICY "Authenticated users can view projects" 
ON public.projects FOR SELECT USING (true);

CREATE POLICY "Admins can insert projects" 
ON public.projects FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update projects" 
ON public.projects FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete projects" 
ON public.projects FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Plots policies (admin only for write, all authenticated for read)
CREATE POLICY "Authenticated users can view plots" 
ON public.plots FOR SELECT USING (true);

CREATE POLICY "Admins can insert plots" 
ON public.plots FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update plots" 
ON public.plots FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete plots" 
ON public.plots FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Triggers for updated_at
CREATE TRIGGER update_projects_updated_at
BEFORE UPDATE ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_plots_updated_at
BEFORE UPDATE ON public.plots
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to update project total_plots count
CREATE OR REPLACE FUNCTION public.update_project_plot_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.projects 
    SET total_plots = (SELECT COUNT(*) FROM public.plots WHERE project_id = NEW.project_id)
    WHERE id = NEW.project_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.projects 
    SET total_plots = (SELECT COUNT(*) FROM public.plots WHERE project_id = OLD.project_id)
    WHERE id = OLD.project_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Trigger to auto-update project total_plots
CREATE TRIGGER update_project_plot_count_trigger
AFTER INSERT OR DELETE ON public.plots
FOR EACH ROW
EXECUTE FUNCTION public.update_project_plot_count();

-- Enable realtime for plots table
ALTER PUBLICATION supabase_realtime ADD TABLE public.plots;