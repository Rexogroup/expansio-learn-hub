import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Save, Loader2, Plus, X, Building2, Target, Briefcase, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface PainPoint {
  problem: string;
  solution: string;
}

interface UserScriptProfile {
  id?: string;
  company_name: string;
  company_description: string;
  services_offered: string;
  target_industries: string;
  icp_revenue_range: string;
  icp_employee_count: string;
  icp_location: string;
  icp_tech_stack: string;
  icp_additional_details: string;
  pain_points: PainPoint[];
  custom_notes: string;
}

const defaultProfile: UserScriptProfile = {
  company_name: "",
  company_description: "",
  services_offered: "",
  target_industries: "",
  icp_revenue_range: "",
  icp_employee_count: "",
  icp_location: "",
  icp_tech_stack: "",
  icp_additional_details: "",
  pain_points: [],
  custom_notes: "",
};

export default function UserProfile() {
  const [profile, setProfile] = useState<UserScriptProfile>(defaultProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newPainPoint, setNewPainPoint] = useState<PainPoint>({ problem: "", solution: "" });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("user_script_profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;

      if (data) {
        setProfile({
          id: data.id,
          company_name: data.company_name || "",
          company_description: data.company_description || "",
          services_offered: data.services_offered || "",
          target_industries: data.target_industries || "",
          icp_revenue_range: data.icp_revenue_range || "",
          icp_employee_count: data.icp_employee_count || "",
          icp_location: data.icp_location || "",
          icp_tech_stack: data.icp_tech_stack || "",
          icp_additional_details: data.icp_additional_details || "",
          pain_points: (Array.isArray(data.pain_points) ? data.pain_points : []) as unknown as PainPoint[],
          custom_notes: data.custom_notes || "",
        });
      }
    } catch (error: any) {
      console.error("Error fetching profile:", error);
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const profileData: Record<string, unknown> = {
        user_id: user.id,
        company_name: profile.company_name || null,
        company_description: profile.company_description || null,
        services_offered: profile.services_offered || null,
        target_industries: profile.target_industries || null,
        icp_revenue_range: profile.icp_revenue_range || null,
        icp_employee_count: profile.icp_employee_count || null,
        icp_location: profile.icp_location || null,
        icp_tech_stack: profile.icp_tech_stack || null,
        icp_additional_details: profile.icp_additional_details || null,
        pain_points: JSON.parse(JSON.stringify(profile.pain_points)),
        custom_notes: profile.custom_notes || null,
      };

      if (profile.id) {
        const { error } = await supabase
          .from("user_script_profiles")
          .update(profileData)
          .eq("id", profile.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("user_script_profiles")
          .insert(profileData as any)
          .select()
          .single();
        if (error) throw error;
        setProfile(prev => ({ ...prev, id: data.id }));
      }

      toast.success("Profile saved! The AI will now use this info to personalize your lead magnets.");
    } catch (error: any) {
      console.error("Error saving profile:", error);
      toast.error("Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const addPainPoint = () => {
    if (!newPainPoint.problem.trim()) {
      toast.error("Please enter a problem");
      return;
    }
    setProfile(prev => ({
      ...prev,
      pain_points: [...prev.pain_points, { ...newPainPoint }],
    }));
    setNewPainPoint({ problem: "", solution: "" });
  };

  const removePainPoint = (index: number) => {
    setProfile(prev => ({
      ...prev,
      pain_points: prev.pain_points.filter((_, i) => i !== index),
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">My Business Profile</h2>
          <p className="text-muted-foreground">
            Save your business details to get personalized lead magnet recommendations
          </p>
        </div>
        <Button onClick={saveProfile} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Profile
            </>
          )}
        </Button>
      </div>

      {/* Company Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Company Information
          </CardTitle>
          <CardDescription>
            Tell us about your agency or business
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="company_name">Company Name</Label>
              <Input
                id="company_name"
                value={profile.company_name}
                onChange={(e) => setProfile(prev => ({ ...prev, company_name: e.target.value }))}
                placeholder="Your Agency Name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="target_industries">Target Industries</Label>
              <Input
                id="target_industries"
                value={profile.target_industries}
                onChange={(e) => setProfile(prev => ({ ...prev, target_industries: e.target.value }))}
                placeholder="e.g., E-commerce, SaaS, Healthcare"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="company_description">Company Description</Label>
            <Textarea
              id="company_description"
              value={profile.company_description}
              onChange={(e) => setProfile(prev => ({ ...prev, company_description: e.target.value }))}
              placeholder="Brief description of what your agency does..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Services */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Services Offered
          </CardTitle>
          <CardDescription>
            What services does your agency deliver to paying clients?
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="services_offered">Core Services</Label>
            <Textarea
              id="services_offered"
              value={profile.services_offered}
              onChange={(e) => setProfile(prev => ({ ...prev, services_offered: e.target.value }))}
              placeholder="List your main services, e.g.:
- UGC Ad Creative Production
- Video Editing for Social Media
- Short-form Content Creation
- Ad Campaign Management"
              rows={5}
            />
          </div>
        </CardContent>
      </Card>

      {/* ICP Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Ideal Client Profile (ICP)
          </CardTitle>
          <CardDescription>
            Describe your ideal target customer
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="icp_revenue_range">Annual Revenue Range</Label>
              <Input
                id="icp_revenue_range"
                value={profile.icp_revenue_range}
                onChange={(e) => setProfile(prev => ({ ...prev, icp_revenue_range: e.target.value }))}
                placeholder="e.g., $1M - $10M"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="icp_employee_count">Employee Count</Label>
              <Input
                id="icp_employee_count"
                value={profile.icp_employee_count}
                onChange={(e) => setProfile(prev => ({ ...prev, icp_employee_count: e.target.value }))}
                placeholder="e.g., 10-50 employees"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="icp_location">Target Location</Label>
              <Input
                id="icp_location"
                value={profile.icp_location}
                onChange={(e) => setProfile(prev => ({ ...prev, icp_location: e.target.value }))}
                placeholder="e.g., USA, UK, Europe"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="icp_tech_stack">Tech Stack / Platforms</Label>
              <Input
                id="icp_tech_stack"
                value={profile.icp_tech_stack}
                onChange={(e) => setProfile(prev => ({ ...prev, icp_tech_stack: e.target.value }))}
                placeholder="e.g., Shopify, Klaviyo, Meta Ads"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="icp_additional_details">Additional ICP Details</Label>
            <Textarea
              id="icp_additional_details"
              value={profile.icp_additional_details}
              onChange={(e) => setProfile(prev => ({ ...prev, icp_additional_details: e.target.value }))}
              placeholder="Any other details about your ideal client..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Pain Points */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Client Pain Points
          </CardTitle>
          <CardDescription>
            What problems do your ideal clients face? Add specific pain points and how you solve them.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Existing Pain Points */}
          {profile.pain_points.length > 0 && (
            <div className="space-y-3">
              {profile.pain_points.map((pp, index) => (
                <div key={index} className="flex items-start gap-3 p-3 border rounded-lg bg-muted/30">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="destructive" className="text-xs">Problem</Badge>
                      <span className="text-sm font-medium">{pp.problem}</span>
                    </div>
                    {pp.solution && (
                      <div className="flex items-center gap-2">
                        <Badge variant="default" className="text-xs">Solution</Badge>
                        <span className="text-sm text-muted-foreground">{pp.solution}</span>
                      </div>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removePainPoint(index)}
                    className="text-destructive hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <Separator />

          {/* Add New Pain Point */}
          <div className="space-y-3">
            <Label>Add New Pain Point</Label>
            <div className="grid gap-3 md:grid-cols-2">
              <Input
                value={newPainPoint.problem}
                onChange={(e) => setNewPainPoint(prev => ({ ...prev, problem: e.target.value }))}
                placeholder="Pain point / Problem..."
              />
              <Input
                value={newPainPoint.solution}
                onChange={(e) => setNewPainPoint(prev => ({ ...prev, solution: e.target.value }))}
                placeholder="How you solve it (optional)..."
              />
            </div>
            <Button variant="outline" size="sm" onClick={addPainPoint}>
              <Plus className="mr-2 h-4 w-4" />
              Add Pain Point
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Custom Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Notes</CardTitle>
          <CardDescription>
            Any other information that would help the AI understand your business better
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={profile.custom_notes}
            onChange={(e) => setProfile(prev => ({ ...prev, custom_notes: e.target.value }))}
            placeholder="e.g., We specialize in DTC brands, our best lead magnets have been..., our typical deal size is..."
            rows={4}
          />
        </CardContent>
      </Card>

      {/* Save Button (bottom) */}
      <div className="flex justify-end">
        <Button onClick={saveProfile} disabled={saving} size="lg">
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Profile
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
