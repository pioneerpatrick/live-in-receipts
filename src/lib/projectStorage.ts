import { supabase } from '@/integrations/supabase/client';
import { Project, Plot } from '@/types/project';

// Project operations
export const getProjects = async (): Promise<Project[]> => {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as Project[];
};

export const addProject = async (project: Omit<Project, 'id' | 'created_at' | 'updated_at' | 'total_plots' | 'tenant_id'>): Promise<Project> => {
  const { data, error } = await supabase
    .from('projects')
    .insert([{ ...project }])
    .select()
    .single();

  if (error) throw error;
  return data as Project;
};

export const updateProject = async (id: string, updates: Partial<Project>): Promise<Project> => {
  const { data, error } = await supabase
    .from('projects')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Project;
};

export const deleteProject = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

// Plot operations
export const getPlots = async (projectId?: string): Promise<Plot[]> => {
  let query = supabase
    .from('plots')
    .select(`
      *,
      project:projects(id, name, location),
      client:clients(id, name, phone)
    `)
    .order('plot_number');

  if (projectId) {
    query = query.eq('project_id', projectId);
  }

  const { data, error } = await query;

  if (error) throw error;
  return (data || []) as Plot[];
};

export const getAvailablePlots = async (projectId?: string): Promise<Plot[]> => {
  let query = supabase
    .from('plots')
    .select(`
      *,
      project:projects(id, name, location)
    `)
    .eq('status', 'available')
    .order('plot_number');

  if (projectId) {
    query = query.eq('project_id', projectId);
  }

  const { data, error } = await query;

  if (error) throw error;
  return (data || []) as Plot[];
};

export const addPlot = async (plot: Omit<Plot, 'id' | 'created_at' | 'updated_at' | 'tenant_id'>): Promise<Plot> => {
  const { data, error } = await supabase
    .from('plots')
    .insert([{ ...plot }])
    .select()
    .single();

  if (error) throw error;
  return data as Plot;
};

export const addBulkPlots = async (plots: Omit<Plot, 'id' | 'created_at' | 'updated_at' | 'tenant_id'>[]): Promise<Plot[]> => {
  const { data, error } = await supabase
    .from('plots')
    .insert(plots.map(plot => ({ ...plot })))
    .select();

  if (error) throw error;
  return (data || []) as Plot[];
};

export const updatePlot = async (id: string, updates: Partial<Plot>): Promise<Plot> => {
  const { data, error } = await supabase
    .from('plots')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Plot;
};

export const deletePlot = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('plots')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

export const markPlotAsSold = async (plotId: string, clientId: string): Promise<Plot> => {
  const { data, error } = await supabase
    .from('plots')
    .update({
      status: 'sold',
      client_id: clientId,
      sold_at: new Date().toISOString()
    })
    .eq('id', plotId)
    .select()
    .single();

  if (error) throw error;
  return data as Plot;
};

export const markPlotAsAvailable = async (plotId: string): Promise<Plot> => {
  const { data, error } = await supabase
    .from('plots')
    .update({
      status: 'available',
      client_id: null,
      sold_at: null
    })
    .eq('id', plotId)
    .select()
    .single();

  if (error) throw error;
  return data as Plot;
};

// Get project with plot stats
export const getProjectWithStats = async (projectId: string): Promise<Project & { available_plots: number; sold_plots: number }> => {
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single();

  if (projectError) throw projectError;

  const { data: plots, error: plotsError } = await supabase
    .from('plots')
    .select('status')
    .eq('project_id', projectId);

  if (plotsError) throw plotsError;

  const available = plots?.filter(p => p.status === 'available').length || 0;
  const sold = plots?.filter(p => p.status === 'sold').length || 0;

  return {
    ...project,
    available_plots: available,
    sold_plots: sold,
    total_plots: plots?.length || 0
  } as Project & { available_plots: number; sold_plots: number };
};

// Get all projects with stats
export const getProjectsWithStats = async (): Promise<(Project & { available_plots: number; sold_plots: number })[]> => {
  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false });

  if (projectsError) throw projectsError;
  if (!projects) return [];

  const projectIds = projects.map(p => p.id);
  
  const { data: plots, error: plotsError } = await supabase
    .from('plots')
    .select('project_id, status')
    .in('project_id', projectIds);

  if (plotsError) throw plotsError;

  return projects.map(project => {
    const projectPlots = plots?.filter(p => p.project_id === project.id) || [];
    const available = projectPlots.filter(p => p.status === 'available').length;
    const sold = projectPlots.filter(p => p.status === 'sold').length;

    return {
      ...project,
      available_plots: available,
      sold_plots: sold,
      total_plots: projectPlots.length
    };
  }) as (Project & { available_plots: number; sold_plots: number })[];
};

// Find plot by project and plot number
export const findPlotByNumber = async (projectName: string, plotNumber: string): Promise<Plot | null> => {
  // First find the project
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id')
    .eq('name', projectName)
    .maybeSingle();

  if (projectError || !project) return null;

  // Then find the plot
  const { data: plot, error: plotError } = await supabase
    .from('plots')
    .select('*')
    .eq('project_id', project.id)
    .eq('plot_number', plotNumber)
    .maybeSingle();

  if (plotError) return null;
  return plot as Plot | null;
};

// Aliases for compatibility
export const sellPlot = markPlotAsSold;
export const returnPlot = markPlotAsAvailable;

// Get all inventory stats
export const getAllInventoryStats = async () => {
  const projects = await getProjectsWithStats();
  
  const projectStats = projects.map(p => ({
    id: p.id,
    name: p.name,
    location: p.location,
    totalPlots: p.total_plots,
    availablePlots: p.available_plots,
    soldPlots: p.sold_plots,
  }));

  const overallStats = {
    totalProjects: projects.length,
    totalPlots: projects.reduce((sum, p) => sum + p.total_plots, 0),
    availablePlots: projects.reduce((sum, p) => sum + p.available_plots, 0),
    soldPlots: projects.reduce((sum, p) => sum + p.sold_plots, 0),
  };

  return { projectStats, overallStats };
};
