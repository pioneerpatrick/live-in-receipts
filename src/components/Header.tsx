import { useEffect } from 'react';
import { Mail, Phone, Globe, Home, LogOut, User, Shield, Settings, LayoutDashboard, Building, BarChart3, Calculator, Crown } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useTenant } from '@/hooks/useTenant';
import { usePrefetchData } from '@/hooks/useDataCache';
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
import technopanalyLogo from '@/assets/technopanaly-logo.jpg';

const Header = () => {
  const { user, role, signOut } = useAuth();
  const { tenant, isSuperAdmin, isMainDomain } = useTenant();
  const location = useLocation();
  const { prefetchClients, prefetchPayments } = usePrefetchData();
  
  // Prefetch data when user logs in for instant page loads
  useEffect(() => {
    if (user && role === 'admin') {
      // Prefetch data in background for instant navigation
      prefetchClients();
      prefetchPayments();
    }
  }, [user, role, prefetchClients, prefetchPayments]);
  
  // Show "Back to Dashboard" button for admin on non-dashboard pages
  const showBackToDashboard = role === 'admin' && location.pathname !== '/';

  const handleSignOut = async () => {
    await signOut();
    toast.success('Logged out successfully');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="gradient-header border-b border-border sticky top-0 z-50">
      <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          {/* Logo and Company Name */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-shrink">
            <Link to="/" className="flex items-center gap-2 sm:gap-3">
              {isMainDomain && isSuperAdmin ? (
                <img src={technopanalyLogo} alt="Techno Panaly" className="w-10 h-10 sm:w-14 sm:h-14 rounded-full object-cover shadow-md flex-shrink-0" />
              ) : (
                <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-md flex-shrink-0">
                  <Home className="w-5 h-5 sm:w-7 sm:h-7 text-primary-foreground" />
                </div>
              )}
              <div className="min-w-0">
                <h1 className="font-heading text-base sm:text-xl md:text-2xl font-bold text-secondary truncate">
                  {isMainDomain && isSuperAdmin ? 'TECHNO PANALY' : (tenant?.name || 'LIVE-IN PROPERTIES')}
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground italic hidden xs:block truncate">
                  {isMainDomain && isSuperAdmin ? 'Powering Digital Transformation' : (tenant ? 'Staff Portal' : 'Genuine plots with ready title deeds')}
                </p>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            {/* Super Admin Link - Only visible on main domain for super admins */}
            {isSuperAdmin && isMainDomain && (
              <Button
                asChild
                variant={isActive('/super-admin') ? 'default' : 'ghost'}
                size="sm"
                className="gap-1.5 px-2.5 text-xs bg-amber-500 hover:bg-amber-600 text-white"
              >
                <Link to="/super-admin">
                  <Crown className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Super Admin</span>
                </Link>
              </Button>
            )}

            {/* Admin Navigation Links */}
            {role === 'admin' && (
              <nav className="hidden lg:flex items-center gap-0.5">
                <Button
                  asChild
                  variant={isActive('/') ? 'default' : 'ghost'}
                  size="sm"
                  className="gap-1.5 px-2.5 text-xs"
                >
                  <Link to="/">
                    <LayoutDashboard className="w-3.5 h-3.5" />
                    <span>Dashboard</span>
                  </Link>
                </Button>
                <Button
                  asChild
                  variant={isActive('/admin') ? 'default' : 'ghost'}
                  size="sm"
                  className="gap-1.5 px-2.5 text-xs"
                >
                  <Link to="/admin">
                    <BarChart3 className="w-3.5 h-3.5" />
                    <span>Accounts</span>
                  </Link>
                </Button>
                <Button
                  asChild
                  variant={isActive('/payroll') ? 'default' : 'ghost'}
                  size="sm"
                  className="gap-1.5 px-2.5 text-xs"
                >
                  <Link to="/payroll">
                    <Calculator className="w-3.5 h-3.5" />
                    <span>Payroll</span>
                  </Link>
                </Button>
                <Button
                  asChild
                  variant={isActive('/projects') ? 'default' : 'ghost'}
                  size="sm"
                  className="gap-1.5 px-2.5 text-xs"
                >
                  <Link to="/projects">
                    <Building className="w-3.5 h-3.5" />
                    <span>Projects</span>
                  </Link>
                </Button>
                <Button
                  asChild
                  variant={isActive('/settings') ? 'default' : 'ghost'}
                  size="sm"
                  className="gap-1.5 px-2.5 text-xs"
                >
                  <Link to="/settings">
                    <Settings className="w-3.5 h-3.5" />
                    <span>Settings</span>
                  </Link>
                </Button>
              </nav>
            )}

            {/* Back to Dashboard Button for Admins (mobile only when on subpage) */}
            {showBackToDashboard && (
              <Button asChild variant="outline" size="sm" className="gap-1 sm:gap-2 md:hidden">
                <Link to="/">
                  <LayoutDashboard className="w-4 h-4" />
                  <span className="hidden sm:inline">Dashboard</span>
                </Link>
              </Button>
            )}

            {/* Contact icons - always shown as icons */}
            <div className="flex items-center gap-0.5">
              <a 
                href="tel:0746499499" 
                className="p-2 text-muted-foreground hover:text-primary transition-colors"
                aria-label="Call us"
                title="0746499499"
              >
                <Phone className="w-4 h-4" />
              </a>
              <a 
                href="mailto:liveinproperties2021@gmail.com" 
                className="p-2 text-muted-foreground hover:text-primary transition-colors"
                aria-label="Email us"
                title="liveinproperties2021@gmail.com"
              >
                <Mail className="w-4 h-4" />
              </a>
              <a 
                href="https://live-inproperties.co.ke" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2 text-muted-foreground hover:text-primary transition-colors hidden sm:block"
                aria-label="Visit website"
                title="live-inproperties.co.ke"
              >
                <Globe className="w-4 h-4" />
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
                  {/* Mobile navigation for admins */}
                  {role === 'admin' && (
                    <>
                      <DropdownMenuItem asChild className="cursor-pointer md:hidden">
                        <Link to="/" className="flex items-center">
                          <LayoutDashboard className="w-4 h-4 mr-2" />
                          <span>Dashboard</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild className="cursor-pointer md:hidden">
                        <Link to="/admin" className="flex items-center">
                          <BarChart3 className="w-4 h-4 mr-2" />
                          <span>Accounting Panel</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild className="cursor-pointer md:hidden">
                        <Link to="/payroll" className="flex items-center">
                          <Calculator className="w-4 h-4 mr-2" />
                          <span>Payroll</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild className="cursor-pointer md:hidden">
                        <Link to="/projects" className="flex items-center">
                          <Building className="w-4 h-4 mr-2" />
                          <span>Projects & Plots</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild className="cursor-pointer md:hidden">
                        <Link to="/settings" className="flex items-center">
                          <Settings className="w-4 h-4 mr-2" />
                          <span>Settings</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="md:hidden" />
                    </>
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
