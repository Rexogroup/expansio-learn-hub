import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, CheckCircle, Users, Briefcase, MessageSquare } from "lucide-react";
import { useState } from "react";
import { StartConversationDialog } from "./StartConversationDialog";

interface AgencyService {
  category: {
    id: string;
    name: string;
  };
}

interface AgencyCardProps {
  agency: {
    id: string;
    user_id: string;
    agency_name: string;
    tagline: string | null;
    logo_url: string | null;
    location: string | null;
    open_to_collaborations: boolean;
    verified: boolean;
    services?: AgencyService[];
  };
}

export const AgencyCard = ({ agency }: AgencyCardProps) => {
  const navigate = useNavigate();
  const [showMessageDialog, setShowMessageDialog] = useState(false);

  const uniqueServices = agency.services?.reduce((acc: string[], s) => {
    if (s.category?.name && !acc.includes(s.category.name)) {
      acc.push(s.category.name);
    }
    return acc;
  }, []) || [];

  return (
    <>
      <Card className="group hover:shadow-lg transition-all duration-300 hover:border-primary/50 cursor-pointer overflow-hidden">
        <CardContent 
          className="pt-6"
          onClick={() => navigate(`/agency/${agency.id}`)}
        >
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
              {agency.logo_url ? (
                <img 
                  src={agency.logo_url} 
                  alt={agency.agency_name} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <Briefcase className="w-6 h-6 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold truncate">{agency.agency_name}</h3>
                {agency.verified && (
                  <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                )}
              </div>
              {agency.tagline && (
                <p className="text-sm text-muted-foreground line-clamp-2">{agency.tagline}</p>
              )}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {agency.open_to_collaborations && (
              <Badge variant="secondary" className="gap-1">
                <Users className="w-3 h-3" />
                Open to Collaborate
              </Badge>
            )}
            {agency.location && (
              <Badge variant="outline" className="gap-1">
                <MapPin className="w-3 h-3" />
                {agency.location}
              </Badge>
            )}
          </div>

          {uniqueServices.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1">
              {uniqueServices.slice(0, 3).map((service) => (
                <Badge key={service} variant="outline" className="text-xs">
                  {service}
                </Badge>
              ))}
              {uniqueServices.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{uniqueServices.length - 3} more
                </Badge>
              )}
            </div>
          )}
        </CardContent>

        <CardFooter className="pt-0">
          <Button 
            className="w-full gap-2"
            onClick={(e) => {
              e.stopPropagation();
              setShowMessageDialog(true);
            }}
          >
            <MessageSquare className="w-4 h-4" />
            Send Message
          </Button>
        </CardFooter>
      </Card>

      <StartConversationDialog
        open={showMessageDialog}
        onOpenChange={setShowMessageDialog}
        recipientUserId={agency.user_id}
        recipientName={agency.agency_name}
      />
    </>
  );
};
