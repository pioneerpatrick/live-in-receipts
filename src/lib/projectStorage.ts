import { supabase } from '@/integrations/supabase/client';
import { Project, Plot } from '@/types/project';

// Helper to get current user's tenant_id
const getCurrentTenantId = async (): Promise<string | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('tenant_users')
    .select('tenant_id')
    .eq('user_id', user.id)
    .maybeSingle();

  return data?.tenant_id || null;
};

// Project operations
export const getProjects = async (): Promise<Project[]> => {
  const tenantId = await getCurrentTenantId();
  
  let query = supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false });

  if (tenantId) {
    query = query.eq('tenant_id', tenantId);
  }

  const { data, error } = await query;

  if (error) throw error;
  return (data || []) as Project[];
};

export const addProject = async (project: Omit<Project, 'id' | 'created_at' | 'updated_at' | 'total_plots' | 'tenant_id'>): Promise<Project> => {
  const tenantId = await getCurrentTenantId();
  
  const { data, error } = await supabase
    .from('projects')
    .insert([{ ...project, tenant_id: tenantId }])
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
  const tenantId = await getCurrentTenantId();
  
  let query = supabase
    .from('plots')
    .select(`
      *,
      project:projects(id, name, location),
      client:clients(id, name, phone)
    `)
    .order('plot_number', { ascending: true });

  if (tenantId) {
    query = query.eq('tenant_id', tenantId);
  }

  if (projectId) {
    query = query.eq('project_id', projectId);
  }

  const { data, error } = await query;

  if (error) throw error;
  return (data || []) as Plot[];
};

export const addPlot = async (plot: Omit<Plot, 'id' | 'created_at' | 'updated_at' | 'project' | 'client' | 'tenant_id'>): Promise<Plot> => {
  const tenantId = await getCurrentTenantId();
  
  const { data, error } = await supabase
    .from('plots')
    .insert([{ ...plot, tenant_id: tenantId }])
    .select()
    .single();

  if (error) throw error;
  
  await updateProjectCapacityIfNeeded(plot.project_id);
  
  return data as Plot;
};

const updateProjectCapacityIfNeeded = async (projectId: string): Promise<void> => {
  const { count, error: countError } = await supabase
    .from('plots')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', projectId);
    
  if (countError) {
    console.error('Error counting plots:', countError);
    return;
  }
  
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('capacity, total_plots')
    .eq('id', projectId)
    .single();
    
  if (projectError) {
    console.error('Error fetching project:', projectError);
    return;
  }
  
  const plotCount = count || 0;
  
  const updates: { total_plots: number; capacity?: number } = {
    total_plots: plotCount
  };
  
  if (plotCount > (project.capacity || 0)) {
    updates.capacity = plotCount;
  }
  
  const { error: updateError } = await supabase
    .from('projects')
    .update(updates)
    .eq('id', projectId);
    
  if (updateError) {
    console.error('Error updating project:', updateError);
  }
};

export const addBulkPlots = async (plots: Omit<Plot, 'id' | 'created_at' | 'updated_at' | 'project' | 'client' | 'tenant_id'>[]): Promise<Plot[]> => {
  const tenantId = await getCurrentTenantId();
  
  const plotsWithTenant = plots.map(plot => ({ ...plot, tenant_id: tenantId }));
  
  const { data, error } = await supabase
    .from('plots')
    .insert(plotsWithTenant)
    .select();

  if (error) throw error;
  
  if (plots.length > 0) {
    const projectId = plots[0].project_id;
    await updateProjectCapacityIfNeeded(projectId);
  }
  
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

export const sellPlot = async (plotId: string, clientId: string): Promise<Plot> => {
  const { data, error } = await supabase
    .from('plots')
    .update({
      status: 'sold',
      client_id: clientId,
      sold_at: new Date().toISOString()
    })
    .eq('id', plotId)
    .eq('status', 'available')
    .select()
    .single();

  if (error) throw error;
  return data as Plot;
};

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

export const getAllInventoryStats = async () => {
  const tenantId = await getCurrentTenantId();
  
  let projectsQuery = supabase
    .from('projects')
    .select('*')
    .order('name');

  let plotsQuery = supabase
    .from('plots')
    .select('project_id, status');

  if (tenantId) {
    projectsQuery = projectsQuery.eq('tenant_id', tenantId);
    plotsQuery = plotsQuery.eq('tenant_id', tenantId);
  }

  const { data: projects, error: projectsError } = await projectsQuery;
  if (projectsError) throw projectsError;

  const { data: plots, error: plotsError } = await plotsQuery;
  if (plotsError) throw plotsError;

  const projectStats = (projects || []).map(project => {
    const projectPlots = (plots || []).filter(p => p.project_id === project.id);
    const actualPlotCount = projectPlots.length;
    const effectiveCapacity = Math.max(project.capacity || 0, actualPlotCount);
    
    return {
      ...project,
      capacity: effectiveCapacity,
      stats: {
        total: actualPlotCount,
        available: projectPlots.filter(p => p.status === 'available').length,
        sold: projectPlots.filter(p => p.status === 'sold').length,
        reserved: projectPlots.filter(p => p.status === 'reserved').length
      }
    };
  });

  const overallStats = {
    totalProjects: (projects || []).length,
    totalPlots: (plots || []).length,
    totalCapacity: (projects || []).reduce((sum, p) => sum + (p.capacity || 0), 0),
    availablePlots: (plots || []).filter(p => p.status === 'available').length,
    soldPlots: (plots || []).filter(p => p.status === 'sold').length,
    reservedPlots: (plots || []).filter(p => p.status === 'reserved').length,
    fullySoldProjects: projectStats.filter(p => p.capacity > 0 && p.stats.available === 0 && p.stats.total >= p.capacity).length
  };

  return { projectStats, overallStats };
};
