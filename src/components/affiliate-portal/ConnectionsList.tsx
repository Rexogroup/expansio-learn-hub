import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { ConnectionRequestCard } from "./ConnectionRequestCard";
import { ConnectedAgencyCard } from "./ConnectedAgencyCard";
import { UserPlus, Users, Clock } from "lucide-react";

interface Connection {
  id: string;
  requester_id: string;
  recipient_id: string;
  status: "pending" | "accepted" | "declined";
  intro_message: string | null;
  created_at: string;
  connected_at: string | null;
  requester?: {
    id: string;
    full_name: string | null;
    email: string;
    agency?: {
      id: string;
      agency_name: string;
      logo_url: string | null;
      tagline: string | null;
    };
  };
  recipient?: {
    id: string;
    full_name: string | null;
    email: string;
    agency?: {
      id: string;
      agency_name: string;
      logo_url: string | null;
      tagline: string | null;
    };
  };
}

export const ConnectionsList = () => {
  const [pendingIncoming, setPendingIncoming] = useState<Connection[]>([]);
  const [pendingOutgoing, setPendingOutgoing] = useState<Connection[]>([]);
  const [connected, setConnected] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        await fetchConnections(user.id);
      }
    };
    init();
  }, []);

  const fetchConnections = async (uid: string) => {
    // Fetch all connections where user is involved
    const { data: connectionsData } = await supabase
      .from("connections")
      .select("*")
      .or(`requester_id.eq.${uid},recipient_id.eq.${uid}`);

    if (!connectionsData) {
      setLoading(false);
      return;
    }

    // Get unique user IDs
    const userIds = new Set<string>();
    connectionsData.forEach(c => {
      userIds.add(c.requester_id);
      userIds.add(c.recipient_id);
    });

    // Fetch profiles with agency info
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", Array.from(userIds));

    const { data: agencies } = await supabase
      .from("agency_profiles")
      .select("id, user_id, agency_name, logo_url, tagline")
      .in("user_id", Array.from(userIds));

    // Map profiles and agencies to connections
    const enrichedConnections = connectionsData.map(conn => {
      const requesterProfile = profiles?.find(p => p.id === conn.requester_id);
      const recipientProfile = profiles?.find(p => p.id === conn.recipient_id);
      const requesterAgency = agencies?.find(a => a.user_id === conn.requester_id);
      const recipientAgency = agencies?.find(a => a.user_id === conn.recipient_id);

      return {
        ...conn,
        requester: requesterProfile ? {
          ...requesterProfile,
          agency: requesterAgency ? {
            id: requesterAgency.id,
            agency_name: requesterAgency.agency_name,
            logo_url: requesterAgency.logo_url,
            tagline: requesterAgency.tagline,
          } : undefined,
        } : undefined,
        recipient: recipientProfile ? {
          ...recipientProfile,
          agency: recipientAgency ? {
            id: recipientAgency.id,
            agency_name: recipientAgency.agency_name,
            logo_url: recipientAgency.logo_url,
            tagline: recipientAgency.tagline,
          } : undefined,
        } : undefined,
      };
    }) as Connection[];

    // Split by status and direction
    const incoming = enrichedConnections.filter(
      c => c.recipient_id === uid && c.status === "pending"
    );
    const outgoing = enrichedConnections.filter(
      c => c.requester_id === uid && c.status === "pending"
    );
    const accepted = enrichedConnections.filter(c => c.status === "accepted");

    setPendingIncoming(incoming);
    setPendingOutgoing(outgoing);
    setConnected(accepted);
    setLoading(false);
  };

  const handleConnectionUpdate = () => {
    if (userId) {
      fetchConnections(userId);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-24 bg-muted animate-pulse rounded-lg" />
        <div className="h-24 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="incoming">
        <TabsList>
          <TabsTrigger value="incoming" className="gap-2">
            <UserPlus className="w-4 h-4" />
            Requests ({pendingIncoming.length})
          </TabsTrigger>
          <TabsTrigger value="pending" className="gap-2">
            <Clock className="w-4 h-4" />
            Pending ({pendingOutgoing.length})
          </TabsTrigger>
          <TabsTrigger value="connected" className="gap-2">
            <Users className="w-4 h-4" />
            Connected ({connected.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="incoming" className="mt-6">
          {pendingIncoming.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No pending connection requests
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {pendingIncoming.map((conn) => (
                <ConnectionRequestCard
                  key={conn.id}
                  connection={conn}
                  type="incoming"
                  onUpdate={handleConnectionUpdate}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="pending" className="mt-6">
          {pendingOutgoing.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No pending requests sent
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {pendingOutgoing.map((conn) => (
                <ConnectionRequestCard
                  key={conn.id}
                  connection={conn}
                  type="outgoing"
                  onUpdate={handleConnectionUpdate}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="connected" className="mt-6">
          {connected.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No connections yet. Browse the directory to connect with other agencies!
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {connected.map((conn) => (
                <ConnectedAgencyCard
                  key={conn.id}
                  connection={conn}
                  currentUserId={userId!}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
