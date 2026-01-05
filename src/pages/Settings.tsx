import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

const Settings = () => {
  const { role } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect admins to the comprehensive Admin dashboard
    if (role === 'admin') {
      navigate('/admin', { replace: true });
    }
  }, [role, navigate]);

  // Show loading while checking role
  if (role === 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Non-admin users see access denied
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Access Denied</CardTitle>
            <CardDescription>Only administrators can access settings.</CardDescription>
          </CardHeader>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default Settings;
