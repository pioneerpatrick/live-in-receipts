import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Building, MapPin, CheckCircle, Package, AlertCircle } from 'lucide-react';
import { getAllInventoryStats } from '@/lib/projectStorage';
import { formatCurrency } from '@/lib/supabaseStorage';
import { supabase } from '@/integrations/supabase/client';

interface ProjectStat {
  id: string;
  name: string;
  location: string;
  capacity: number;
  stats: {
    total: number;
    available: number;
    sold: number;
    reserved: number;
  };
}

interface OverallStats {
  totalProjects: number;
  totalPlots: number;
  availablePlots: number;
  soldPlots: number;
  reservedPlots: number;
  fullySoldProjects: number;
}

export function InventoryDashboard() {
  const [projectStats, setProjectStats] = useState<ProjectStat[]>([]);
  const [overallStats, setOverallStats] = useState<OverallStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const { projectStats, overallStats } = await getAllInventoryStats();
      setProjectStats(projectStats);
      setOverallStats(overallStats);
    } catch (error) {
      console.error('Error fetching inventory stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();

    // Subscribe to real-time updates for plots, projects, and clients
    const channel = supabase
      .channel('inventory-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'plots' },
        () => fetchStats()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'projects' },
        () => fetchStats()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'clients' },
        () => fetchStats()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallStats?.totalProjects || 0}</div>
            <p className="text-xs text-muted-foreground">
              {overallStats?.fullySoldProjects || 0} fully sold
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Plots</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallStats?.totalPlots || 0}</div>
            <p className="text-xs text-muted-foreground">
              Across all projects
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Plots</CardTitle>
            <Package className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{overallStats?.availablePlots || 0}</div>
            <p className="text-xs text-muted-foreground">
              Ready for sale
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sold Plots</CardTitle>
            <CheckCircle className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{overallStats?.soldPlots || 0}</div>
            <p className="text-xs text-muted-foreground">
              {overallStats?.totalPlots ? Math.round((overallStats.soldPlots / overallStats.totalPlots) * 100) : 0}% of inventory
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Project-wise breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Project Inventory</CardTitle>
        </CardHeader>
        <CardContent>
          {projectStats.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No projects found. Create your first project to get started.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {projectStats.map((project) => {
                const soldPercentage = project.capacity > 0 
                  ? Math.round((project.stats.sold / project.capacity) * 100) 
                  : 0;
                const isFullySold = project.capacity > 0 && project.stats.available === 0 && project.stats.total >= project.capacity;
                const remainingCapacity = project.capacity - project.stats.total;

                return (
                  <div key={project.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium flex items-center gap-2">
                          {project.name}
                          {isFullySold && (
                            <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                              Fully Sold
                            </Badge>
                          )}
                        </h4>
                        <p className="text-sm text-muted-foreground">{project.location}</p>
                      </div>
                      <div className="text-right text-sm">
                        <p>
                          <span className="font-medium">{project.stats.total}</span> / {project.capacity} plots
                          {remainingCapacity > 0 && (
                            <span className="text-muted-foreground ml-1">({remainingCapacity} slots left)</span>
                          )}
                        </p>
                        <p className="text-muted-foreground">
                          <span className="text-green-600 font-medium">{project.stats.available}</span> available, {' '}
                          <span className="text-primary font-medium">{project.stats.sold}</span> sold
                          {project.stats.reserved > 0 && (
                            <>, <span className="text-yellow-600 font-medium">{project.stats.reserved}</span> reserved</>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Progress value={soldPercentage} className="h-2" />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Inventory: {project.stats.total} added</span>
                        <span>{soldPercentage}% sold</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
