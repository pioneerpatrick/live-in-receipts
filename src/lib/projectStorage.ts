import { supabase } from '@/integrations/supabase/client';
import { Project, Plot } from '@/types/project';

// Project operations
export const getProjects = async (): Promise<Project[]> => {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as Project[];
};

export const addProject = async (project: Omit<Project, 'id' | 'created_at' | 'updated_at' | 'total_plots'>): Promise<Project> => {
  const { data, error } = await supabase
    .from('projects')
    .insert([project])
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
    .order('plot_number', { ascending: true });

  if (projectId) {
    query = query.eq('project_id', projectId);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data as Plot[];
};

export const addPlot = async (plot: Omit<Plot, 'id' | 'created_at' | 'updated_at' | 'project' | 'client'>): Promise<Plot> => {
  const { data, error } = await supabase
    .from('plots')
    .insert([plot])
    .select()
    .single();

  if (error) throw error;
  return data as Plot;
};

export const addBulkPlots = async (plots: Omit<Plot, 'id' | 'created_at' | 'updated_at' | 'project' | 'client'>[]): Promise<Plot[]> => {
  const { data, error } = await supabase
    .from('plots')
    .insert(plots)
    .select();

  if (error) throw error;
  return data as Plot[];
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

// Sell a plot to a client
export const sellPlot = async (plotId: string, clientId: string): Promise<Plot> => {
  const { data, error } = await supabase
    .from('plots')
    .update({
      status: 'sold',
      client_id: clientId,
      sold_at: new Date().toISOString()
    })
    .eq('id', plotId)
    .eq('status', 'available') // Prevent double allocation
    .select()
    .single();

  if (error) throw error;
  return data as Plot;
};

// Return a plot (when client defaults)
export const returnPlot = async (plotId: string): Promise<Plot> => {
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

// Get inventory stats for a project
export const getProjectStats = async (projectId: string) => {
  const { data, error } = await supabase
    .from('plots')
    .select('status')
    .eq('project_id', projectId);

  if (error) throw error;

  const stats = {
    total: data.length,
    available: data.filter(p => p.status === 'available').length,
    sold: data.filter(p => p.status === 'sold').length,
    reserved: data.filter(p => p.status === 'reserved').length
  };

  return stats;
};

// Get all inventory stats
export const getAllInventoryStats = async () => {
  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('*')
    .order('name');

  if (projectsError) throw projectsError;

  const { data: plots, error: plotsError } = await supabase
    .from('plots')
    .select('project_id, status');

  if (plotsError) throw plotsError;

  const projectStats = projects.map(project => {
    const projectPlots = plots.filter(p => p.project_id === project.id);
    return {
      ...project,
      stats: {
        total: projectPlots.length,
        available: projectPlots.filter(p => p.status === 'available').length,
        sold: projectPlots.filter(p => p.status === 'sold').length,
        reserved: projectPlots.filter(p => p.status === 'reserved').length
      }
    };
  });

  const overallStats = {
    totalProjects: projects.length,
    totalPlots: plots.length,
    totalCapacity: projects.reduce((sum, p) => sum + (p.capacity || 0), 0),
    availablePlots: plots.filter(p => p.status === 'available').length,
    soldPlots: plots.filter(p => p.status === 'sold').length,
    reservedPlots: plots.filter(p => p.status === 'reserved').length,
    fullySoldProjects: projectStats.filter(p => p.capacity > 0 && p.stats.available === 0 && p.stats.total >= p.capacity).length
  };

  return { projectStats, overallStats };
};
