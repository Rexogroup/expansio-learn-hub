import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { BookOpen, LogOut, LayoutDashboard, User as UserIcon, Home, Users, Settings, Target, Inbox } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

export const Navbar = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEditor, setIsEditor] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(true);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [pendingRequests, setPendingRequests] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

  const isActiveRoute = (path: string) => {
    if (path === "/dashboard") {
      return location.pathname === "/dashboard";
    }
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
    if (path === "/network") {
      return location.pathname === "/network" || location.pathname.startsWith("/agency/");
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
        fetchUnreadMessages(session.user.id);
        fetchPendingRequests(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkAdminStatus(session.user.id);
        checkEditorStatus(session.user.id);
        checkOnboardingStatus(session.user.id);
        fetchUnreadMessages(session.user.id);
        fetchPendingRequests(session.user.id);
      } else {
        setIsAdmin(false);
        setIsEditor(false);
        setOnboardingComplete(true);
        setUnreadMessages(0);
        setPendingRequests(0);
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

  const fetchUnreadMessages = async (userId: string) => {
    const { data: participations } = await supabase
      .from("conversation_participants")
      .select("conversation_id, last_read_at")
      .eq("user_id", userId);

    if (!participations?.length) {
      setUnreadMessages(0);
      return;
    }

    let total = 0;
    for (const p of participations) {
      const { count } = await supabase
        .from("direct_messages")
        .select("*", { count: "exact", head: true })
        .eq("conversation_id", p.conversation_id)
        .neq("sender_id", userId)
        .gt("created_at", p.last_read_at || "1970-01-01");
      
      total += count || 0;
    }
    setUnreadMessages(total);
  };

  const fetchPendingRequests = async (userId: string) => {
    const { count } = await supabase
      .from("connections")
      .select("*", { count: "exact", head: true })
      .eq("recipient_id", userId)
      .eq("status", "pending");
    
    setPendingRequests(count || 0);
  };

  // Subscribe to new messages for badge updates and toast notifications
  useEffect(() => {
    if (!user) return;

    const messagesChannel = supabase
      .channel('navbar-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages'
        },
        async (payload) => {
          const newMessage = payload.new as { sender_id: string; content: string; conversation_id: string };
          
          // Only notify if the message is from someone else
          if (newMessage.sender_id !== user.id) {
            // Fetch sender info for toast
            const { data: senderProfile } = await supabase
              .from("profiles")
              .select("full_name, email")
              .eq("id", newMessage.sender_id)
              .single();

            const senderName = senderProfile?.full_name || senderProfile?.email || "Someone";
            
            // Show toast only if not on the network page viewing that conversation
            if (!location.pathname.includes('/network')) {
              toast.info(`New message from ${senderName}`, {
                description: newMessage.content.substring(0, 50) + (newMessage.content.length > 50 ? "..." : ""),
                action: {
                  label: "View",
                  onClick: () => navigate("/network")
                }
              });
            }
            
            fetchUnreadMessages(user.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
    };
  }, [user, location.pathname, navigate]);

  // Subscribe to connection requests for badge updates and toast notifications
  useEffect(() => {
    if (!user) return;

    const connectionsChannel = supabase
      .channel('navbar-connections')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'connections'
        },
        async (payload) => {
          const newConnection = payload.new as { requester_id: string; recipient_id: string };
          
          // Only notify if we're the recipient of the request
          if (newConnection.recipient_id === user.id) {
            // Fetch requester info
            const { data: requesterProfile } = await supabase
              .from("profiles")
              .select("full_name, email")
              .eq("id", newConnection.requester_id)
              .single();

            const { data: requesterAgency } = await supabase
              .from("agency_profiles")
              .select("agency_name")
              .eq("user_id", newConnection.requester_id)
              .single();

            const requesterName = requesterAgency?.agency_name || requesterProfile?.full_name || "Someone";
            
            toast.info(`New connection request`, {
              description: `${requesterName} wants to connect with you`,
              action: {
                label: "View",
                onClick: () => navigate("/network")
              }
            });
            
            fetchPendingRequests(user.id);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'connections'
        },
        async (payload) => {
          const updatedConnection = payload.new as { requester_id: string; recipient_id: string; status: string };
          
          // Notify requester when their request is accepted
          if (updatedConnection.requester_id === user.id && updatedConnection.status === "accepted") {
            const { data: recipientProfile } = await supabase
              .from("profiles")
              .select("full_name, email")
              .eq("id", updatedConnection.recipient_id)
              .single();

            const { data: recipientAgency } = await supabase
              .from("agency_profiles")
              .select("agency_name")
              .eq("user_id", updatedConnection.recipient_id)
              .single();

            const recipientName = recipientAgency?.agency_name || recipientProfile?.full_name || "Someone";
            
            toast.success(`Connection accepted!`, {
              description: `${recipientName} accepted your connection request`,
              action: {
                label: "View",
                onClick: () => navigate("/network")
              }
            });
          }
          
          // Update pending count if we're the recipient
          if (updatedConnection.recipient_id === user.id) {
            fetchPendingRequests(user.id);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'connections'
        },
        () => {
          fetchPendingRequests(user.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(connectionsChannel);
    };
  }, [user, navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const totalNotifications = unreadMessages + pendingRequests;

  return (
    <nav className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-xl font-bold">
            <Target className="w-6 h-6 text-primary" />
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Growth OS
            </span>
          </Link>

        <div className="flex items-center gap-4">
          {user ? (
            <>
              <Link to="/dashboard" aria-current={isActiveRoute("/dashboard") ? "page" : undefined}>
                <Button variant={isActiveRoute("/dashboard") ? "default" : "ghost"}>
                  <Home className="w-4 h-4 mr-2" />
                  Command Center
                </Button>
              </Link>
              <Link to="/script-builder" aria-current={isActiveRoute("/script-builder") ? "page" : undefined}>
                <Button variant={isActiveRoute("/script-builder") ? "default" : "ghost"}>Script Builder</Button>
              </Link>
              <Link to="/integrations" aria-current={isActiveRoute("/integrations") ? "page" : undefined}>
                <Button variant={isActiveRoute("/integrations") ? "default" : "ghost"}>
                  <Settings className="w-4 h-4 mr-2" />
                  Integrations
                </Button>
              </Link>
              <Link to="/inbox" aria-current={isActiveRoute("/inbox") ? "page" : undefined}>
                <Button variant={isActiveRoute("/inbox") ? "default" : "ghost"}>
                  <Inbox className="w-4 h-4 mr-2" />
                  Inbox
                </Button>
              </Link>
              <Link to="/sales-vault" aria-current={isActiveRoute("/sales-vault") ? "page" : undefined}>
                <Button variant={isActiveRoute("/sales-vault") ? "default" : "ghost"}>Sales Vault</Button>
              </Link>
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