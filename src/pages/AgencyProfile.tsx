import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  ArrowLeft, 
  MapPin, 
  Globe, 
  CheckCircle, 
  MessageSquare,
  DollarSign,
  Users,
  Briefcase
} from "lucide-react";
import { StartConversationDialog } from "@/components/affiliate-portal/StartConversationDialog";

interface AgencyProfileData {
  id: string;
  user_id: string;
  agency_name: string;
  tagline: string | null;
  description: string | null;
  logo_url: string | null;
  banner_url: string | null;
  website_url: string | null;
  location: string | null;
  open_to_collaborations: boolean;
  affiliate_commission: string | null;
  whitelabel_pricing: string | null;
  minimum_project_value: string | null;
  verified: boolean;
  profile_views: number;
}

interface AgencyService {
  id: string;
  service_name: string | null;
  description: string | null;
  pricing_model: string | null;
  category: {
    name: string;
    icon: string | null;
  };
}

const AgencyProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [agency, setAgency] = useState<AgencyProfileData | null>(null);
  const [services, setServices] = useState<AgencyService[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }
      setCurrentUserId(user.id);
      await fetchAgencyProfile();
      if (user.id) {
        await checkConnectionStatus(user.id);
      }
    };
    init();
  }, [id, navigate]);

  const fetchAgencyProfile = async () => {
    if (!id) return;

    const { data: agencyData, error: agencyError } = await supabase
      .from("agency_profiles")
      .select("*")
      .eq("id", id)
      .single();

    if (agencyError || !agencyData) {
      toast.error("Agency not found");
      navigate("/network");
      return;
    }

    setAgency(agencyData);

    // Increment view count
    await supabase
      .from("agency_profiles")
      .update({ profile_views: (agencyData.profile_views || 0) + 1 })
      .eq("id", id);

    // Fetch services
    const { data: servicesData } = await supabase
      .from("agency_services")
      .select(`
        id,
        service_name,
        description,
        pricing_model,
        category:service_categories(name, icon)
      `)
      .eq("agency_id", id);

    setServices(servicesData as any || []);
    setLoading(false);
  };

  const checkConnectionStatus = async (userId: string) => {
    if (!agency) return;

    const { data } = await supabase
      .from("connections")
      .select("status")
      .or(`and(requester_id.eq.${userId},recipient_id.eq.${agency.user_id}),and(requester_id.eq.${agency.user_id},recipient_id.eq.${userId})`)
      .maybeSingle();

    setConnectionStatus(data?.status || null);
  };

  useEffect(() => {
    if (currentUserId && agency) {
      checkConnectionStatus(currentUserId);
    }
  }, [currentUserId, agency]);

  const isOwnProfile = currentUserId === agency?.user_id;

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-48 bg-muted rounded-lg" />
          <div className="h-8 w-64 bg-muted rounded" />
          <div className="h-4 w-96 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (!agency) return null;

  return (
    <main className="container mx-auto px-4 py-8">
      <Button
        variant="ghost"
        onClick={() => navigate("/network")}
        className="mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Directory
      </Button>

        {/* Banner & Logo */}
        <div className="relative mb-8">
          <div 
            className="h-48 rounded-lg bg-gradient-to-r from-primary/20 to-accent/20"
            style={agency.banner_url ? { backgroundImage: `url(${agency.banner_url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
          />
          <div className="absolute -bottom-12 left-8 flex items-end gap-4">
            <div className="w-24 h-24 rounded-xl bg-card border-4 border-background flex items-center justify-center overflow-hidden">
              {agency.logo_url ? (
                <img src={agency.logo_url} alt={agency.agency_name} className="w-full h-full object-cover" />
              ) : (
                <Briefcase className="w-10 h-10 text-muted-foreground" />
              )}
            </div>
          </div>
        </div>

        <div className="mt-16 grid gap-8 lg:grid-cols-3">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold">{agency.agency_name}</h1>
                {agency.verified && (
                  <Badge variant="secondary" className="gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Verified
                  </Badge>
                )}
                {agency.open_to_collaborations && (
                  <Badge variant="outline" className="gap-1">
                    <Users className="w-3 h-3" />
                    Open to Collaborate
                  </Badge>
                )}
              </div>
              {agency.tagline && (
                <p className="text-lg text-muted-foreground">{agency.tagline}</p>
              )}
              <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                {agency.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {agency.location}
                  </span>
                )}
                {agency.website_url && (
                  <a 
                    href={agency.website_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 hover:text-primary transition-colors"
                  >
                    <Globe className="w-4 h-4" />
                    Website
                  </a>
                )}
              </div>
            </div>

            {!isOwnProfile && (
              <Button 
                size="lg" 
                onClick={() => setShowMessageDialog(true)}
                className="gap-2"
              >
                <MessageSquare className="w-4 h-4" />
                Send Message
              </Button>
            )}

            {agency.description && (
              <Card>
                <CardHeader>
                  <CardTitle>About</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground whitespace-pre-wrap">{agency.description}</p>
                </CardContent>
              </Card>
            )}

            {services.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Services Offered</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {services.map((service) => (
                      <div key={service.id} className="p-4 rounded-lg border bg-muted/30">
                        <div className="font-medium">{service.category?.name || service.service_name}</div>
                        {service.description && (
                          <p className="text-sm text-muted-foreground mt-1">{service.description}</p>
                        )}
                        {service.pricing_model && (
                          <p className="text-xs text-muted-foreground mt-2">
                            Pricing: {service.pricing_model}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar - Collaboration Terms */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Collaboration Terms
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {agency.affiliate_commission && (
                  <div>
                    <div className="text-sm font-medium">Affiliate Commission</div>
                    <div className="text-muted-foreground">{agency.affiliate_commission}</div>
                  </div>
                )}
                {agency.whitelabel_pricing && (
                  <div>
                    <div className="text-sm font-medium">White-Label Pricing</div>
                    <div className="text-muted-foreground">{agency.whitelabel_pricing}</div>
                  </div>
                )}
                {agency.minimum_project_value && (
                  <div>
                    <div className="text-sm font-medium">Minimum Project Value</div>
                    <div className="text-muted-foreground">{agency.minimum_project_value}</div>
                  </div>
                )}
                {!agency.affiliate_commission && !agency.whitelabel_pricing && !agency.minimum_project_value && (
                  <p className="text-sm text-muted-foreground">
                    No collaboration terms specified yet.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-3xl font-bold">{agency.profile_views}</div>
                  <div className="text-sm text-muted-foreground">Profile Views</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <StartConversationDialog
          open={showMessageDialog}
          onOpenChange={setShowMessageDialog}
          recipientUserId={agency.user_id}
          recipientName={agency.agency_name}
        />
    </main>
  );
};

export default AgencyProfile;
