import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuLink,
  navigationMenuTriggerStyle
} from "@/components/ui/navigation-menu";
import { cn } from "@/lib/utils";
import { Toaster } from "sonner";

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-color-cream">
      {/* Header with Navigation */}
      <div className="navbar flex flex-row justify-between bg-primary px-7 pt-3 lg:pt-5 overflow-hidden pl-12">
        <div className="items-center min-h-[40px] touch-manipulation">
          <button className="flex p-2 min-w-[48px] min-h-[48px] xl:hidden">
            <div className="">
              <div className="rounded-full w-full h-full">
                <img 
                  alt="Logo" 
                  loading="lazy" 
                  width="80" 
                  height="80" 
                  decoding="async" 
                  className="w-[80px] h-[80px]" 
                  style={{color: 'transparent'}} 
                  src="/lawbandit-logo-yellow.svg" 
                />
              </div>
            </div>
          </button>
          <button className="flex text-xl relative cursor-pointer hidden xl:flex -ml-2">
            <div className="rounded-full">
              <img 
                alt="Logo" 
                loading="lazy" 
                width="80" 
                height="80" 
                decoding="async" 
                className="w-[80px] h-[80px]" 
                style={{color: 'transparent'}} 
                src="/lawbandit-logo-yellow.svg" 
              />
            </div>
          </button>
        </div>

        {/* Center - Navigation Menu */}
        <NavigationMenu>
          <NavigationMenuList className="gap-6">
            <NavigationMenuItem>
              <NavigationMenuLink
                asChild
                className={cn(
                  navigationMenuTriggerStyle(),
                  location.pathname === '/' && "bg-accent text-accent-foreground"
                )}
              >
                <Link to="/">Extract Syllabus</Link>
              </NavigationMenuLink>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuLink
                asChild
                className={cn(
                  navigationMenuTriggerStyle(),
                  location.pathname === '/interpreter' && "bg-accent text-accent-foreground"
                )}
              >
                <Link to="/interpreter">Interpreter</Link>
              </NavigationMenuLink>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuLink
                asChild
                className={cn(
                  navigationMenuTriggerStyle(),
                  location.pathname === '/pdf-viewer' && "bg-accent text-accent-foreground"
                )}
              >
                <Link to="/pdf-viewer">PDF Viewer</Link>
              </NavigationMenuLink>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuLink
                asChild
                className={cn(
                  navigationMenuTriggerStyle(),
                  location.pathname === '/flowchart' && "bg-accent text-accent-foreground"
                )}
              >
                <Link to="/flowchart">Flowchart Generator</Link>
              </NavigationMenuLink>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>

        {/* Right side - navbar-end */}
        <div className="navbar-end overflow-hidden">
          <div className="ml-auto flex items-center">
            {/* Empty for now to maintain balance */}
            <div className="w-24"></div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      {children}
      
      {/* Toast Notifications - Available on all routes */}
      <Toaster position="bottom-right" richColors />
    </div>
  );
};

export default Layout;
