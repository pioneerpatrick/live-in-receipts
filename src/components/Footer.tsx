import { Heart } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CompanySettings {
  company_name: string;
  receipt_footer_message: string | null;
  company_tagline: string | null;
}

const Footer = () => {
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  
  useEffect(() => {
    const fetchSettings = async () => {
      const { data, error } = await supabase
        .from('company_settings')
        .select('company_name, receipt_footer_message, company_tagline')
        .maybeSingle();
      
      if (!error && data) {
        setSettings(data);
      }
    };
    
    fetchSettings();
  }, []);

  const companyName = settings?.company_name || 'Live-IN Properties';
  const footerMessage = settings?.receipt_footer_message || settings?.company_tagline || 'We Secure your Future.';

  return (
    <footer className="bg-secondary text-secondary-foreground py-4 sm:py-6 mt-auto">
      <div className="container mx-auto px-3 sm:px-4 text-center">
        <p className="flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm md:text-base flex-wrap">
          <Heart className="w-3 h-3 sm:w-4 sm:h-4 text-primary animate-pulse-subtle flex-shrink-0" />
          <span>{footerMessage}</span>
          <Heart className="w-3 h-3 sm:w-4 sm:h-4 text-primary animate-pulse-subtle flex-shrink-0" />
        </p>
        <p className="text-[10px] sm:text-xs mt-1.5 sm:mt-2 opacity-75">
          © {new Date().getFullYear()} {companyName}. All rights reserved.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
