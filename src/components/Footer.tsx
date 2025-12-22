import { Heart } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-secondary text-secondary-foreground py-6 mt-auto">
      <div className="container mx-auto px-4 text-center">
        <p className="flex items-center justify-center gap-2 text-sm md:text-base">
          <Heart className="w-4 h-4 text-primary animate-pulse-subtle" />
          <span>Thank you for choosing Live-IN Properties. We Secure your Future.</span>
          <Heart className="w-4 h-4 text-primary animate-pulse-subtle" />
        </p>
        <p className="text-xs mt-2 opacity-75">
          © {new Date().getFullYear()} Live-IN Properties. All rights reserved.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
