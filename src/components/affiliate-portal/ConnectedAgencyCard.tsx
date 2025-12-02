import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Briefcase, MessageSquare, ExternalLink } from "lucide-react";
import { StartConversationDialog } from "./StartConversationDialog";

interface Connection {
  id: string;
  requester_id: string;
  recipient_id: string;
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

interface ConnectedAgencyCardProps {
  connection: Connection;
  currentUserId: string;
}

export const ConnectedAgencyCard = ({ connection, currentUserId }: ConnectedAgencyCardProps) => {
  const navigate = useNavigate();
  const [showMessageDialog, setShowMessageDialog] = useState(false);

  const otherUser = connection.requester_id === currentUserId 
    ? connection.recipient 
    : connection.requester;
  const agency = otherUser?.agency;

  return (
    <>
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
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
              <h4 
                className="font-semibold truncate cursor-pointer hover:text-primary transition-colors"
                onClick={() => agency && navigate(`/agency/${agency.id}`)}
              >
                {agency?.agency_name || otherUser?.full_name || otherUser?.email}
              </h4>
              {agency?.tagline && (
                <p className="text-sm text-muted-foreground truncate">{agency.tagline}</p>
              )}
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <Button
              className="flex-1 gap-2"
              onClick={() => setShowMessageDialog(true)}
            >
              <MessageSquare className="w-4 h-4" />
              Message
            </Button>
            {agency && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigate(`/agency/${agency.id}`)}
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {otherUser && (
        <StartConversationDialog
          open={showMessageDialog}
          onOpenChange={setShowMessageDialog}
          recipientUserId={otherUser.id}
          recipientName={agency?.agency_name || otherUser.full_name || otherUser.email}
        />
      )}
    </>
  );
};
