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
  const [notifications, setNotifications] = useState<Record<string, boolean>>({
    inbox: false,
    emailAccounts: false,
    network: false,
    campaigns: false,
    integrations: false,
  });

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        checkAdminStatus(session.user.id);
        fetchAllNotifications(session.user.id);
      }
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      if (session?.user) {
        checkAdminStatus(session.user.id);
        fetchAllNotifications(session.user.id);
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

  const fetchAllNotifications = async (userId: string) => {
    const [inboxResult, emailAlertsResult, atRiskResult, networkResult, campaignsResult, integrationsResult] = await Promise.all([
      // Master Inbox: pending replies
      supabase
        .from('lead_replies')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'pending'),
      // Email Accounts: active alerts
      supabase
        .from('email_account_alerts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'active'),
      // Email Accounts: at-risk accounts
      supabase
        .from('email_account_health')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_at_risk', true),
      // Network: pending connection requests
      supabase
        .from('connections')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', userId)
        .eq('status', 'pending'),
      // Campaigns: no synced campaigns
      supabase
        .from('synced_campaigns')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId),
      // Integrations: no configured integrations
      supabase
        .from('user_integrations')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId),
    ]);

    setNotifications({
      inbox: (inboxResult.count || 0) > 0,
      emailAccounts: ((emailAlertsResult.count || 0) + (atRiskResult.count || 0)) > 0,
      network: (networkResult.count || 0) > 0,
      campaigns: (campaignsResult.count || 0) === 0,
      integrations: (integrationsResult.count || 0) === 0,
    });
  };

  const notificationMap: Record<string, string> = {
    "/inbox": "inbox",
    "/email-accounts": "emailAccounts",
    "/network": "network",
    "/dashboard": "campaigns",
    "/integrations": "integrations",
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
              {mainNavItems.map((item) => {
                const notifKey = notificationMap[item.url];
                const hasNotification = notifKey && notifications[notifKey];
                
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.url)}
                      tooltip={item.title}
                    >
                      <Link to={item.url} className="flex items-center gap-2">
                        <item.icon className="size-4" />
                        <span>{item.title}</span>
                        {hasNotification && (
                          <span className="ml-auto h-2.5 w-2.5 rounded-full bg-destructive" />
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
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
                    {notifications.network && (
                      <span className="ml-auto h-2.5 w-2.5 rounded-full bg-destructive" />
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
                    {notifications.network && (
                      <span className="ml-auto h-2 w-2 rounded-full bg-destructive" />
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
