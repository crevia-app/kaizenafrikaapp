import { Link } from "react-router-dom";
import { Instagram, Youtube, Linkedin } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-background border-t border-border mt-12 md:mt-20">
      <div className="container mx-auto px-4 md:px-6 py-8 md:py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 mb-6 md:mb-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="flex items-center gap-2 mb-3 md:mb-4 cursor-pointer group"
            >
              <span className="font-vollkorn text-lg md:text-xl font-bold transition-colors duration-300 group-hover:text-bronze">Kaizen Afrika</span>
            </button>
            <p className="text-xs md:text-sm text-muted-foreground mb-3 md:mb-4">
              Progress, Every Day
            </p>
            <div className="flex gap-2 md:gap-3">
              <a href="https://www.instagram.com/kaizenafrika" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center hover:bg-bronze hover:text-white transition-colors">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="https://www.youtube.com/@kaizenafrika" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center hover:bg-bronze hover:text-white transition-colors">
                <Youtube className="w-5 h-5" />
              </a>
              <a href="https://www.tiktok.com/@kaizenafrika" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center hover:bg-bronze hover:text-white transition-colors">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
                </svg>
              </a>
              <a href="https://www.linkedin.com/company/kaizenafrika/" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center hover:bg-bronze hover:text-white transition-colors">
                <Linkedin className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-poppins font-semibold text-sm md:text-base mb-3 md:mb-4">Quick Links</h4>
            <ul className="space-y-1.5 md:space-y-2">
              <li><Link to="/" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="text-sm text-muted-foreground hover:text-bronze transition-colors">Home</Link></li>
              <li><Link to="/pricing" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="text-sm text-muted-foreground hover:text-bronze transition-colors">Pricing</Link></li>
              <li><Link to="/about" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="text-sm text-muted-foreground hover:text-bronze transition-colors">About</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-poppins font-semibold text-sm md:text-base mb-3 md:mb-4">Legal</h4>
            <ul className="space-y-1.5 md:space-y-2">
              <li><Link to="/terms-of-service" className="text-sm text-muted-foreground hover:text-bronze transition-colors">Terms</Link></li>
              <li><Link to="/privacy-policy" className="text-sm text-muted-foreground hover:text-bronze transition-colors">Privacy</Link></li>
              <li><Link to="/cookie-policy" className="text-sm text-muted-foreground hover:text-bronze transition-colors">Cookies</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div className="col-span-2 md:col-span-1">
            <h4 className="font-poppins font-semibold text-sm md:text-base mb-3 md:mb-4">Contact</h4>
            <ul className="space-y-1.5 md:space-y-2">
              <li><a href="mailto:hi@kaizenafrika.app" className="text-sm text-muted-foreground hover:text-bronze transition-colors">hi@kaizenafrika.app</a></li>
              <li><a href="tel:+254795284028" className="text-sm text-muted-foreground hover:text-bronze transition-colors">+2547-95-28-40-28</a></li>
            </ul>
          </div>
        </div>

        <div className="pt-6 md:pt-8 border-t border-border text-center">
          <p className="text-xs md:text-sm text-muted-foreground">
            © 2026 Kaizen Afrika • All rights reserved
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
