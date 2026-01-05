import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { ProjectsManager } from '@/components/projects/ProjectsManager';
import ProtectedRoute from '@/components/ProtectedRoute';

const Projects = () => {
  return (
    <ProtectedRoute requiredRole="admin">
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Projects & Plots Management</h1>
            <p className="text-muted-foreground mt-2">Manage your real estate projects and plot inventory</p>
          </div>
          <ProjectsManager />
        </main>
        <Footer />
      </div>
    </ProtectedRoute>
  );
};

export default Projects;
