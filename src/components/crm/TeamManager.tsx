import { useState } from "react";
import { Team } from "@/pages/CRM";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Users, UserPlus, Trash2 } from "lucide-react";

type MemberRole = 'admin' | 'sdr' | 'client';

interface TeamManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teams: Team[];
  selectedTeamId: string | null;
  currentUserId: string | undefined;
  onTeamCreated: (team: Team) => void;
  onTeamsUpdated: () => void;
  onClearDemoData?: () => void;
}

export const TeamManager = ({
  open,
  onOpenChange,
  teams,
  selectedTeamId,
  currentUserId,
  onTeamCreated,
  onTeamsUpdated,
  onClearDemoData,
}: TeamManagerProps) => {
  const [newTeamName, setNewTeamName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<MemberRole>("sdr");
  const [isCreating, setIsCreating] = useState(false);
  const [isInviting, setIsInviting] = useState(false);

  const handleCreateTeam = async () => {
    if (!newTeamName.trim() || !currentUserId) return;

    setIsCreating(true);
    try {
      const { data, error } = await supabase
        .from("teams")
        .insert({
          name: newTeamName.trim(),
          owner_id: currentUserId,
        })
        .select()
        .single();

      if (error) throw error;

      // Also add owner as team member with 'owner' role
      await supabase.from("team_members").insert({
        team_id: data.id,
        user_id: currentUserId,
        role: 'owner',
      });

      toast.success("Team created successfully!");
      setNewTeamName("");
      onTeamCreated(data);
    } catch (error: any) {
      console.error("Error creating team:", error);
      toast.error(error.message || "Failed to create team");
    } finally {
      setIsCreating(false);
    }
  };

  const handleInviteMember = async () => {
    if (!inviteEmail.trim() || !selectedTeamId) return;

    setIsInviting(true);
    try {
      // Find user by email
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", inviteEmail.trim().toLowerCase())
        .single();

      if (profileError || !profile) {
        toast.error("User not found. They must have an account first.");
        return;
      }

      // Check if already a member
      const { data: existing } = await supabase
        .from("team_members")
        .select("id")
        .eq("team_id", selectedTeamId)
        .eq("user_id", profile.id)
        .single();

      if (existing) {
        toast.error("User is already a team member");
        return;
      }

      // Add as member with selected role
      const { error } = await supabase.from("team_members").insert({
        team_id: selectedTeamId,
        user_id: profile.id,
        role: inviteRole,
      });

      if (error) throw error;

      toast.success(`${inviteRole.toUpperCase()} added to team!`);
      setInviteEmail("");
      setInviteRole("sdr");
      onTeamsUpdated();
    } catch (error: any) {
      console.error("Error inviting member:", error);
      toast.error(error.message || "Failed to add team member");
    } finally {
      setIsInviting(false);
    }
  };

  const selectedTeam = teams.find((t) => t.id === selectedTeamId);
  const isOwner = selectedTeam?.owner_id === currentUserId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Team Management</DialogTitle>
          <DialogDescription>
            Create teams and manage team members
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="create" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="create" className="gap-2">
              <Plus className="h-4 w-4" />
              Create Team
            </TabsTrigger>
            <TabsTrigger value="members" className="gap-2" disabled={!selectedTeamId}>
              <Users className="h-4 w-4" />
              Members
            </TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="teamName">Team Name</Label>
              <Input
                id="teamName"
                placeholder="e.g., Sales Team"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateTeam()}
              />
            </div>
            <Button
              onClick={handleCreateTeam}
              disabled={!newTeamName.trim() || isCreating}
              className="w-full"
            >
              {isCreating ? "Creating..." : "Create Team"}
            </Button>

            {teams.length > 0 && (
              <div className="pt-4 border-t">
                <h4 className="text-sm font-medium mb-2">Your Teams</h4>
                <div className="space-y-2">
                  {teams.map((team) => (
                    <div
                      key={team.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{team.name}</span>
                        {team.owner_id === currentUserId && (
                          <span className="text-xs text-muted-foreground">(Owner)</span>
                        )}
                      </div>
                      {team.name === "Demo Team" && team.owner_id === currentUserId && onClearDemoData && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4 mr-1" />
                              Clear Demo
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Clear Demo Data?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will delete the Demo Team and all its leads. You can create a new team to start fresh.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={onClearDemoData} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                Clear Demo Data
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="members" className="mt-4 space-y-4">
            {selectedTeam && (
              <>
                <div className="text-sm text-muted-foreground">
                  Managing: <strong>{selectedTeam.name}</strong>
                </div>

                {isOwner && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="inviteEmail">Add Team Member (by email)</Label>
                      <div className="flex gap-2">
                        <Input
                          id="inviteEmail"
                          type="email"
                          placeholder="member@company.com"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleInviteMember()}
                          className="flex-1"
                        />
                        <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as MemberRole)}>
                          <SelectTrigger className="w-[100px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="sdr">SDR</SelectItem>
                            <SelectItem value="client">Client</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          onClick={handleInviteMember}
                          disabled={!inviteEmail.trim() || isInviting}
                          size="icon"
                        >
                          <UserPlus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p><strong>Admin/SDR:</strong> Full access including spreadsheet</p>
                      <p><strong>Client:</strong> Pipeline & templates only (no spreadsheet)</p>
                    </div>
                  </div>
                )}

                {!isOwner && (
                  <p className="text-sm text-muted-foreground">
                    Only team owners can manage members
                  </p>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
