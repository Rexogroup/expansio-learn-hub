import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Plus, X, Save, Building2, Target, Users, Lightbulb, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PainPoint {
  problem: string;
  solution: string;
}

interface BusinessProfile {
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

const defaultProfile: BusinessProfile = {
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

interface BusinessIntakeFormProps {
  onComplete: () => void;
}

export function BusinessIntakeForm({ onComplete }: BusinessIntakeFormProps) {
  const [profile, setProfile] = useState<BusinessProfile>(defaultProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pendingPainPoints, setPendingPainPoints] = useState<PainPoint[]>([{ problem: "", solution: "" }]);
  const [existingProfileId, setExistingProfileId] = useState<string | null>(null);

  useEffect(() => {
    fetchExistingProfile();
  }, []);

  const fetchExistingProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("user_script_profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setExistingProfileId(data.id);
        const painPoints = Array.isArray(data.pain_points) 
          ? (data.pain_points as unknown as PainPoint[])
          : [];
        
        setProfile({
          company_name: data.company_name || "",
          company_description: data.company_description || "",
          services_offered: data.services_offered || "",
          target_industries: data.target_industries || "",
          icp_revenue_range: data.icp_revenue_range || "",
          icp_employee_count: data.icp_employee_count || "",
          icp_location: data.icp_location || "",
          icp_tech_stack: data.icp_tech_stack || "",
          icp_additional_details: data.icp_additional_details || "",
          pain_points: painPoints,
          custom_notes: data.custom_notes || "",
        });
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const addPendingRow = () => {
    setPendingPainPoints(prev => [...prev, { problem: "", solution: "" }]);
  };

  const updatePendingPainPoint = (index: number, field: keyof PainPoint, value: string) => {
    setPendingPainPoints(prev => prev.map((pp, i) => 
      i === index ? { ...pp, [field]: value } : pp
    ));
  };

  const removePendingRow = (index: number) => {
    setPendingPainPoints(prev => prev.length > 1 ? prev.filter((_, i) => i !== index) : prev);
  };

  const addAllPainPoints = () => {
    const validPainPoints = pendingPainPoints.filter(pp => pp.problem.trim());
    if (validPainPoints.length === 0) {
      toast.error("Please enter at least one pain point");
      return;
    }
    setProfile(prev => ({
      ...prev,
      pain_points: [...prev.pain_points, ...validPainPoints],
    }));
    setPendingPainPoints([{ problem: "", solution: "" }]);
    toast.success(`Added ${validPainPoints.length} pain point${validPainPoints.length > 1 ? 's' : ''}`);
  };

  const removePainPoint = (index: number) => {
    setProfile(prev => ({
      ...prev,
      pain_points: prev.pain_points.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in to continue");
        return;
      }

      const profileData = {
        user_id: user.id,
        company_name: profile.company_name,
        company_description: profile.company_description,
        services_offered: profile.services_offered,
        target_industries: profile.target_industries,
        icp_revenue_range: profile.icp_revenue_range,
        icp_employee_count: profile.icp_employee_count,
        icp_location: profile.icp_location,
        icp_tech_stack: profile.icp_tech_stack,
        icp_additional_details: profile.icp_additional_details,
        pain_points: profile.pain_points as unknown as null,
        custom_notes: profile.custom_notes,
        updated_at: new Date().toISOString(),
      };

      let error;
      if (existingProfileId) {
        const result = await supabase
          .from("user_script_profiles")
          .update(profileData)
          .eq("id", existingProfileId);
        error = result.error;
      } else {
        const result = await supabase
          .from("user_script_profiles")
          .insert(profileData);
        error = result.error;
      }

      if (error) throw error;

      toast.success("Profile saved! Generating your personalized lead magnets...");
      
      // Trigger bulk lead magnet generation in background
      supabase.functions.invoke('generate-bulk-lead-magnets', {
        body: { count: 20 }
      }).then(({ data, error: genError }) => {
        if (genError) {
          console.error('Lead magnet generation error:', genError);
        } else if (data?.skipped) {
          console.log('Lead magnets already exist');
        } else {
          console.log('Lead magnet generation started');
        }
      });

      onComplete();
    } catch (error) {
      console.error("Error saving profile:", error);
      toast.error("Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const validPendingCount = pendingPainPoints.filter(pp => pp.problem.trim()).length;

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">Set Up Your Business Profile</h2>
        <p className="text-muted-foreground">
          This information will personalize your AI-generated lead magnets and scripts.
        </p>
      </div>

      {/* Company Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Company Information
          </CardTitle>
          <CardDescription>Tell us about your business</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="company_name">Company Name</Label>
            <Input
              id="company_name"
              value={profile.company_name}
              onChange={(e) => setProfile(prev => ({ ...prev, company_name: e.target.value }))}
              placeholder="e.g., Acme Marketing Agency"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="company_description">Company Description</Label>
            <Textarea
              id="company_description"
              value={profile.company_description}
              onChange={(e) => setProfile(prev => ({ ...prev, company_description: e.target.value }))}
              placeholder="Briefly describe what your company does and your unique value proposition..."
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="target_industries">Target Industries</Label>
            <Input
              id="target_industries"
              value={profile.target_industries}
              onChange={(e) => setProfile(prev => ({ ...prev, target_industries: e.target.value }))}
              placeholder="e.g., SaaS, E-commerce, Healthcare, Finance"
            />
          </div>
        </CardContent>
      </Card>

      {/* Services Offered */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Services Offered
          </CardTitle>
          <CardDescription>What services do you provide to clients?</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="services_offered">Core Services</Label>
            <Textarea
              id="services_offered"
              value={profile.services_offered}
              onChange={(e) => setProfile(prev => ({ ...prev, services_offered: e.target.value }))}
              placeholder="e.g., Cold email outreach, Lead generation, LinkedIn automation, Sales consulting..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* ICP Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Ideal Client Profile (ICP)
          </CardTitle>
          <CardDescription>Define your perfect customer</CardDescription>
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
            <div className="space-y-2">
              <Label htmlFor="icp_location">Target Location</Label>
              <Input
                id="icp_location"
                value={profile.icp_location}
                onChange={(e) => setProfile(prev => ({ ...prev, icp_location: e.target.value }))}
                placeholder="e.g., North America, Europe, Global"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="icp_tech_stack">Tech Stack / Platforms</Label>
              <Input
                id="icp_tech_stack"
                value={profile.icp_tech_stack}
                onChange={(e) => setProfile(prev => ({ ...prev, icp_tech_stack: e.target.value }))}
                placeholder="e.g., HubSpot, Salesforce, Outreach"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="icp_additional_details">Additional ICP Details</Label>
            <Textarea
              id="icp_additional_details"
              value={profile.icp_additional_details}
              onChange={(e) => setProfile(prev => ({ ...prev, icp_additional_details: e.target.value }))}
              placeholder="Any other characteristics of your ideal clients (decision makers, buying triggers, etc.)..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Pain Points */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            Client Pain Points & Solutions
          </CardTitle>
          <CardDescription>What problems do your clients face and how do you solve them?</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Existing Pain Points */}
          {profile.pain_points.length > 0 && (
            <div className="space-y-2">
              <Label>Saved Pain Points</Label>
              <div className="space-y-2">
                {profile.pain_points.map((pp, index) => (
                  <div key={index} className="flex items-start gap-2 p-3 bg-muted rounded-lg">
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium">{pp.problem}</p>
                      {pp.solution && (
                        <p className="text-sm text-muted-foreground">Solution: {pp.solution}</p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removePainPoint(index)}
                      className="text-muted-foreground hover:text-destructive shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Batch Add Pain Points */}
          <div className="space-y-3">
            <Label>Add New Pain Points</Label>
            <p className="text-sm text-muted-foreground">
              Add multiple pain points at once, then click "Add All" to save them together.
            </p>
            <div className="space-y-2">
              {pendingPainPoints.map((pp, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    value={pp.problem}
                    onChange={(e) => updatePendingPainPoint(index, "problem", e.target.value)}
                    placeholder="Pain point / Problem..."
                    className="flex-1"
                  />
                  <Input
                    value={pp.solution}
                    onChange={(e) => updatePendingPainPoint(index, "solution", e.target.value)}
                    placeholder="How you solve it (optional)..."
                    className="flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removePendingRow(index)}
                    disabled={pendingPainPoints.length === 1 && !pp.problem && !pp.solution}
                    className="text-muted-foreground hover:text-destructive shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={addPendingRow}>
                <Plus className="mr-2 h-4 w-4" />
                Add Another Row
              </Button>
              <Button 
                size="sm" 
                onClick={addAllPainPoints}
                disabled={validPendingCount === 0}
              >
                Confirm & Add All ({validPendingCount})
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Additional Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Additional Notes
          </CardTitle>
          <CardDescription>Any other context for AI personalization</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={profile.custom_notes}
            onChange={(e) => setProfile(prev => ({ ...prev, custom_notes: e.target.value }))}
            placeholder="Add any additional context, tone preferences, specific phrases to use or avoid, etc..."
            rows={4}
          />
        </CardContent>
      </Card>

      {/* Submit Button */}
      <div className="flex justify-center pt-4">
        <Button size="lg" onClick={handleSubmit} disabled={saving} className="min-w-[200px]">
          {saving ? (
            <>
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-5 w-5" />
              Save Profile & Complete Step
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
