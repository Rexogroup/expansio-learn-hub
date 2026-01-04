import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Target,
  TrendingUp,
  Mail,
  Phone,
  Users,
  MailCheck,
  GraduationCap,
  Network,
  Settings,
  LogOut,
  ChevronUp,
  Plug,
  MailPlus,
} from "lucide-react";

const mainNavItems = [
  { title: "Expansio Copilot", url: "/copilot", icon: Target },
  { title: "Campaigns", url: "/dashboard", icon: TrendingUp },
  { title: "Master Inbox", url: "/inbox", icon: Mail },
  { title: "Sales Coach", url: "/sales-coach", icon: Phone },
  { title: "SDR", url: "/crm", icon: Users },
  { title: "Cold Email CRM", url: "/cold-email-crm", icon: MailPlus },
  { title: "Email Accounts", url: "/email-accounts", icon: MailCheck },
  { title: "Integrations", url: "/integrations", icon: Plug },
  { title: "Expansio Accelerator", url: "/courses", icon: GraduationCap },
];

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [alertCount, setAlertCount] = useState(0);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        checkAdminStatus(session.user.id);
        fetchPendingRequests(session.user.id);
        fetchAlertCount(session.user.id);
      }
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      if (session?.user) {
        checkAdminStatus(session.user.id);
        fetchPendingRequests(session.user.id);
        fetchAlertCount(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAdminStatus = async (userId: string) => {
    const { data } = await supabase.rpc('has_role', {
      _user_id: userId,
      _role: 'admin'
    });
    setIsAdmin(!!data);
  };

  const fetchPendingRequests = async (userId: string) => {
    const { count } = await supabase
      .from('connections')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', userId)
      .eq('status', 'pending');
    setPendingRequests(count || 0);
  };

  const fetchAlertCount = async (userId: string) => {
    const { count } = await supabase
      .from('email_account_alerts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'active');
    
    const { count: atRiskCount } = await supabase
      .from('email_account_health')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_at_risk', true);
    
    setAlertCount((count || 0) + (atRiskCount || 0));
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const isActive = (url: string) => {
    if (url === "/dashboard") {
      return location.pathname === "/dashboard";
    }
    return location.pathname.startsWith(url);
  };

  const getUserInitials = () => {
    if (!user?.email) return "U";
    return user.email.charAt(0).toUpperCase();
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to="/dashboard" className="flex items-center gap-2">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Target className="size-4" />
                </div>
                {!collapsed && (
                  <div className="flex flex-col gap-0.5 leading-none">
                    <span className="font-semibold">Expansio</span>
                    <span className="text-xs text-muted-foreground">Growth OS</span>
                  </div>
                )}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                  >
                    <Link to={item.url} className="flex items-center gap-2">
                      <item.icon className="size-4" />
                      <span>{item.title}</span>
                      {item.url === "/email-accounts" && alertCount > 0 && (
                        <Badge variant="destructive" className="ml-auto h-5 w-5 p-0 flex items-center justify-center text-xs">
                          {alertCount}
                        </Badge>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={isActive("/network")}
                  tooltip="Network"
                >
                  <Link to="/network" className="flex items-center gap-2">
                    <Network className="size-4" />
                    <span>Network</span>
                    {pendingRequests > 0 && (
                      <Badge variant="secondary" className="ml-auto h-5 w-5 p-0 flex items-center justify-center text-xs">
                        {pendingRequests}
                      </Badge>
                    )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {isAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive("/admin")}
                    tooltip="Admin"
                  >
                    <Link to="/admin" className="flex items-center gap-2">
                      <Settings className="size-4" />
                      <span>Admin</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                  {!collapsed && (
                    <>
                      <div className="flex flex-col gap-0.5 leading-none flex-1 text-left">
                        <span className="truncate text-sm">{user?.email}</span>
                      </div>
                      <ChevronUp className="ml-auto size-4" />
                    </>
                  )}
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56"
                side="top"
                align="start"
                sideOffset={4}
              >
              <DropdownMenuItem asChild>
                  <Link to="/network" className="flex items-center gap-2 cursor-pointer">
                    <Network className="size-4" />
                    Network
                    {pendingRequests > 0 && (
                      <Badge variant="secondary" className="ml-auto">{pendingRequests}</Badge>
                    )}
                  </Link>
                </DropdownMenuItem>
                {isAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/admin" className="flex items-center gap-2 cursor-pointer">
                        <Settings className="size-4" />
                        Admin Panel
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="flex items-center gap-2 cursor-pointer text-destructive">
                  <LogOut className="size-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
