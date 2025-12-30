import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileText, Printer, Search, Eye, FileType } from "lucide-react";
import { toast } from "sonner";
import {
  BusinessProfile,
  downloadProfileAsHTML,
  openProfileForPrint,
  generateProfileHTML,
  downloadProfileAsDocx,
} from "@/lib/generate-profile-document";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ProfileWithUser extends BusinessProfile {
  profiles?: {
    email: string | null;
    full_name: string | null;
  } | null;
}

export function BusinessProfileManager() {
  const [profiles, setProfiles] = useState<ProfileWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [previewProfile, setPreviewProfile] = useState<BusinessProfile | null>(null);

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    try {
      // Fetch profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from("user_script_profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      // Get unique user IDs
      const userIds = [...new Set((profilesData || []).map((p) => p.user_id).filter(Boolean))];

      // Fetch user details
      let userMap: Record<string, { email: string | null; full_name: string | null }> = {};
      if (userIds.length > 0) {
        const { data: usersData } = await supabase
          .from("profiles")
          .select("id, email, full_name")
          .in("id", userIds);

        userMap = (usersData || []).reduce((acc, user) => {
          acc[user.id] = { email: user.email, full_name: user.full_name };
          return acc;
        }, {} as Record<string, { email: string | null; full_name: string | null }>);
      }

      const transformedData = (profilesData || []).map((profile) => ({
        ...profile,
        user_email: profile.user_id ? userMap[profile.user_id]?.email || undefined : undefined,
        user_name: profile.user_id ? userMap[profile.user_id]?.full_name || undefined : undefined,
        pain_points: profile.pain_points as { problem: string; solution: string }[] | null,
      }));

      setProfiles(transformedData);
    } catch (error) {
      console.error("Error fetching profiles:", error);
      toast.error("Failed to load business profiles");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadHTML = (profile: BusinessProfile) => {
    downloadProfileAsHTML(profile);
    toast.success("Profile downloaded as HTML");
  };

  const handlePrintPDF = (profile: BusinessProfile) => {
    openProfileForPrint(profile);
    toast.success("Print dialog opened - save as PDF");
  };

  const handleDownloadDocx = async (profile: BusinessProfile) => {
    try {
      await downloadProfileAsDocx(profile);
      toast.success("Profile downloaded as DOCX");
    } catch (error) {
      console.error("Error generating DOCX:", error);
      toast.error("Failed to generate DOCX file");
    }
  };

  const handlePreview = (profile: BusinessProfile) => {
    setPreviewProfile(profile);
  };

  const filteredProfiles = profiles.filter((profile) => {
    const search = searchTerm.toLowerCase();
    return (
      profile.company_name?.toLowerCase().includes(search) ||
      profile.user_email?.toLowerCase().includes(search) ||
      profile.user_name?.toLowerCase().includes(search)
    );
  });

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">Loading business profiles...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Business Profiles</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              View and download ICP data from user onboarding
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by company or user..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 w-[250px]"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredProfiles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? "No profiles match your search" : "No business profiles found"}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Services</TableHead>
                  <TableHead>Pain Points</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProfiles.map((profile) => (
                  <TableRow key={profile.id}>
                    <TableCell className="font-medium">
                      {profile.company_name || "Not provided"}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm">{profile.user_name || "Unknown"}</span>
                        <span className="text-xs text-muted-foreground">
                          {profile.user_email || "No email"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {profile.services_offered || "-"}
                    </TableCell>
                    <TableCell>
                      {profile.pain_points?.length || 0} recorded
                    </TableCell>
                    <TableCell>{formatDate(profile.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handlePreview(profile)}
                          title="Preview"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Download className="h-4 w-4 mr-1" />
                              Download
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleDownloadDocx(profile)}>
                              <FileType className="h-4 w-4 mr-2" />
                              Download as DOCX
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDownloadHTML(profile)}>
                              <FileText className="h-4 w-4 mr-2" />
                              Download as HTML
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handlePrintPDF(profile)}>
                              <Printer className="h-4 w-4 mr-2" />
                              Print / Save as PDF
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!previewProfile} onOpenChange={() => setPreviewProfile(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              Business Profile: {previewProfile?.company_name || "Unknown Company"}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[70vh]">
            {previewProfile && (
              <div
                dangerouslySetInnerHTML={{
                  __html: generateProfileHTML(previewProfile),
                }}
                className="bg-white text-black rounded-lg"
              />
            )}
          </ScrollArea>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setPreviewProfile(null)}>
              Close
            </Button>
            {previewProfile && (
              <>
                <Button variant="outline" onClick={() => handleDownloadDocx(previewProfile)}>
                  <FileType className="h-4 w-4 mr-2" />
                  DOCX
                </Button>
                <Button variant="outline" onClick={() => handleDownloadHTML(previewProfile)}>
                  <FileText className="h-4 w-4 mr-2" />
                  HTML
                </Button>
                <Button onClick={() => handlePrintPDF(previewProfile)}>
                  <Printer className="h-4 w-4 mr-2" />
                  Print / PDF
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
