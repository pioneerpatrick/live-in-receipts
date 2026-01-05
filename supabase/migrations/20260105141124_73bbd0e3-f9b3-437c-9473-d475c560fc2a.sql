-- Add capacity column to projects table
ALTER TABLE public.projects 
ADD COLUMN capacity INTEGER NOT NULL DEFAULT 0;

-- Add comment for clarity
COMMENT ON COLUMN public.projects.capacity IS 'Maximum number of plots this project can have';
COMMENT ON COLUMN public.projects.total_plots IS 'Current number of plots added to this project';