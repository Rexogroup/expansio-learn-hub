import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LeadSpreadsheet } from "@/components/crm/LeadSpreadsheet";
import { LeadPipeline } from "@/components/crm/LeadPipeline";
import { TeamSelector } from "@/components/crm/TeamSelector";
import { TeamManager } from "@/components/crm/TeamManager";
import { QuickStats } from "@/components/crm/QuickStats";
import { MessageTemplates } from "@/components/crm/MessageTemplates";
import { GrowthCopilotSheet } from "@/components/growth/GrowthCopilotSheet";
import { Button } from "@/components/ui/button";
import { Table2, Kanban, Settings, Plus, FileText } from "lucide-react";
import { toast } from "sonner";

export interface Team {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'sdr' | 'client' | 'member';
  joined_at: string;
  profile?: {
    id: string;
    full_name: string | null;
    email: string;
  };
}

export interface CRMLead {
  id: string;
  team_id: string;
  created_by: string;
  assigned_to: string | null;
  lead_name: string;
  lead_email: string | null;
  company: string | null;
  linkedin_url: string | null;
  first_reach_date: string | null;
  connection_sent: boolean;
  connection_accepted: boolean;
  interested: boolean;
  meeting_booked: boolean;
  meeting_datetime: string | null;
  meeting_status: 'scheduled' | 'completed' | 'no_show' | 'rescheduled' | null;
  deal_value: number | null;
  proposal_status: 'none' | 'sent' | 'viewed' | 'negotiating';
  status: 'new' | 'contacted' | 'interested' | 'meeting_booked' | 'meeting_completed' | 'proposal' | 'closed_won' | 'closed_lost';
  notes: string | null;
  source_type: string | null;
  source_id: string | null;
  created_at: string;
  updated_at: string;
  assigned_profile?: {
    id: string;
    full_name: string | null;
    email: string;
  } | null;
}

const CRM = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [leads, setLeads] = useState<CRMLead[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showTeamManager, setShowTeamManager] = useState(false);
  const [userCalendlyLink, setUserCalendlyLink] = useState<string | null>(null);
  const [userTeamRole, setUserTeamRole] = useState<string | null>(null);

  // SDR roles can see spreadsheet, clients cannot
  const canViewSpreadsheet = userTeamRole && ['owner', 'admin', 'sdr'].includes(userTeamRole);
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
      await fetchTeams(session.user.id);
      await fetchUserCalendlyLink(session.user.id);
    };
    checkAuth();
  }, [navigate]);

  const fetchUserCalendlyLink = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("calendly_link")
        .eq("id", userId)
        .single();

      if (error) throw error;
      setUserCalendlyLink(data?.calendly_link || null);
    } catch (error) {
      console.error("Error fetching calendly link:", error);
    }
  };

  const createSampleLeads = async (teamId: string, userId: string) => {
    const sampleLeads = [
      {
        team_id: teamId,
        created_by: userId,
        lead_name: "John Smith",
        company: "Acme Corp",
        lead_email: "john@acme.com",
        linkedin_url: "https://linkedin.com/in/johnsmith",
        first_reach_date: "2026-01-01",
        connection_sent: true,
        connection_accepted: true,
        interested: true,
        meeting_booked: false,
        deal_value: 15000,
        status: "interested" as const
      },
      {
        team_id: teamId,
        created_by: userId,
        lead_name: "Sarah Johnson",
        company: "TechStart Inc",
        lead_email: "sarah@techstart.io",
        linkedin_url: "https://linkedin.com/in/sarahjohnson",
        first_reach_date: "2025-12-28",
        connection_sent: true,
        connection_accepted: true,
        interested: true,
        meeting_booked: true,
        deal_value: 25000,
        status: "meeting_booked" as const
      },
      {
        team_id: teamId,
        created_by: userId,
        lead_name: "Mike Chen",
        company: "Growth Labs",
        lead_email: "mike@growthlabs.com",
        first_reach_date: "2025-12-20",
        connection_sent: true,
        connection_accepted: false,
        interested: false,
        meeting_booked: false,
        status: "contacted" as const
      },
      {
        team_id: teamId,
        created_by: userId,
        lead_name: "Emma Williams",
        company: "Scale Solutions",
        lead_email: "emma@scalesolutions.com",
        linkedin_url: "https://linkedin.com/in/emmawilliams",
        first_reach_date: "2025-12-15",
        connection_sent: true,
        connection_accepted: true,
        interested: true,
        meeting_booked: true,
        deal_value: 50000,
        status: "proposal" as const
      },
      {
        team_id: teamId,
        created_by: userId,
        lead_name: "David Brown",
        company: "Enterprise Co",
        lead_email: "david@enterprise.co",
        first_reach_date: "2025-12-01",
        connection_sent: true,
        connection_accepted: true,
        interested: true,
        meeting_booked: true,
        deal_value: 75000,
        status: "closed_won" as const
      }
    ];

    await supabase.from("crm_leads").insert(sampleLeads);
  };

  const fetchTeams = async (userId: string) => {
    setIsLoading(true);
    try {
      // Check if user is admin
      const { data: isAdmin } = await supabase.rpc('has_role', {
        _user_id: userId,
        _role: 'admin'
      });

      // Fetch teams where user is owner or member
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

      // Remove duplicates
      let uniqueTeams = allTeams.filter((team, index, self) => 
        index === self.findIndex(t => t.id === team.id)
      );

      // If admin with no teams, auto-create demo team with sample leads
      if (isAdmin && uniqueTeams.length === 0) {
        const { data: demoTeam, error: demoError } = await supabase
          .from("teams")
          .insert({ name: "Demo Team", owner_id: userId })
          .select()
          .single();
        
        if (!demoError && demoTeam) {
          // Add owner as team member
          await supabase.from("team_members").insert({
            team_id: demoTeam.id,
            user_id: userId,
            role: "owner"
          });
          
          // Create sample leads
          await createSampleLeads(demoTeam.id, userId);
          
          uniqueTeams = [demoTeam];
          toast.success("Demo team created with sample leads");
        }
      }

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
      
      // Also include team owner
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

      // Set up realtime subscription
      const channel = supabase
        .channel(`crm_leads_${selectedTeamId}`)
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

  const handleClearDemoData = async () => {
    if (!selectedTeamId || !user) return;
    
    const selectedTeam = teams.find(t => t.id === selectedTeamId);
    if (!selectedTeam || selectedTeam.name !== "Demo Team") return;

    try {
      // Delete all leads for this team
      await supabase.from("crm_leads").delete().eq("team_id", selectedTeamId);
      
      // Delete team members (except owner)
      await supabase.from("team_members").delete().eq("team_id", selectedTeamId);
      
      // Delete the team
      await supabase.from("teams").delete().eq("id", selectedTeamId);

      // Update state
      setTeams(prev => prev.filter(t => t.id !== selectedTeamId));
      setSelectedTeamId(null);
      setLeads([]);
      setTeamMembers([]);
      
      toast.success("Demo data cleared! Create a new team to start fresh.");
      setShowTeamManager(false);
    } catch (error: any) {
      console.error("Error clearing demo data:", error);
      toast.error("Failed to clear demo data");
    }
  };

  const handleLeadUpdate = async (lead: CRMLead) => {
    try {
      const { error } = await supabase
        .from("crm_leads")
        .update({
          lead_name: lead.lead_name,
          lead_email: lead.lead_email,
          company: lead.company,
          linkedin_url: lead.linkedin_url,
          first_reach_date: lead.first_reach_date,
          connection_sent: lead.connection_sent,
          connection_accepted: lead.connection_accepted,
          interested: lead.interested,
          meeting_booked: lead.meeting_booked,
          meeting_datetime: lead.meeting_datetime,
          meeting_status: lead.meeting_status,
          deal_value: lead.deal_value,
          proposal_status: lead.proposal_status,
          status: lead.status,
          notes: lead.notes,
          assigned_to: lead.assigned_to
        })
        .eq("id", lead.id);

      if (error) throw error;

      // Log activity
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
          linkedin_url: lead.linkedin_url,
          first_reach_date: lead.first_reach_date,
          connection_sent: lead.connection_sent || false,
          connection_accepted: lead.connection_accepted || false,
          interested: lead.interested || false,
          meeting_booked: lead.meeting_booked || false,
          deal_value: lead.deal_value,
          status: lead.status || 'new',
          source_type: 'manual'
        })
        .select()
        .single();

      if (error) throw error;

      // Log activity
      await supabase.from("crm_lead_activities").insert({
        lead_id: data.id,
        user_id: user.id,
        activity_type: 'created',
        description: 'Lead created'
      });

      toast.success("Lead created");
      fetchLeads(selectedTeamId);
    } catch (error: any) {
      console.error("Error creating lead:", error);
      toast.error("Failed to create lead");
    }
  };

  const handleLeadDelete = async (leadId: string) => {
    try {
      const { error } = await supabase
        .from("crm_leads")
        .delete()
        .eq("id", leadId);

      if (error) throw error;
      toast.success("Lead deleted");
      if (selectedTeamId) fetchLeads(selectedTeamId);
    } catch (error: any) {
      console.error("Error deleting lead:", error);
      toast.error("Failed to delete lead");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">CRM</h1>
            <p className="text-muted-foreground">Track your outbound leads and deals</p>
          </div>
          <div className="flex items-center gap-3">
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

        {teams.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 border rounded-lg bg-muted/20">
            <h2 className="text-xl font-semibold mb-2">Create Your First Team</h2>
            <p className="text-muted-foreground mb-4">
              Get started by creating a team to track your leads
            </p>
            <Button onClick={() => setShowTeamManager(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Team
            </Button>
          </div>
        ) : (
          <>
            <QuickStats leads={leads} />

            <Tabs defaultValue={canViewSpreadsheet ? "spreadsheet" : "pipeline"} className="mt-6">
              <TabsList>
                {canViewSpreadsheet && (
                  <TabsTrigger value="spreadsheet" className="gap-2">
                    <Table2 className="h-4 w-4" />
                    Spreadsheet
                  </TabsTrigger>
                )}
                <TabsTrigger value="pipeline" className="gap-2">
                  <Kanban className="h-4 w-4" />
                  Pipeline
                </TabsTrigger>
                <TabsTrigger value="templates" className="gap-2">
                  <FileText className="h-4 w-4" />
                  Templates
                </TabsTrigger>
              </TabsList>

              {canViewSpreadsheet && (
                <TabsContent value="spreadsheet" className="mt-4">
                  <LeadSpreadsheet
                    leads={leads}
                    teamMembers={teamMembers}
                    teamId={selectedTeamId!}
                    userCalendlyLink={userCalendlyLink}
                    onUpdate={handleLeadUpdate}
                    onCreate={handleLeadCreate}
                    onDelete={handleLeadDelete}
                  />
                </TabsContent>
              )}

              <TabsContent value="pipeline" className="mt-4">
                <LeadPipeline
                  leads={leads}
                  teamMembers={teamMembers}
                  onUpdate={handleLeadUpdate}
                />
              </TabsContent>

              <TabsContent value="templates" className="mt-4">
                <MessageTemplates
                  teamId={selectedTeamId!}
                  userId={user?.id}
                  leads={leads}
                  userCalendlyLink={userCalendlyLink}
                  onCalendlyLinkUpdate={setUserCalendlyLink}
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
          onClearDemoData={handleClearDemoData}
        />
      </main>
      <GrowthCopilotSheet />
    </div>
  );
};

export default CRM;
