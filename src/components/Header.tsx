import { Link } from "react-router-dom";
import { Button } from "./ui/button";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ChevronDown, User, CreditCard, Bell, Shield, Settings, HelpCircle, MessageSquare, LogOut, Link2, LayoutDashboard, Menu, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NavThemeSwitcher } from "@/components/NavThemeSwitcher";

const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session);
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <header className="sticky top-0 w-full bg-background/95 backdrop-blur-md z-50 border-b border-border/50 animate-fade-in supports-[backdrop-filter]:bg-background/60 safe-area-pt safe-area-pl safe-area-pr">
      <nav className="container mx-auto px-3 md:px-6 py-3 flex items-center justify-between max-w-7xl">
        <Link to="/" className="flex items-center gap-2 group">
          <span className="font-vollkorn text-xl md:text-2xl font-bold transition-colors duration-300 group-hover:text-bronze">Kaizen Afrika</span>

        </Link>
        
        <div className="hidden lg:flex items-center gap-10 xl:gap-14">
          <Link to="/" className="text-sm font-medium hover:text-bronze transition-all duration-300 bronze-underline">
            Home
          </Link>

          <Link to="/pricing" className="text-sm font-medium hover:text-bronze transition-all duration-300 bronze-underline">
            Pricing
          </Link>

          <Link to="/about" className="text-sm font-medium hover:text-bronze transition-all duration-300 bronze-underline">
            About
          </Link>
        </div>

        {/* Mobile Menu & User Actions */}
        <div className="flex items-center gap-2 md:gap-3">
          {/* Desktop Theme Switcher */}
          <div className="hidden lg:flex items-center">
            <NavThemeSwitcher />
          </div>

          {/* Mobile Theme Switcher — beside the hamburger */}
          <div className="flex lg:hidden items-center">
            <NavThemeSwitcher />
          </div>

          {/* Mobile Menu */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild className="lg:hidden">
              <Button variant="ghost" className="!h-14 !w-14 p-0 flex items-center justify-center">
                <Menu className="!h-8 !w-8" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] sm:w-[320px] bg-background pt-[max(env(safe-area-inset-top,0px),1.5rem)]">
              <nav className="flex flex-col gap-6 mt-8">
                <Link
                  to="/"
                  className="text-base font-medium hover:text-bronze transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Home
                </Link>

                <Link
                  to="/pricing"
                  className="text-base font-medium hover:text-bronze transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Pricing
                </Link>
                
                <Link 
                  to="/about" 
                  className="text-base font-medium hover:text-bronze transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  About
                </Link>

                {!isLoggedIn && (
                  <div className="flex flex-col gap-3 pt-4 border-t border-border">
                    <Link to="/auth" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="outline" className="w-full font-poppins font-semibold">
                        Log In
                      </Button>
                    </Link>
                    <Link to="/auth?mode=signup" onClick={() => setMobileMenuOpen(false)}>
                      <Button className="w-full bg-bronze hover:bg-bronze-dark font-poppins font-semibold">
                        Get Started
                      </Button>
                    </Link>
                  </div>
                )}
              </nav>
            </SheetContent>
          </Sheet>

          {/* Desktop User Actions (Unauthenticated Only) */}
          {!isLoggedIn && (
            <div className="hidden lg:flex items-center gap-2 xl:gap-3">
              <Link to="/auth">
                <Button variant="ghost" size="sm" className="font-poppins font-semibold transition-all duration-300 hover-scale text-sm">
                  Log In
                </Button>
              </Link>
              <Link to="/auth?mode=signup">
                <Button size="sm" className="bg-bronze hover:bg-bronze-dark font-poppins font-semibold transition-all duration-300 hover-lift hover-glow text-sm">
                  Get Started
                </Button>
              </Link>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
};

export default Header;
