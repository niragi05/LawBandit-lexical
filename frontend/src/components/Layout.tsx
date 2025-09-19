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

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-color-cream">
      {/* Header with Navigation */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            {/* Left side - App name only */}
            <div>
              <h1 className="text-2xl font-bold text-black">LawBandit</h1>
            </div>

            {/* Center - Navigation Menu */}
            <NavigationMenu>
              <NavigationMenuList>
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

            {/* Right side - Empty for now to maintain balance */}
            <div className="w-24"></div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      {children}
    </div>
  );
};

export default Layout;
