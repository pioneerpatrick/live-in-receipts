import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Plus, Building, MapPin, Edit, Trash2, ArrowLeft, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import { Project, Plot } from '@/types/project';
import { 
  getProjects, addProject, updateProject, deleteProject,
  getPlots, addPlot, addBulkPlots, updatePlot, deletePlot, returnPlot 
} from '@/lib/projectStorage';
import { ProjectForm } from './ProjectForm';
import { PlotForm } from './PlotForm';
import { BulkPlotForm } from './BulkPlotForm';
import { PlotList } from './PlotList';
import { InventoryDashboard } from './InventoryDashboard';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { supabase } from '@/integrations/supabase/client';

export function ProjectsManager() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [plots, setPlots] = useState<Plot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlotsLoading, setIsPlotsLoading] = useState(false);

  // Form states
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [showPlotForm, setShowPlotForm] = useState(false);
  const [editingPlot, setEditingPlot] = useState<Plot | null>(null);
  const [showBulkForm, setShowBulkForm] = useState(false);
  const [deleteProjectId, setDeleteProjectId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchProjects = async () => {
    try {
      const data = await getProjects();
      setProjects(data);
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast.error('Failed to load projects');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPlots = async (projectId: string) => {
    setIsPlotsLoading(true);
    try {
      const data = await getPlots(projectId);
      setPlots(data);
    } catch (error) {
      console.error('Error fetching plots:', error);
      toast.error('Failed to load plots');
    } finally {
      setIsPlotsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();

    // Subscribe to real-time updates for projects
    const channel = supabase
      .channel('projects-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'projects' },
        () => fetchProjects()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (selectedProject) {
      fetchPlots(selectedProject.id);

      // Subscribe to real-time updates for plots
      const channel = supabase
        .channel('plots-updates')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'plots' },
          () => fetchPlots(selectedProject.id)
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [selectedProject]);

  // Project handlers
  const handleAddProject = async (data: Omit<Project, 'id' | 'created_at' | 'updated_at' | 'total_plots'>) => {
    setIsSubmitting(true);
    try {
      await addProject(data);
      toast.success('Project created successfully');
      setShowProjectForm(false);
      fetchProjects();
    } catch (error) {
      console.error('Error adding project:', error);
      toast.error('Failed to create project');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateProject = async (data: Omit<Project, 'id' | 'created_at' | 'updated_at' | 'total_plots'>) => {
    if (!editingProject) return;
    setIsSubmitting(true);
    try {
      await updateProject(editingProject.id, data);
      toast.success('Project updated successfully');
      setEditingProject(null);
      fetchProjects();
    } catch (error) {
      console.error('Error updating project:', error);
      toast.error('Failed to update project');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!deleteProjectId) return;
    try {
      await deleteProject(deleteProjectId);
      toast.success('Project deleted successfully');
      setDeleteProjectId(null);
      if (selectedProject?.id === deleteProjectId) {
        setSelectedProject(null);
      }
      fetchProjects();
    } catch (error) {
      console.error('Error deleting project:', error);
      toast.error('Failed to delete project');
    }
  };

  // Plot handlers
  const handleAddPlot = async (data: Omit<Plot, 'id' | 'created_at' | 'updated_at' | 'project' | 'client'>) => {
    setIsSubmitting(true);
    try {
      await addPlot(data);
      toast.success('Plot added successfully');
      setShowPlotForm(false);
      if (selectedProject) fetchPlots(selectedProject.id);
    } catch (error: any) {
      console.error('Error adding plot:', error);
      if (error.code === '23505') {
        toast.error('Plot number already exists in this project');
      } else {
        toast.error('Failed to add plot');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkAddPlots = async (data: { prefix: string; startNumber: number; count: number; size: string; price: number }) => {
    if (!selectedProject) return;
    setIsSubmitting(true);
    try {
      const plotsToAdd = Array.from({ length: data.count }, (_, i) => ({
        project_id: selectedProject.id,
        plot_number: `${data.prefix}${data.startNumber + i}`,
        size: data.size,
        price: data.price,
        status: 'available' as const
      }));
      await addBulkPlots(plotsToAdd);
      toast.success(`${data.count} plots added successfully`);
      setShowBulkForm(false);
      fetchPlots(selectedProject.id);
    } catch (error: any) {
      console.error('Error bulk adding plots:', error);
      if (error.code === '23505') {
        toast.error('Some plot numbers already exist');
      } else {
        toast.error('Failed to add plots');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdatePlot = async (data: Omit<Plot, 'id' | 'created_at' | 'updated_at' | 'project' | 'client'>) => {
    if (!editingPlot) return;
    setIsSubmitting(true);
    try {
      await updatePlot(editingPlot.id, data);
      toast.success('Plot updated successfully');
      setEditingPlot(null);
      if (selectedProject) fetchPlots(selectedProject.id);
    } catch (error) {
      console.error('Error updating plot:', error);
      toast.error('Failed to update plot');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePlot = async (id: string) => {
    try {
      await deletePlot(id);
      toast.success('Plot deleted successfully');
      if (selectedProject) fetchPlots(selectedProject.id);
    } catch (error) {
      console.error('Error deleting plot:', error);
      toast.error('Failed to delete plot');
    }
  };

  const handleReturnPlot = async (id: string) => {
    try {
      await returnPlot(id);
      toast.success('Plot returned to available status');
      if (selectedProject) fetchPlots(selectedProject.id);
    } catch (error) {
      console.error('Error returning plot:', error);
      toast.error('Failed to return plot');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="inventory" className="space-y-6">
        <TabsList>
          <TabsTrigger value="inventory" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Inventory Report
          </TabsTrigger>
          <TabsTrigger value="projects" className="flex items-center gap-2">
            <Building className="h-4 w-4" />
            Projects
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inventory">
          <InventoryDashboard />
        </TabsContent>

        <TabsContent value="projects">
          {selectedProject ? (
            // Plot management view
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={() => setSelectedProject(null)}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Projects
                </Button>
              </div>

              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-xl">{selectedProject.name}</CardTitle>
                      <p className="text-muted-foreground flex items-center gap-1 mt-1">
                        <MapPin className="h-4 w-4" />
                        {selectedProject.location}
                      </p>
                      {selectedProject.description && (
                        <p className="text-sm text-muted-foreground mt-2">{selectedProject.description}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => setShowPlotForm(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Plot
                      </Button>
                      <Button variant="outline" onClick={() => setShowBulkForm(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Bulk Add
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <PlotList
                    plots={plots}
                    onEdit={setEditingPlot}
                    onDelete={handleDeletePlot}
                    onReturn={handleReturnPlot}
                    isLoading={isPlotsLoading}
                  />
                </CardContent>
              </Card>

              <PlotForm
                open={showPlotForm || !!editingPlot}
                onOpenChange={(open) => {
                  if (!open) {
                    setShowPlotForm(false);
                    setEditingPlot(null);
                  }
                }}
                onSubmit={editingPlot ? handleUpdatePlot : handleAddPlot}
                projectId={selectedProject.id}
                initialData={editingPlot || undefined}
                isLoading={isSubmitting}
              />

              <BulkPlotForm
                open={showBulkForm}
                onOpenChange={setShowBulkForm}
                onSubmit={handleBulkAddPlots}
                isLoading={isSubmitting}
              />
            </div>
          ) : (
            // Projects list view
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">All Projects</h3>
                <Button onClick={() => setShowProjectForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Project
                </Button>
              </div>

              {projects.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Building className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No projects yet</h3>
                    <p className="text-muted-foreground mb-4">Create your first project to start managing plots</p>
                    <Button onClick={() => setShowProjectForm(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Project
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {projects.map((project) => (
                    <Card 
                      key={project.id} 
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => setSelectedProject(project)}
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg">{project.name}</CardTitle>
                            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                              <MapPin className="h-3 w-3" />
                              {project.location}
                            </p>
                          </div>
                          <Badge variant="secondary">{project.total_plots} / {project.capacity}</Badge>
                        </div>
                        <div className="mt-2">
                          <div className="flex justify-between text-xs text-muted-foreground mb-1">
                            <span>Inventory</span>
                            <span>{project.total_plots} of {project.capacity} plots added</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-1.5">
                            <div 
                              className="bg-primary h-1.5 rounded-full" 
                              style={{ width: `${project.capacity > 0 ? (project.total_plots / project.capacity) * 100 : 0}%` }}
                            />
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {project.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                            {project.description}
                          </p>
                        )}
                        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setEditingProject(project)}
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setDeleteProjectId(project.id)}
                          >
                            <Trash2 className="h-3 w-3 mr-1 text-destructive" />
                            Delete
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <ProjectForm
        open={showProjectForm || !!editingProject}
        onOpenChange={(open) => {
          if (!open) {
            setShowProjectForm(false);
            setEditingProject(null);
          }
        }}
        onSubmit={editingProject ? handleUpdateProject : handleAddProject}
        initialData={editingProject || undefined}
        isLoading={isSubmitting}
      />

      <ConfirmDialog
        open={!!deleteProjectId}
        onOpenChange={() => setDeleteProjectId(null)}
        onConfirm={handleDeleteProject}
        title="Delete Project"
        description="Are you sure you want to delete this project? All plots in this project will also be deleted. This action cannot be undone."
        confirmText="Delete"
      />
    </div>
  );
}
