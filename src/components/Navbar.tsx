import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { BookOpen, LogOut, LayoutDashboard, User as UserIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Navbar = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEditor, setIsEditor] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const isActiveRoute = (path: string) => {
    if (path === "/courses") {
      return location.pathname === "/courses" || location.pathname.startsWith("/course/");
    }
    if (path === "/sales-vault") {
      return location.pathname === "/sales-vault" || location.pathname.startsWith("/sales-call/");
    }
    if (path === "/onboarding") {
      return location.pathname === "/onboarding" || location.pathname.startsWith("/onboarding/");
    }
    if (path === "/script-builder") {
      return location.pathname === "/script-builder";
    }
    return location.pathname === path;
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkAdminStatus(session.user.id);
        checkEditorStatus(session.user.id);
        checkOnboardingStatus(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkAdminStatus(session.user.id);
        checkEditorStatus(session.user.id);
        checkOnboardingStatus(session.user.id);
      } else {
        setIsAdmin(false);
        setIsEditor(false);
        setOnboardingComplete(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAdminStatus = async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    
    setIsAdmin(!!data);
  };

  const checkEditorStatus = async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "editor" as any)
      .maybeSingle();
    
    setIsEditor(!!data);
  };

  const checkOnboardingStatus = async (userId: string) => {
    const { data } = await supabase
      .from("user_onboarding_progress")
      .select("completed")
      .eq("user_id", userId);
    
    const allCompleted = data?.length === 4 && data.every(p => p.completed);
    setOnboardingComplete(allCompleted);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <nav className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-xl font-bold">
          <BookOpen className="w-6 h-6 text-primary" />
          <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            LearnHub
          </span>
        </Link>

        <div className="flex items-center gap-4">
          {user ? (
            <>
              <Link to="/onboarding" aria-current={isActiveRoute("/onboarding") ? "page" : undefined}>
                <Button variant={isActiveRoute("/onboarding") ? "default" : "ghost"}>
                  Onboarding
                </Button>
              </Link>
              <Link to="/courses" aria-current={isActiveRoute("/courses") ? "page" : undefined}>
                <Button variant={isActiveRoute("/courses") ? "default" : "ghost"}>Courses</Button>
              </Link>
              <Link to="/sales-vault" aria-current={isActiveRoute("/sales-vault") ? "page" : undefined}>
                <Button variant={isActiveRoute("/sales-vault") ? "default" : "ghost"}>Sales Vault</Button>
              </Link>
              <Link to="/tools" aria-current={isActiveRoute("/tools") ? "page" : undefined}>
                <Button variant={isActiveRoute("/tools") ? "default" : "ghost"}>Tools</Button>
              </Link>
              {isAdmin && (
                <Link to="/script-builder" aria-current={isActiveRoute("/script-builder") ? "page" : undefined}>
                  <Button variant={isActiveRoute("/script-builder") ? "default" : "ghost"}>Script Builder</Button>
                </Link>
              )}
              {(isAdmin || isEditor) && (
                <Link to="/project-management" aria-current={isActiveRoute("/project-management") ? "page" : undefined}>
                  <Button variant={isActiveRoute("/project-management") ? "default" : "ghost"}>
                    Projects
                  </Button>
                </Link>
              )}
              {isAdmin && (
                <Link to="/admin" aria-current={isActiveRoute("/admin") ? "page" : undefined}>
                  <Button variant={isActiveRoute("/admin") ? "default" : "ghost"}>
                    <LayoutDashboard className="w-4 h-4 mr-2" />
                    Admin
                  </Button>
                </Link>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <UserIcon className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Link to="/">
              <Button>Sign In</Button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};
