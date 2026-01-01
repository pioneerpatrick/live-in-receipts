import { Heart } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-secondary text-secondary-foreground py-4 sm:py-6 mt-auto">
      <div className="container mx-auto px-3 sm:px-4 text-center">
        <p className="flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm md:text-base flex-wrap">
          <Heart className="w-3 h-3 sm:w-4 sm:h-4 text-primary animate-pulse-subtle flex-shrink-0" />
          <span>Thank you for choosing Live-IN Properties.</span>
          <span className="hidden xs:inline">We Secure your Future.</span>
          <Heart className="w-3 h-3 sm:w-4 sm:h-4 text-primary animate-pulse-subtle flex-shrink-0" />
        </p>
        <p className="text-[10px] sm:text-xs mt-1.5 sm:mt-2 opacity-75">
          © {new Date().getFullYear()} Live-IN Properties. All rights reserved.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
