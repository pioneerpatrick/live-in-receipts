import { Mail, Phone, Globe, Home } from 'lucide-react';

const Header = () => {
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

          {/* Contact Information */}
          <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6 text-sm">
            <a 
              href="mailto:liveinproperties2021@gmail.com" 
              className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
            >
              <Mail className="w-4 h-4" />
              <span className="hidden sm:inline">liveinproperties2021@gmail.com</span>
              <span className="sm:hidden">Email</span>
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
        </div>
      </div>
    </header>
  );
};

export default Header;
