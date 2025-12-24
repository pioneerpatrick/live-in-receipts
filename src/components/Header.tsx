import { Mail, Phone, Globe, Home, LogOut, User, Shield, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const Header = () => {
  const { user, role, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    toast.success('Logged out successfully');
  };

  return (
    <header className="gradient-header border-b border-border">
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Logo and Company Name */}
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-md">
              <Home className="w-7 h-7 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-heading text-xl md:text-2xl font-bold text-secondary">
                LIVE-IN <span className="text-primary">PROPERTIES</span>
              </h1>
              <p className="text-sm text-muted-foreground italic">
                Genuine plots with ready title deeds
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Contact Information */}
            <div className="hidden lg:flex flex-wrap items-center justify-center gap-4 md:gap-6 text-sm">
              <a 
                href="mailto:liveinproperties2021@gmail.com" 
                className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
              >
                <Mail className="w-4 h-4" />
                <span>liveinproperties2021@gmail.com</span>
              </a>
              <a 
                href="tel:0746499499" 
                className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
              >
                <Phone className="w-4 h-4" />
                <span>0746499499</span>
              </a>
              <a 
                href="https://live-inproperties.co.ke" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
              >
                <Globe className="w-4 h-4" />
                <span>live-inproperties.co.ke</span>
              </a>
            </div>

            {/* User Menu */}
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <User className="w-4 h-4" />
                    <span className="hidden sm:inline">{user.email?.split('@')[0]}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium">{user.email}</p>
                      <div className="flex items-center gap-2">
                        <Shield className="w-3 h-3" />
                        <Badge variant={role === 'admin' ? 'default' : 'secondary'} className="text-xs">
                          {role === 'admin' ? 'Admin' : 'Staff'}
                        </Badge>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {role === 'admin' && (
                    <DropdownMenuItem asChild className="cursor-pointer">
                      <Link to="/admin" className="flex items-center">
                        <Settings className="w-4 h-4 mr-2" />
                        <span>Admin Panel</span>
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive cursor-pointer">
                    <LogOut className="w-4 h-4 mr-2" />
                    <span>Logout</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
