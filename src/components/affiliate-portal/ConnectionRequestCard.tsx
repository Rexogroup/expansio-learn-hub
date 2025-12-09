import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Check, X, Briefcase, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Connection {
  id: string;
  requester_id: string;
  recipient_id: string;
  status: "pending" | "accepted" | "declined";
  intro_message: string | null;
  created_at: string;
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

interface ConnectionRequestCardProps {
  connection: Connection;
  type: "incoming" | "outgoing";
  onUpdate: () => void;
}

export const ConnectionRequestCard = ({ connection, type, onUpdate }: ConnectionRequestCardProps) => {
  const navigate = useNavigate();
  const [processing, setProcessing] = useState(false);

  const otherUser = type === "incoming" ? connection.requester : connection.recipient;
  const agency = otherUser?.agency;

  const handleAccept = async () => {
    setProcessing(true);
    const { error } = await supabase
      .from("connections")
      .update({ status: "accepted", connected_at: new Date().toISOString() })
      .eq("id", connection.id);

    if (error) {
      toast.error("Failed to accept connection");
    } else {
      toast.success("Connection accepted!");
      onUpdate();

      // Send email notification to the requester
      const { data: { user } } = await supabase.auth.getUser();
      if (user && connection.requester) {
        const { data: acceptorProfile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .single();

        const { data: acceptorAgency } = await supabase
          .from("agency_profiles")
          .select("agency_name")
          .eq("user_id", user.id)
          .maybeSingle();

        supabase.functions.invoke("send-notification-email", {
          body: {
            type: "connection_accepted",
            recipientUserId: connection.requester_id,
            senderName: acceptorProfile?.full_name || user.email,
            senderAgencyName: acceptorAgency?.agency_name,
          },
        }).catch(console.error);
      }
    }
    setProcessing(false);
  };

  const handleDecline = async () => {
    setProcessing(true);
    const { error } = await supabase
      .from("connections")
      .update({ status: "declined" })
      .eq("id", connection.id);

    if (error) {
      toast.error("Failed to decline connection");
    } else {
      toast.success("Connection declined");
      onUpdate();
    }
    setProcessing(false);
  };

  const handleCancel = async () => {
    setProcessing(true);
    const { error } = await supabase
      .from("connections")
      .delete()
      .eq("id", connection.id);

    if (error) {
      toast.error("Failed to cancel request");
    } else {
      toast.success("Request cancelled");
      onUpdate();
    }
    setProcessing(false);
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <div 
            className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden cursor-pointer"
            onClick={() => agency && navigate(`/agency/${agency.id}`)}
          >
            {agency?.logo_url ? (
              <img src={agency.logo_url} alt={agency.agency_name} className="w-full h-full object-cover" />
            ) : (
              <Briefcase className="w-5 h-5 text-muted-foreground" />
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 
                className="font-semibold truncate cursor-pointer hover:text-primary transition-colors"
                onClick={() => agency && navigate(`/agency/${agency.id}`)}
              >
                {agency?.agency_name || otherUser?.full_name || otherUser?.email}
              </h4>
              {type === "outgoing" && (
                <Badge variant="secondary" className="gap-1">
                  <Clock className="w-3 h-3" />
                  Pending
                </Badge>
              )}
            </div>
            {agency?.tagline && (
              <p className="text-sm text-muted-foreground truncate">{agency.tagline}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {type === "incoming" ? "Requested" : "Sent"} {formatDistanceToNow(new Date(connection.created_at), { addSuffix: true })}
            </p>
            
            {connection.intro_message && (
              <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                <p className="text-sm italic">"{connection.intro_message}"</p>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            {type === "incoming" ? (
              <>
                <Button
                  size="sm"
                  onClick={handleAccept}
                  disabled={processing}
                  className="gap-1"
                >
                  <Check className="w-4 h-4" />
                  Accept
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDecline}
                  disabled={processing}
                  className="gap-1"
                >
                  <X className="w-4 h-4" />
                  Decline
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={handleCancel}
                disabled={processing}
              >
                Cancel Request
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
