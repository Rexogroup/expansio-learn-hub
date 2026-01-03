import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { AgencyDirectory } from "@/components/affiliate-portal/AgencyDirectory";
import { MyAgencyProfile } from "@/components/affiliate-portal/MyAgencyProfile";
import { ConnectionsList } from "@/components/affiliate-portal/ConnectionsList";
import { MessagesInbox } from "@/components/affiliate-portal/MessagesInbox";
import { Users, User, Link2, MessageSquare } from "lucide-react";

const AffiliatePortal = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingConnections, setPendingConnections] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const activeTab = searchParams.get("tab") || "directory";

  useEffect(() => {
    const checkAuthAndAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      // Check admin role
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (!roleData) {
        navigate("/dashboard");
        return;
      }

      setIsAdmin(true);
      setUserId(user.id);
      setLoading(false);
      fetchUnreadCount(user.id);
      fetchPendingConnections(user.id);
    };
    checkAuthAndAdmin();
  }, [navigate]);

  useEffect(() => {
    if (!userId) return;

    // Subscribe to new messages for unread count
    const messagesChannel = supabase
      .channel('unread-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages'
        },
        () => fetchUnreadCount(userId)
      )
      .subscribe();

    // Subscribe to connection changes
    const connectionsChannel = supabase
      .channel('connection-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'connections'
        },
        () => fetchPendingConnections(userId)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(connectionsChannel);
    };
  }, [userId]);

  const fetchUnreadCount = async (uid: string) => {
    const { data: participations } = await supabase
      .from("conversation_participants")
      .select("conversation_id, last_read_at")
      .eq("user_id", uid);

    if (!participations?.length) {
      setUnreadCount(0);
      return;
    }

    let total = 0;
    for (const p of participations) {
      const { count } = await supabase
        .from("direct_messages")
        .select("*", { count: "exact", head: true })
        .eq("conversation_id", p.conversation_id)
        .neq("sender_id", uid)
        .gt("created_at", p.last_read_at || "1970-01-01");
      
      total += count || 0;
    }
    setUnreadCount(total);
  };

  const fetchPendingConnections = async (uid: string) => {
    const { count } = await supabase
      .from("connections")
      .select("*", { count: "exact", head: true })
      .eq("recipient_id", uid)
      .eq("status", "pending");
    
    setPendingConnections(count || 0);
  };

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Network</h1>
        <p className="text-muted-foreground mt-1">
          Connect with agencies, collaborate on deals, and grow together
        </p>
      </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-[500px]">
            <TabsTrigger value="directory" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Directory</span>
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">My Profile</span>
            </TabsTrigger>
            <TabsTrigger value="connections" className="flex items-center gap-2 relative">
              <Link2 className="w-4 h-4" />
              <span className="hidden sm:inline">Connections</span>
              {pendingConnections > 0 && (
                <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {pendingConnections}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="messages" className="flex items-center gap-2 relative">
              <MessageSquare className="w-4 h-4" />
              <span className="hidden sm:inline">Messages</span>
              {unreadCount > 0 && (
                <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {unreadCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="directory">
            <AgencyDirectory />
          </TabsContent>

          <TabsContent value="profile">
            <MyAgencyProfile />
          </TabsContent>

          <TabsContent value="connections">
            <ConnectionsList />
          </TabsContent>

          <TabsContent value="messages">
            <MessagesInbox onUnreadChange={setUnreadCount} />
          </TabsContent>
        </Tabs>
    </main>
  );
};

export default AffiliatePortal;
