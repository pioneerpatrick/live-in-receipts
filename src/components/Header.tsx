import { Mail, Phone, Globe, Home, LogOut, User, Shield, Settings, BarChart3, LayoutDashboard } from 'lucide-react';
import { useLocation } from 'react-router-dom';
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
  const location = useLocation();
  
  // Show "Back to Dashboard" button for admin on non-dashboard pages
  const showBackToDashboard = role === 'admin' && location.pathname !== '/';

  const handleSignOut = async () => {
    await signOut();
    toast.success('Logged out successfully');
  };

  return (
    <header className="gradient-header border-b border-border sticky top-0 z-50">
      <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          {/* Logo and Company Name */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-shrink">
            <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-md flex-shrink-0">
              <Home className="w-5 h-5 sm:w-7 sm:h-7 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <h1 className="font-heading text-base sm:text-xl md:text-2xl font-bold text-secondary truncate">
                LIVE-IN <span className="text-primary">PROPERTIES</span>
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground italic hidden xs:block truncate">
                Genuine plots with ready title deeds
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
            {/* Back to Dashboard Button for Admins */}
            {showBackToDashboard && (
              <Button asChild variant="outline" size="sm" className="gap-1 sm:gap-2">
                <Link to="/">
                  <LayoutDashboard className="w-4 h-4" />
                  <span className="hidden sm:inline">Dashboard</span>
                </Link>
              </Button>
            )}
            {/* Contact Information - Hidden on mobile/tablet */}
            <div className="hidden xl:flex flex-wrap items-center justify-center gap-4 text-sm">
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

            {/* Mobile contact icons */}
            <div className="flex xl:hidden items-center gap-1">
              <a 
                href="tel:0746499499" 
                className="p-2 text-muted-foreground hover:text-primary transition-colors"
                aria-label="Call us"
              >
                <Phone className="w-4 h-4" />
              </a>
              <a 
                href="mailto:liveinproperties2021@gmail.com" 
                className="p-2 text-muted-foreground hover:text-primary transition-colors"
                aria-label="Email us"
              >
                <Mail className="w-4 h-4" />
              </a>
            </div>

            {/* User Menu */}
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1 sm:gap-2 px-2 sm:px-3">
                    <User className="w-4 h-4" />
                    <span className="hidden sm:inline max-w-[100px] truncate">{user.email?.split('@')[0]}</span>
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
                      <Link to="/dashboard" className="flex items-center">
                        <BarChart3 className="w-4 h-4 mr-2" />
                        <span>Dashboard</span>
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {role === 'admin' && (
                    <DropdownMenuItem asChild className="cursor-pointer">
                      <Link to="/admin" className="flex items-center">
                        <Shield className="w-4 h-4 mr-2" />
                        <span>Admin Panel</span>
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {role === 'admin' && (
                    <DropdownMenuItem asChild className="cursor-pointer">
                      <Link to="/settings" className="flex items-center">
                        <Settings className="w-4 h-4 mr-2" />
                        <span>Settings</span>
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
