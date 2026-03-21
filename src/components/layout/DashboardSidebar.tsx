import { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Droplets,
  Activity,
  Thermometer,
  Apple,
  Stethoscope,
  FileText,
  MessageCircle,
  User,
  LogOut,
  Shield,
  Users,
  BookOpen,
  ChevronRight,
} from "lucide-react";
import logoImg from "@/assets/logo.png";

// User navigation items
const userNavItems = [
  { title: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { title: "Menstrual Health", path: "/modules/menstrual", icon: Droplets },
  { title: "PCOS Prediction", path: "/modules/pcos", icon: Activity },
  { title: "Menopause", path: "/modules/menopause", icon: Thermometer },
  { title: "Diet & Exercise", path: "/education", icon: Apple },
  { title: "Nearby Doctors", path: "/doctors", icon: Stethoscope },
  { title: "Health Resources", path: "/health-resources", icon: BookOpen },
  { title: "Govt. Schemes", path: "/schemes", icon: FileText },
  
  { title: "Medical Reports", path: "/dashboard/documents", icon: FileText },
  { title: "AI Chatbot", path: "/chatbot", icon: MessageCircle },
  { title: "My Profile", path: "/profile", icon: User },
];

// Admin navigation items
const adminNavItems = [
  { title: "Admin Dashboard", path: "/admin", icon: LayoutDashboard },
  { title: "Manage Users", path: "/admin/users", icon: Users },
  { title: "Health Resources", path: "/admin/resources", icon: BookOpen },
  { title: "Govt. Schemes", path: "/admin/schemes", icon: FileText },
  { title: "Manage Doctors", path: "/admin/doctors", icon: Stethoscope },
];

export const DashboardSidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  const isActive = (path: string) => {
    if (path === "/dashboard" || path === "/admin") {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <aside
      className={cn(
        "hidden md:flex sticky top-0 left-0 h-screen bg-sidebar border-r border-sidebar-border flex-col transition-all duration-300",
        isCollapsed ? "w-[72px]" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="p-4 border-b border-sidebar-border">
        <NavLink to="/" className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center flex-shrink-0 shadow-sm">
            <Heart className="w-5 h-5 text-primary-foreground fill-current" />
          </div>
          {!isCollapsed && (
            <span className="font-heading font-bold text-lg text-sidebar-foreground">
              Naari<span className="text-accent">Care</span>
            </span>
          )}
        </NavLink>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
        {/* User Section */}
        <div className="mb-4">
          {!isCollapsed && (
            <p className="text-2xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-3">
              Menu
            </p>
          )}
          <nav className="space-y-0.5">
            {userNavItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                title={isCollapsed ? item.title : undefined}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group",
                  isCollapsed && "justify-center px-0",
                  isActive(item.path)
                    ? "bg-primary/10 text-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className={cn(
                  "w-5 h-5 flex-shrink-0 transition-colors duration-200",
                  isActive(item.path) ? "text-primary" : "group-hover:text-primary"
                )} />
                {!isCollapsed && (
                  <>
                    <span className="flex-1 truncate">{item.title}</span>
                    {isActive(item.path) && (
                      <ChevronRight className="w-4 h-4 text-primary" />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Admin Section - Only visible to admins */}
        {isAdmin && (
          <div className="mb-4 pt-3 border-t border-sidebar-border">
            {!isCollapsed && (
              <p className="text-2xs font-semibold text-destructive uppercase tracking-wider mb-2 px-3 flex items-center gap-1.5">
                <Shield className="w-3 h-3" />
                Admin
              </p>
            )}
            <nav className="space-y-0.5">
              {adminNavItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === "/admin"}
                  title={isCollapsed ? item.title : undefined}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group",
                    isCollapsed && "justify-center px-0",
                    isActive(item.path)
                      ? "bg-destructive/10 text-destructive"
                      : "text-muted-foreground hover:bg-destructive/5 hover:text-destructive"
                  )}
                >
                  <item.icon className={cn(
                    "w-5 h-5 flex-shrink-0 transition-colors duration-200",
                    isActive(item.path) ? "text-destructive" : "group-hover:text-destructive"
                  )} />
                  {!isCollapsed && (
                    <>
                      <span className="flex-1 truncate">{item.title}</span>
                      {isActive(item.path) && (
                        <ChevronRight className="w-4 h-4 text-destructive" />
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </nav>
          </div>
        )}
      </div>

      {/* User Info & Logout */}
      <div className="p-3 border-t border-sidebar-border">
        {!isCollapsed ? (
          <>
            <div className="flex items-center gap-2.5 mb-3 p-2 rounded-lg bg-muted/50">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-primary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {user?.user_metadata?.full_name || "User"}
                </p>
                <p className="text-2xs text-muted-foreground truncate">
                  {user?.email}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start gap-2.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-9"
              onClick={handleSignOut}
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm">Sign out</span>
            </Button>
          </>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            title="Sign out"
            className="w-full text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            onClick={handleSignOut}
          >
            <LogOut className="w-5 h-5" />
          </Button>
        )}
      </div>
    </aside>
  );
};