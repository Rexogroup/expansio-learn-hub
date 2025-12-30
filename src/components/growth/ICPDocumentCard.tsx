import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  FileText, 
  Download, 
  Edit, 
  Building2, 
  Target, 
  Users, 
  Lightbulb,
  CheckCircle2
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { 
  BusinessProfile, 
  downloadProfileAsDocx, 
  openProfileForPrint 
} from "@/lib/generate-profile-document";
import { toast } from "sonner";

interface ICPDocumentCardProps {
  profileData: {
    company_name?: string;
    company_description?: string;
    services_offered?: string;
    target_industries?: string;
    icp_revenue_range?: string;
    icp_employee_count?: string;
    icp_location?: string;
    icp_tech_stack?: string;
    icp_additional_details?: string;
    pain_points?: { problem: string; solution: string }[];
    custom_notes?: string;
  };
  assetId: string;
  createdAt?: string;
}

export function ICPDocumentCard({ profileData, assetId, createdAt }: ICPDocumentCardProps) {
  const navigate = useNavigate();

  const handleDownloadDocx = async () => {
    const profile: BusinessProfile = {
      id: assetId,
      company_name: profileData.company_name || null,
      company_description: profileData.company_description || null,
      services_offered: profileData.services_offered || null,
      target_industries: profileData.target_industries || null,
      icp_revenue_range: profileData.icp_revenue_range || null,
      icp_employee_count: profileData.icp_employee_count || null,
      icp_location: profileData.icp_location || null,
      icp_tech_stack: profileData.icp_tech_stack || null,
      icp_additional_details: profileData.icp_additional_details || null,
      pain_points: profileData.pain_points || null,
      custom_notes: profileData.custom_notes || null,
      created_at: createdAt || null,
    };

    try {
      await downloadProfileAsDocx(profile);
      toast.success("ICP Document downloaded successfully");
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download document");
    }
  };

  const handlePrint = () => {
    const profile: BusinessProfile = {
      id: assetId,
      company_name: profileData.company_name || null,
      company_description: profileData.company_description || null,
      services_offered: profileData.services_offered || null,
      target_industries: profileData.target_industries || null,
      icp_revenue_range: profileData.icp_revenue_range || null,
      icp_employee_count: profileData.icp_employee_count || null,
      icp_location: profileData.icp_location || null,
      icp_tech_stack: profileData.icp_tech_stack || null,
      icp_additional_details: profileData.icp_additional_details || null,
      pain_points: profileData.pain_points || null,
      custom_notes: profileData.custom_notes || null,
      created_at: createdAt || null,
    };

    openProfileForPrint(profile);
  };

  const painPointsCount = profileData.pain_points?.length || 0;

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">ICP Document</CardTitle>
              <p className="text-sm text-muted-foreground">
                {profileData.company_name || "Your Business Profile"}
              </p>
            </div>
          </div>
          <Badge variant="default" className="gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Completed
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
            <Building2 className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm truncate">{profileData.target_industries || "Industries"}</span>
          </div>
          <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm truncate">{profileData.icp_employee_count || "Team Size"}</span>
          </div>
          <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
            <Target className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm truncate">{profileData.icp_revenue_range || "Revenue"}</span>
          </div>
          <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
            <Lightbulb className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">{painPointsCount} Pain Points</span>
          </div>
        </div>

        {/* Preview Section */}
        {profileData.company_description && (
          <div className="p-3 bg-muted/30 rounded-lg">
            <p className="text-sm text-muted-foreground line-clamp-2">
              {profileData.company_description}
            </p>
          </div>
        )}

        {/* Services Preview */}
        {profileData.services_offered && (
          <div className="p-3 bg-muted/30 rounded-lg">
            <p className="text-xs font-medium text-muted-foreground mb-1">Services</p>
            <p className="text-sm line-clamp-2">{profileData.services_offered}</p>
          </div>
        )}

        <Separator />

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handleDownloadDocx}>
            <Download className="w-4 h-4 mr-2" />
            Download DOCX
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <FileText className="w-4 h-4 mr-2" />
            Print / PDF
          </Button>
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={() => navigate('/onboarding/step/2')}
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit Profile
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
