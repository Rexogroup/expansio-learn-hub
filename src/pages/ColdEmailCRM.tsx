import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ColdEmailLeadSpreadsheet } from "@/components/crm/ColdEmailLeadSpreadsheet";
import { LeadPipeline } from "@/components/crm/LeadPipeline";
import { TeamSelector } from "@/components/crm/TeamSelector";
import { TeamManager } from "@/components/crm/TeamManager";
import { QuickStats } from "@/components/crm/QuickStats";
import { MessageTemplates } from "@/components/crm/MessageTemplates";
import { FunnelDashboard } from "@/components/crm/FunnelDashboard";
import { Button } from "@/components/ui/button";
import { Table2, Kanban, Settings, FileText, MailPlus, Download, Loader2, LayoutDashboard } from "lucide-react";
import { toast } from "sonner";

import type { Team, TeamMember, CRMLead } from "./CRM";

const ColdEmailCRM = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [leads, setLeads] = useState<CRMLead[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showTeamManager, setShowTeamManager] = useState(false);
  const [userTeamRole, setUserTeamRole] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const canViewSpreadsheet = userTeamRole && ['owner', 'admin', 'sdr'].includes(userTeamRole);

  // Filter to show only cold email leads
  const coldEmailLeads = leads.filter(l => l.source_type === 'cold_email');

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
      await fetchTeams(session.user.id);
    };
    checkAuth();
  }, [navigate]);

  const fetchTeams = async (userId: string) => {
    setIsLoading(true);
    try {
      const { data: ownedTeams, error: ownedError } = await supabase
        .from("teams")
        .select("*")
        .eq("owner_id", userId);
      
      if (ownedError) throw ownedError;

      const { data: memberTeams, error: memberError } = await supabase
        .from("team_members")
        .select("team_id, teams(*)")
        .eq("user_id", userId);
      
      if (memberError) throw memberError;

      const allTeams: Team[] = [
        ...(ownedTeams || []),
        ...(memberTeams?.map((m: any) => m.teams).filter(Boolean) || [])
      ];

      const uniqueTeams = allTeams.filter((team, index, self) => 
        index === self.findIndex(t => t.id === team.id)
      );

      setTeams(uniqueTeams);

      if (uniqueTeams.length > 0 && !selectedTeamId) {
        setSelectedTeamId(uniqueTeams[0].id);
      }
    } catch (error: any) {
      console.error("Error fetching teams:", error);
      toast.error("Failed to load teams");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLeads = async (teamId: string) => {
    try {
      const { data, error } = await supabase
        .from("crm_leads")
        .select(`
          *,
          assigned_profile:profiles!crm_leads_assigned_to_fkey(id, full_name, email)
        `)
        .eq("team_id", teamId)
        .eq("source_type", "cold_email")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setLeads((data || []) as CRMLead[]);
    } catch (error: any) {
      console.error("Error fetching leads:", error);
      toast.error("Failed to load leads");
    }
  };

  const fetchTeamMembers = async (teamId: string) => {
    try {
      const { data, error } = await supabase
        .from("team_members")
        .select(`
          *,
          profile:profiles(id, full_name, email)
        `)
        .eq("team_id", teamId);

      if (error) throw error;
      
      const team = teams.find(t => t.id === teamId);
      if (team) {
        const { data: ownerProfile } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .eq("id", team.owner_id)
          .single();
        
        if (ownerProfile) {
          const ownerMember: TeamMember = {
            id: 'owner-' + team.owner_id,
            team_id: teamId,
            user_id: team.owner_id,
            role: 'owner',
            joined_at: team.created_at,
            profile: ownerProfile
          };
          
          const membersWithTypes = (data || []).map((m: any) => ({
            ...m,
            role: m.role as 'owner' | 'admin' | 'member'
          })) as TeamMember[];
          
          setTeamMembers([ownerMember, ...membersWithTypes]);
          return;
        }
      }
      
      const membersWithTypes = (data || []).map((m: any) => ({
        ...m,
        role: m.role as 'owner' | 'admin' | 'member'
      })) as TeamMember[];
      
      setTeamMembers(membersWithTypes);
    } catch (error: any) {
      console.error("Error fetching team members:", error);
    }
  };

  const fetchUserTeamRole = async (userId: string, teamId: string) => {
    try {
      const { data, error } = await supabase.rpc('get_team_role', {
        _user_id: userId,
        _team_id: teamId
      });
      if (error) throw error;
      setUserTeamRole(data);
    } catch (error) {
      console.error("Error fetching team role:", error);
      setUserTeamRole(null);
    }
  };

  useEffect(() => {
    if (selectedTeamId && user) {
      fetchLeads(selectedTeamId);
      fetchTeamMembers(selectedTeamId);
      fetchUserTeamRole(user.id, selectedTeamId);

      const channel = supabase
        .channel(`cold_email_leads_${selectedTeamId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'crm_leads',
            filter: `team_id=eq.${selectedTeamId}`
          },
          () => {
            fetchLeads(selectedTeamId);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [selectedTeamId, user]);

  const handleTeamCreated = (team: Team) => {
    setTeams(prev => [...prev, team]);
    setSelectedTeamId(team.id);
    setShowTeamManager(false);
  };

  const handleLeadUpdate = async (lead: CRMLead) => {
    try {
      const { error } = await supabase
        .from("crm_leads")
        .update({
          lead_name: lead.lead_name,
          lead_email: lead.lead_email,
          company: lead.company,
          meeting_booked: lead.meeting_booked,
          meeting_datetime: lead.meeting_datetime,
          meeting_status: lead.meeting_status,
          deal_value: lead.deal_value,
          status: lead.status,
          notes: lead.notes,
          assigned_to: lead.assigned_to
        })
        .eq("id", lead.id);

      if (error) throw error;

      await supabase.from("crm_lead_activities").insert({
        lead_id: lead.id,
        user_id: user.id,
        activity_type: 'status_change',
        description: 'Lead updated'
      });

      toast.success("Lead updated");
    } catch (error: any) {
      console.error("Error updating lead:", error);
      toast.error("Failed to update lead");
    }
  };

  const handleLeadCreate = async (lead: Partial<CRMLead>) => {
    if (!selectedTeamId || !user) return;

    try {
      const { data, error } = await supabase
        .from("crm_leads")
        .insert({
          team_id: selectedTeamId,
          created_by: user.id,
          lead_name: lead.lead_name || "New Lead",
          lead_email: lead.lead_email,
          company: lead.company,
          deal_value: lead.deal_value,
          status: lead.status || 'interested',
          source_type: 'cold_email',
          platform: 'manual'
        })
        .select()
        .single();

      if (error) throw error;

      await supabase.from("crm_lead_activities").insert({
        lead_id: data.id,
        user_id: user.id,
        activity_type: 'created',
        description: 'Cold email lead created'
      });

      toast.success("Lead created");
    } catch (error: any) {
      console.error("Error creating lead:", error);
      toast.error("Failed to create lead");
    }
  };

  const handleLeadDelete = async (leadId: string) => {
    try {
      await supabase.from("crm_lead_activities").delete().eq("lead_id", leadId);
      const { error } = await supabase.from("crm_leads").delete().eq("id", leadId);
      if (error) throw error;
      toast.success("Lead deleted");
    } catch (error: any) {
      console.error("Error deleting lead:", error);
      toast.error("Failed to delete lead");
    }
  };

  const importFromMasterInbox = async () => {
    if (!selectedTeamId || !user) {
      toast.error("Please select a team first");
      return;
    }

    setIsImporting(true);
    try {
      // Fetch all lead replies from Master Inbox for this user
      const { data: replies, error: repliesError } = await supabase
        .from("lead_replies")
        .select("*")
        .eq("user_id", user.id);

      if (repliesError) throw repliesError;

      if (!replies || replies.length === 0) {
        toast.info("No leads found in Master Inbox");
        return;
      }

      // Get existing lead emails to avoid duplicates
      const { data: existingLeads, error: existingError } = await supabase
        .from("crm_leads")
        .select("lead_email, source_id")
        .eq("team_id", selectedTeamId)
        .eq("source_type", "cold_email");

      if (existingError) throw existingError;

      const existingEmails = new Set(existingLeads?.map(l => l.lead_email?.toLowerCase()) || []);
      const existingSourceIds = new Set(existingLeads?.map(l => l.source_id) || []);

      // Filter out already imported leads
      const newReplies = replies.filter(reply => 
        !existingEmails.has(reply.lead_email?.toLowerCase()) && 
        !existingSourceIds.has(reply.id)
      );

      if (newReplies.length === 0) {
        toast.info("All leads are already imported");
        return;
      }

      // Map replies to CRM leads
      const leadsToInsert = newReplies.map(reply => ({
        team_id: selectedTeamId,
        created_by: user.id,
        lead_name: reply.lead_name || reply.lead_email?.split('@')[0] || 'Unknown',
        lead_email: reply.lead_email,
        campaign_name: reply.campaign_name,
        source_type: 'cold_email' as const,
        source_id: reply.id,
        platform: 'emailbison',
        status: 'interested' as const,
        interested: true,
        reply_count: 1,
        last_activity_at: reply.created_at
      }));

      // Bulk insert
      const { error: insertError } = await supabase
        .from("crm_leads")
        .insert(leadsToInsert);

      if (insertError) throw insertError;

      const skipped = replies.length - newReplies.length;
      toast.success(`Imported ${newReplies.length} leads${skipped > 0 ? ` (${skipped} duplicates skipped)` : ''}`);
      
      // Refresh leads
      fetchLeads(selectedTeamId);
    } catch (error: any) {
      console.error("Error importing leads:", error);
      toast.error("Failed to import leads");
    } finally {
      setIsImporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (teams.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MailPlus className="h-6 w-6" />
            Cold Email CRM
          </h1>
          <p className="text-muted-foreground">
            Leads from your cold email campaigns
          </p>
        </div>

        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
          <p className="text-muted-foreground">No teams found. Create a team in the SDR section first.</p>
          <Button onClick={() => navigate('/crm')}>Go to SDR</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MailPlus className="h-6 w-6" />
            Cold Email CRM
          </h1>
          <p className="text-muted-foreground">
            Leads from your cold email campaigns (synced from Master Inbox)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={importFromMasterInbox}
            disabled={isImporting || !selectedTeamId}
          >
            {isImporting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Import from Master Inbox
          </Button>
          <TeamSelector
            teams={teams}
            selectedTeamId={selectedTeamId}
            onSelect={setSelectedTeamId}
          />
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowTeamManager(true)}
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {selectedTeamId && (
        <>
          <QuickStats leads={coldEmailLeads} sourceType="cold_email" />

          <Tabs defaultValue="dashboard" className="space-y-4">
            <TabsList>
              <TabsTrigger value="dashboard" className="flex items-center gap-2">
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </TabsTrigger>
              <TabsTrigger value="spreadsheet" className="flex items-center gap-2">
                <Table2 className="h-4 w-4" />
                Leads Table
              </TabsTrigger>
              <TabsTrigger value="pipeline" className="flex items-center gap-2">
                <Kanban className="h-4 w-4" />
                Pipeline
              </TabsTrigger>
              <TabsTrigger value="templates" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Templates
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard">
              <FunnelDashboard leads={coldEmailLeads} sourceType="cold_email" />
            </TabsContent>

            <TabsContent value="spreadsheet">
              {canViewSpreadsheet ? (
                <ColdEmailLeadSpreadsheet
                  leads={coldEmailLeads}
                  teamMembers={teamMembers}
                  teamId={selectedTeamId}
                  onUpdate={handleLeadUpdate}
                  onCreate={handleLeadCreate}
                  onDelete={handleLeadDelete}
                />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  You don't have permission to view the leads table.
                </div>
              )}
            </TabsContent>

            <TabsContent value="pipeline">
              <LeadPipeline
                leads={coldEmailLeads}
                teamMembers={teamMembers}
                onUpdate={handleLeadUpdate}
                sourceType="cold_email"
              />
            </TabsContent>

            <TabsContent value="templates">
              <MessageTemplates
                teamId={selectedTeamId}
                userId={user?.id}
                leads={coldEmailLeads}
                userCalendlyLink={null}
                onCalendlyLinkUpdate={() => {}}
              />
            </TabsContent>
          </Tabs>
        </>
      )}

      <TeamManager
        open={showTeamManager}
        onOpenChange={setShowTeamManager}
        teams={teams}
        selectedTeamId={selectedTeamId}
        currentUserId={user?.id}
        onTeamCreated={handleTeamCreated}
        onTeamsUpdated={() => user && fetchTeams(user.id)}
      />
    </div>
  );
};

export default ColdEmailCRM;
