import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ServiceSelector } from "./ServiceSelector";
import { ImageUpload } from "./ImageUpload";
import { Save, Eye, Globe } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface AgencyProfile {
  id?: string;
  agency_name: string;
  tagline: string;
  description: string;
  logo_url: string;
  banner_url: string;
  website_url: string;
  location: string;
  timezone: string;
  is_public: boolean;
  open_to_collaborations: boolean;
  affiliate_commission: string;
  whitelabel_pricing: string;
  minimum_project_value: string;
}

const defaultProfile: AgencyProfile = {
  agency_name: "",
  tagline: "",
  description: "",
  logo_url: "",
  banner_url: "",
  website_url: "",
  location: "",
  timezone: "",
  is_public: false,
  open_to_collaborations: true,
  affiliate_commission: "",
  whitelabel_pricing: "",
  minimum_project_value: "",
};

export const MyAgencyProfile = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<AgencyProfile>(defaultProfile);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        await fetchProfile(user.id);
      }
    };
    init();
  }, []);

  const fetchProfile = async (uid: string) => {
    const { data: profileData } = await supabase
      .from("agency_profiles")
      .select("*")
      .eq("user_id", uid)
      .maybeSingle();

    if (profileData) {
      setProfile({
        id: profileData.id,
        agency_name: profileData.agency_name || "",
        tagline: profileData.tagline || "",
        description: profileData.description || "",
        logo_url: profileData.logo_url || "",
        banner_url: profileData.banner_url || "",
        website_url: profileData.website_url || "",
        location: profileData.location || "",
        timezone: profileData.timezone || "",
        is_public: profileData.is_public,
        open_to_collaborations: profileData.open_to_collaborations,
        affiliate_commission: profileData.affiliate_commission || "",
        whitelabel_pricing: profileData.whitelabel_pricing || "",
        minimum_project_value: profileData.minimum_project_value || "",
      });

      // Fetch services
      const { data: servicesData } = await supabase
        .from("agency_services")
        .select("category_id")
        .eq("agency_id", profileData.id);

      setSelectedServices(servicesData?.map(s => s.category_id) || []);
    }

    setLoading(false);
  };

  const handleSave = async () => {
    if (!userId) return;

    if (!profile.agency_name.trim()) {
      toast.error("Agency name is required");
      return;
    }

    setSaving(true);

    try {
      let agencyId = profile.id;

      if (agencyId) {
        // Update existing profile
        const { error } = await supabase
          .from("agency_profiles")
          .update({
            agency_name: profile.agency_name,
            tagline: profile.tagline || null,
            description: profile.description || null,
            logo_url: profile.logo_url || null,
            banner_url: profile.banner_url || null,
            website_url: profile.website_url || null,
            location: profile.location || null,
            timezone: profile.timezone || null,
            is_public: profile.is_public,
            open_to_collaborations: profile.open_to_collaborations,
            affiliate_commission: profile.affiliate_commission || null,
            whitelabel_pricing: profile.whitelabel_pricing || null,
            minimum_project_value: profile.minimum_project_value || null,
          })
          .eq("id", agencyId);

        if (error) throw error;
      } else {
        // Create new profile
        const { data, error } = await supabase
          .from("agency_profiles")
          .insert({
            user_id: userId,
            agency_name: profile.agency_name,
            tagline: profile.tagline || null,
            description: profile.description || null,
            logo_url: profile.logo_url || null,
            banner_url: profile.banner_url || null,
            website_url: profile.website_url || null,
            location: profile.location || null,
            timezone: profile.timezone || null,
            is_public: profile.is_public,
            open_to_collaborations: profile.open_to_collaborations,
            affiliate_commission: profile.affiliate_commission || null,
            whitelabel_pricing: profile.whitelabel_pricing || null,
            minimum_project_value: profile.minimum_project_value || null,
          })
          .select()
          .single();

        if (error) throw error;
        agencyId = data.id;
        setProfile(prev => ({ ...prev, id: data.id }));
      }

      // Update services
      await supabase
        .from("agency_services")
        .delete()
        .eq("agency_id", agencyId);

      if (selectedServices.length > 0) {
        const servicesToInsert = selectedServices.map(categoryId => ({
          agency_id: agencyId,
          category_id: categoryId,
        }));

        const { error: servicesError } = await supabase
          .from("agency_services")
          .insert(servicesToInsert);

        if (servicesError) throw servicesError;
      }

      toast.success("Profile saved successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = () => {
    if (profile.id) {
      navigate(`/agency/${profile.id}`);
    } else {
      toast.error("Please save your profile first");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-32 bg-muted animate-pulse rounded-lg" />
        <div className="h-64 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Visibility Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Visibility Settings
          </CardTitle>
          <CardDescription>
            Control how your agency appears in the directory
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="is_public">Public Profile</Label>
              <p className="text-sm text-muted-foreground">
                Make your profile visible in the agency directory
              </p>
            </div>
            <Switch
              id="is_public"
              checked={profile.is_public}
              onCheckedChange={(checked) => setProfile(prev => ({ ...prev, is_public: checked }))}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="open_to_collaborations">Open to Collaborations</Label>
              <p className="text-sm text-muted-foreground">
                Show that you're actively looking for partnership opportunities
              </p>
            </div>
            <Switch
              id="open_to_collaborations"
              checked={profile.open_to_collaborations}
              onCheckedChange={(checked) => setProfile(prev => ({ ...prev, open_to_collaborations: checked }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>Agency Information</CardTitle>
          <CardDescription>
            Basic details about your agency
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="agency_name">Agency Name *</Label>
              <Input
                id="agency_name"
                value={profile.agency_name}
                onChange={(e) => setProfile(prev => ({ ...prev, agency_name: e.target.value }))}
                placeholder="Your Agency Name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tagline">Tagline</Label>
              <Input
                id="tagline"
                value={profile.tagline}
                onChange={(e) => setProfile(prev => ({ ...prev, tagline: e.target.value }))}
                placeholder="Short description of what you do"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">About Your Agency</Label>
            <Textarea
              id="description"
              value={profile.description}
              onChange={(e) => setProfile(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Tell other agencies about your company, expertise, and what makes you unique..."
              rows={4}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={profile.location}
                onChange={(e) => setProfile(prev => ({ ...prev, location: e.target.value }))}
                placeholder="City, Country"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="website_url">Website</Label>
              <Input
                id="website_url"
                type="url"
                value={profile.website_url}
                onChange={(e) => setProfile(prev => ({ ...prev, website_url: e.target.value }))}
                placeholder="https://youragency.com"
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Logo</Label>
              <ImageUpload
                value={profile.logo_url}
                onChange={(url) => setProfile(prev => ({ ...prev, logo_url: url }))}
                folder="logos"
                aspectRatio="square"
                placeholder="Upload logo"
              />
            </div>
            <div className="space-y-2">
              <Label>Banner</Label>
              <ImageUpload
                value={profile.banner_url}
                onChange={(url) => setProfile(prev => ({ ...prev, banner_url: url }))}
                folder="banners"
                aspectRatio="wide"
                placeholder="Upload banner"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Services */}
      <Card>
        <CardHeader>
          <CardTitle>Services Offered</CardTitle>
          <CardDescription>
            Select the services your agency provides
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ServiceSelector
            selectedServices={selectedServices}
            onServicesChange={setSelectedServices}
          />
        </CardContent>
      </Card>

      {/* Collaboration Terms */}
      <Card>
        <CardHeader>
          <CardTitle>Collaboration Terms</CardTitle>
          <CardDescription>
            Define your partnership and pricing structures
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="affiliate_commission">Affiliate Commission</Label>
            <Input
              id="affiliate_commission"
              value={profile.affiliate_commission}
              onChange={(e) => setProfile(prev => ({ ...prev, affiliate_commission: e.target.value }))}
              placeholder="e.g., 15% on closed deals, $500 per referral"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="whitelabel_pricing">White-Label Pricing</Label>
            <Input
              id="whitelabel_pricing"
              value={profile.whitelabel_pricing}
              onChange={(e) => setProfile(prev => ({ ...prev, whitelabel_pricing: e.target.value }))}
              placeholder="e.g., 30% discount on retail pricing"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="minimum_project_value">Minimum Project Value</Label>
            <Input
              id="minimum_project_value"
              value={profile.minimum_project_value}
              onChange={(e) => setProfile(prev => ({ ...prev, minimum_project_value: e.target.value }))}
              placeholder="e.g., $5,000"
            />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-4 justify-end">
        <Button variant="outline" onClick={handlePreview} disabled={!profile.id}>
          <Eye className="w-4 h-4 mr-2" />
          Preview Profile
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="w-4 h-4 mr-2" />
          {saving ? "Saving..." : "Save Profile"}
        </Button>
      </div>
    </div>
  );
};
