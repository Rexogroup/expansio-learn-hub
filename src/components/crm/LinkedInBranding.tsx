import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Upload, Copy, Check, Image, User, Briefcase, FileText, Sparkles, Loader2, Download } from "lucide-react";

interface LinkedInBrandingProps {
  teamId: string;
  canEdit: boolean;
}

interface BrandingAssets {
  id?: string;
  team_id: string;
  cover_image_url: string | null;
  about_text: string | null;
  role_title: string | null;
  role_description: string | null;
  featured_posts: string | null;
  description: string | null;
}

export const LinkedInBranding = ({ teamId, canEdit }: LinkedInBrandingProps) => {
  const [assets, setAssets] = useState<BrandingAssets>({
    team_id: teamId,
    cover_image_url: null,
    about_text: null,
    role_title: null,
    role_description: null,
    featured_posts: null,
    description: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchAssets();
  }, [teamId]);

  const fetchAssets = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("linkedin_branding_assets")
        .select("*")
        .eq("team_id", teamId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setAssets(data);
      } else {
        setAssets({
          team_id: teamId,
          cover_image_url: null,
          about_text: null,
          role_title: null,
          role_description: null,
          featured_posts: null,
          description: null,
        });
      }
    } catch (error) {
      console.error("Error fetching branding assets:", error);
      toast.error("Failed to load branding assets");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!canEdit) return;
    
    setIsSaving(true);
    try {
      if (assets.id) {
        const { error } = await supabase
          .from("linkedin_branding_assets")
          .update({
            cover_image_url: assets.cover_image_url,
            about_text: assets.about_text,
            role_title: assets.role_title,
            role_description: assets.role_description,
            featured_posts: assets.featured_posts,
            description: assets.description,
          })
          .eq("id", assets.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("linkedin_branding_assets")
          .insert({
            team_id: teamId,
            cover_image_url: assets.cover_image_url,
            about_text: assets.about_text,
            role_title: assets.role_title,
            role_description: assets.role_description,
            featured_posts: assets.featured_posts,
            description: assets.description,
          })
          .select()
          .single();

        if (error) throw error;
        setAssets(data);
      }

      toast.success("Branding assets saved");
    } catch (error) {
      console.error("Error saving branding assets:", error);
      toast.error("Failed to save branding assets");
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${teamId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("linkedin-branding")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("linkedin-branding")
        .getPublicUrl(fileName);

      setAssets(prev => ({ ...prev, cover_image_url: publicUrl }));
      toast.success("Cover image uploaded");
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("Failed to upload image");
    } finally {
      setIsUploading(false);
    }
  };

  const copyToClipboard = async (text: string | null, field: string) => {
    if (!text) return;
    
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      toast.error("Failed to copy");
    }
  };

  const handleDownloadImage = async () => {
    if (!assets.cover_image_url) return;
    
    try {
      const response = await fetch(assets.cover_image_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'linkedin-cover-image.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("Image downloaded");
    } catch (error) {
      toast.error("Failed to download image");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            LinkedIn Branding Assets
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Centralized branding for your SDR team's LinkedIn profiles
          </p>
        </div>
        {canEdit && (
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        )}
      </div>

      {/* Cover Image Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Image className="w-4 h-4" />
            Branded LinkedIn Cover Image
          </CardTitle>
          <CardDescription>
            Upload a branded cover image for SDR LinkedIn profiles (1584 x 396px recommended)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageUpload}
            accept="image/*"
            className="hidden"
          />
          
          {assets.cover_image_url ? (
            <div className="space-y-3">
              <div className="relative aspect-[4/1] rounded-lg overflow-hidden bg-muted">
                <img
                  src={assets.cover_image_url}
                  alt="LinkedIn cover"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadImage}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Image
                </Button>
                {canEdit && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4 mr-2" />
                    )}
                    Replace Image
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center ${
                canEdit ? "cursor-pointer hover:border-primary" : ""
              }`}
              onClick={() => canEdit && fileInputRef.current?.click()}
            >
              {isUploading ? (
                <Loader2 className="w-8 h-8 mx-auto animate-spin text-muted-foreground" />
              ) : (
                <>
                  <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {canEdit ? "Click to upload cover image" : "No cover image uploaded"}
                  </p>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Text-Based Assets */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* About Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="w-4 h-4" />
              About Section
            </CardTitle>
            <CardDescription>
              The "About" bio text for SDR profiles
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              placeholder="Enter the about section text..."
              value={assets.about_text || ""}
              onChange={(e) => setAssets(prev => ({ ...prev, about_text: e.target.value }))}
              rows={4}
              disabled={!canEdit}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(assets.about_text, "about")}
              disabled={!assets.about_text}
            >
              {copiedField === "about" ? (
                <Check className="w-4 h-4 mr-2 text-green-500" />
              ) : (
                <Copy className="w-4 h-4 mr-2" />
              )}
              Copy
            </Button>
          </CardContent>
        </Card>

        {/* Role Title */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Briefcase className="w-4 h-4" />
              Role Title
            </CardTitle>
            <CardDescription>
              The job title for SDR profiles
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="e.g., Business Development Representative"
              value={assets.role_title || ""}
              onChange={(e) => setAssets(prev => ({ ...prev, role_title: e.target.value }))}
              disabled={!canEdit}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(assets.role_title, "role")}
              disabled={!assets.role_title}
            >
              {copiedField === "role" ? (
                <Check className="w-4 h-4 mr-2 text-green-500" />
              ) : (
                <Copy className="w-4 h-4 mr-2" />
              )}
              Copy
            </Button>
          </CardContent>
        </Card>

        {/* Role Description */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="w-4 h-4" />
              Role Description
            </CardTitle>
            <CardDescription>
              Description to appear in Experience section
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              placeholder="Describe the role responsibilities..."
              value={assets.role_description || ""}
              onChange={(e) => setAssets(prev => ({ ...prev, role_description: e.target.value }))}
              rows={4}
              disabled={!canEdit}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(assets.role_description, "roleDesc")}
              disabled={!assets.role_description}
            >
              {copiedField === "roleDesc" ? (
                <Check className="w-4 h-4 mr-2 text-green-500" />
              ) : (
                <Copy className="w-4 h-4 mr-2" />
              )}
              Copy
            </Button>
          </CardContent>
        </Card>

        {/* Featured Posts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="w-4 h-4" />
              Featured Posts (Case Studies)
            </CardTitle>
            <CardDescription>
              Links or descriptions for featured section
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              placeholder="Add featured post links or case study descriptions..."
              value={assets.featured_posts || ""}
              onChange={(e) => setAssets(prev => ({ ...prev, featured_posts: e.target.value }))}
              rows={4}
              disabled={!canEdit}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(assets.featured_posts, "featured")}
              disabled={!assets.featured_posts}
            >
              {copiedField === "featured" ? (
                <Check className="w-4 h-4 mr-2 text-green-500" />
              ) : (
                <Copy className="w-4 h-4 mr-2" />
              )}
              Copy
            </Button>
          </CardContent>
        </Card>

        {/* General Description */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="w-4 h-4" />
              General Description
            </CardTitle>
            <CardDescription>
              Additional branding copy or guidelines
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              placeholder="Add any additional branding guidelines or copy..."
              value={assets.description || ""}
              onChange={(e) => setAssets(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              disabled={!canEdit}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(assets.description, "desc")}
              disabled={!assets.description}
            >
              {copiedField === "desc" ? (
                <Check className="w-4 h-4 mr-2 text-green-500" />
              ) : (
                <Copy className="w-4 h-4 mr-2" />
              )}
              Copy
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
