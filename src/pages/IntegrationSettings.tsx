import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Check, X, RefreshCw, Unplug, Zap, Mail, Tag, Webhook, Copy, Calendar, Clock, Users } from "lucide-react";

type Platform = 'instantly' | 'emailbison';
type SyncStatus = 'pending' | 'syncing' | 'success' | 'error';

interface Integration {
  id: string;
  platform: Platform;
  api_key: string;
  is_active: boolean;
  last_sync_at: string | null;
  sync_status: SyncStatus;
  sync_error: string | null;
  meetings_tag_id: string | null;
  meetings_tag_name: string | null;
  cold_email_team_id: string | null;
}

interface SyncedCampaign {
  id: string;
  campaign_name: string;
  campaign_status: string;
  emails_sent: number;
  unique_opens: number;
  unique_replies: number;
  interested_count: number;
  meetings_booked: number;
  open_rate: number;
  reply_rate: number;
  interested_rate: number;
  synced_at: string;
}

interface EmailBisonTag {
  id: string;
  name: string;
}

interface Team {
  id: string;
  name: string;
}

export default function IntegrationSettings() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [integration, setIntegration] = useState<Integration | null>(null);
  const [campaigns, setCampaigns] = useState<SyncedCampaign[]>([]);
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Meetings tag state
  const [availableTags, setAvailableTags] = useState<EmailBisonTag[]>([]);
  const [loadingTags, setLoadingTags] = useState(false);
  const [selectedTagId, setSelectedTagId] = useState<string>("");
  const [savingTag, setSavingTag] = useState(false);

  // Scheduling settings state
  const [calendarLink, setCalendarLink] = useState("");
  const [userTimezone, setUserTimezone] = useState("America/New_York");
  const [meetingDuration, setMeetingDuration] = useState(15);
  const [savingScheduling, setSavingScheduling] = useState(false);
  const [loadingScheduling, setLoadingScheduling] = useState(true);

  // CRM Team state
  const [userTeams, setUserTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [savingTeam, setSavingTeam] = useState(false);

  useEffect(() => {
    fetchIntegration();
    fetchSchedulingSettings();
    fetchUserTeams();
  }, []);

  async function fetchSchedulingSettings() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('calendar_link, timezone, default_meeting_duration')
        .eq('id', user.id)
        .single();

      if (profile) {
        setCalendarLink(profile.calendar_link || '');
        setUserTimezone(profile.timezone || 'America/New_York');
        setMeetingDuration(profile.default_meeting_duration || 15);
      }
    } catch (error) {
      console.error('Error fetching scheduling settings:', error);
    } finally {
      setLoadingScheduling(false);
    }
  }

  async function fetchUserTeams() {
    setLoadingTeams(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch teams where user is owner
      const { data: ownedTeams } = await supabase
        .from('teams')
        .select('id, name')
        .eq('owner_id', user.id);

      // Fetch teams where user is a member
      const { data: memberTeams } = await supabase
        .from('team_members')
        .select('teams(id, name)')
        .eq('user_id', user.id);

      const allTeams: Team[] = [
        ...(ownedTeams || []),
        ...(memberTeams?.map((m: any) => m.teams).filter(Boolean) || [])
      ];

      // Remove duplicates
      const uniqueTeams = allTeams.filter((team, index, self) => 
        index === self.findIndex(t => t.id === team.id)
      );

      setUserTeams(uniqueTeams);
    } catch (error) {
      console.error('Error fetching teams:', error);
    } finally {
      setLoadingTeams(false);
    }
  }

  async function saveColdEmailTeam() {
    if (!integration || !selectedTeamId) return;
    
    setSavingTeam(true);
    try {
      const { error } = await supabase
        .from('user_integrations')
        .update({ cold_email_team_id: selectedTeamId })
        .eq('id', integration.id);

      if (error) throw error;

      setIntegration({
        ...integration,
        cold_email_team_id: selectedTeamId,
      });

      const selectedTeam = userTeams.find(t => t.id === selectedTeamId);
      toast.success("CRM Team saved!", {
        description: `Cold email leads will be added to "${selectedTeam?.name}"`
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error("Failed to save team", { description: errorMessage });
    } finally {
      setSavingTeam(false);
    }
  }

  async function saveSchedulingSettings() {
    setSavingScheduling(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from('profiles')
        .update({
          calendar_link: calendarLink || null,
          timezone: userTimezone,
          default_meeting_duration: meetingDuration,
        })
        .eq('id', user.id);

      if (error) throw error;

      toast.success("Scheduling settings saved!", {
        description: "Your calendar link and timezone will be used in AI-generated replies."
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error("Failed to save settings", { description: errorMessage });
    } finally {
      setSavingScheduling(false);
    }
  }

  useEffect(() => {
    // Fetch tags when integration is connected and is EmailBison
    if (integration && integration.platform === 'emailbison') {
      fetchAvailableTags();
      if (integration.meetings_tag_id) {
        setSelectedTagId(integration.meetings_tag_id);
      }
      if (integration.cold_email_team_id) {
        setSelectedTeamId(integration.cold_email_team_id);
      }
    }
  }, [integration?.id]);

  async function fetchIntegration() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      const { data: integrationData } = await supabase
        .from('user_integrations')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (integrationData) {
        setIntegration(integrationData as Integration);
        setSelectedPlatform(integrationData.platform as Platform);

        // Fetch synced campaigns
        const { data: campaignsData } = await supabase
          .from('synced_campaigns')
          .select('*')
          .eq('user_id', user.id)
          .order('emails_sent', { ascending: false });

        if (campaignsData) {
          setCampaigns(campaignsData.map(c => ({
            ...c,
            meetings_booked: c.meetings_booked || 0,
          })) as SyncedCampaign[]);
        }
      }
    } catch (error) {
      console.error('Error fetching integration:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchAvailableTags() {
    if (!integration) return;
    
    setLoadingTags(true);
    try {
      // Fetch tags from EmailBison API via edge function
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('https://send.expansio.io/api/tags', {
        headers: {
          'Authorization': `Bearer ${integration.api_key}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const tagsData = await response.json();
        const tags = tagsData.data || tagsData || [];
        setAvailableTags(tags.map((t: { id: string | number; name: string }) => ({
          id: t.id.toString(),
          name: t.name,
        })));
      }
    } catch (error) {
      console.error('Error fetching tags:', error);
    } finally {
      setLoadingTags(false);
    }
  }

  async function saveMeetingsTag() {
    if (!integration || !selectedTagId) return;
    
    setSavingTag(true);
    try {
      const selectedTag = availableTags.find(t => t.id === selectedTagId);
      
      const { error } = await supabase
        .from('user_integrations')
        .update({
          meetings_tag_id: selectedTagId,
          meetings_tag_name: selectedTag?.name || null,
        })
        .eq('id', integration.id);

      if (error) throw error;

      setIntegration({
        ...integration,
        meetings_tag_id: selectedTagId,
        meetings_tag_name: selectedTag?.name || null,
      });

      toast.success("Meetings tag saved!", {
        description: `"${selectedTag?.name}" will be used to track booked meetings.`
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error("Failed to save tag", { description: errorMessage });
    } finally {
      setSavingTag(false);
    }
  }

  async function testConnection() {
    if (!selectedPlatform || !apiKey) {
      toast.error("Please select a platform and enter your API key");
      return;
    }

    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke('validate-api-connection', {
        body: { platform: selectedPlatform, apiKey }
      });

      if (error) throw error;

      if (data.valid) {
        toast.success("Connection successful!", {
          description: data.accountInfo?.accountCount 
            ? `Found ${data.accountInfo.accountCount} email accounts`
            : "Your API key is valid"
        });
      } else {
        toast.error("Connection failed", { description: data.error });
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error("Connection test failed", { description: errorMessage });
    } finally {
      setTesting(false);
    }
  }

  async function saveIntegration() {
    if (!selectedPlatform || !apiKey) {
      toast.error("Please select a platform and enter your API key");
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Test connection first
      const { data: validationData, error: validationError } = await supabase.functions.invoke('validate-api-connection', {
        body: { platform: selectedPlatform, apiKey }
      });

      if (validationError || !validationData.valid) {
        toast.error("Invalid API key", { description: validationData?.error || "Please check your credentials" });
        return;
      }

      // Upsert integration
      const { error } = await supabase
        .from('user_integrations')
        .upsert({
          user_id: user.id,
          platform: selectedPlatform,
          api_key: apiKey,
          is_active: true,
          sync_status: 'pending'
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      toast.success("Integration saved!", { description: "Starting initial sync..." });
      
      // Trigger initial sync
      await fetchIntegration();
      await syncData();

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error("Failed to save integration", { description: errorMessage });
    } finally {
      setSaving(false);
    }
  }

  async function syncData() {
    setSyncing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke('sync-campaign-data', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) throw error;

      toast.success("Sync complete!", {
        description: `Synced ${data.campaigns_synced} campaigns`
      });

      await fetchIntegration();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error("Sync failed", { description: errorMessage });
    } finally {
      setSyncing(false);
    }
  }

  async function disconnectIntegration() {
    if (!integration) return;

    try {
      const { error } = await supabase
        .from('user_integrations')
        .update({ is_active: false })
        .eq('id', integration.id);

      if (error) throw error;

      setIntegration(null);
      setCampaigns([]);
      setSelectedPlatform(null);
      setApiKey("");
      setAvailableTags([]);
      setSelectedTagId("");
      toast.success("Integration disconnected");
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error("Failed to disconnect", { description: errorMessage });
    }
  }

  function formatDate(dateString: string | null) {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  }

  function getSyncStatusBadge(status: SyncStatus) {
    switch (status) {
      case 'success':
        return <Badge variant="default" className="bg-green-500"><Check className="w-3 h-3 mr-1" /> Connected</Badge>;
      case 'syncing':
        return <Badge variant="secondary"><RefreshCw className="w-3 h-3 mr-1 animate-spin" /> Syncing</Badge>;
      case 'error':
        return <Badge variant="destructive"><X className="w-3 h-3 mr-1" /> Error</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-8">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Integrations</h1>
          <p className="text-muted-foreground mt-2">
            Connect your outbound email platform to sync campaign data and enable AI-powered analysis.
          </p>
        </div>

          {/* Scheduling Settings Card - Always visible */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-violet-500" />
                </div>
                <div>
                  <CardTitle className="text-lg">Scheduling Settings</CardTitle>
                  <CardDescription>
                    Configure your calendar link and timezone for AI-generated meeting requests
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingScheduling ? (
                <div className="flex items-center justify-center py-4">
                  <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label>Calendar Booking Link</Label>
                    <Input
                      placeholder="https://calendly.com/yourname/15min"
                      value={calendarLink}
                      onChange={(e) => setCalendarLink(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Your Calendly, Cal.com, or other booking link. This will be included in AI-generated replies.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Your Timezone</Label>
                      <Select value={userTimezone} onValueChange={setUserTimezone}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                          <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
                          <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
                          <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                          <SelectItem value="America/Phoenix">Arizona (MST)</SelectItem>
                          <SelectItem value="Europe/London">London (GMT/BST)</SelectItem>
                          <SelectItem value="Europe/Paris">Central European (CET)</SelectItem>
                          <SelectItem value="Europe/Rome">Rome (CET)</SelectItem>
                          <SelectItem value="Asia/Dubai">Dubai (GST)</SelectItem>
                          <SelectItem value="Asia/Singapore">Singapore (SGT)</SelectItem>
                          <SelectItem value="Australia/Sydney">Sydney (AEST)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Default Meeting Duration</Label>
                      <Select 
                        value={meetingDuration.toString()} 
                        onValueChange={(v) => setMeetingDuration(parseInt(v))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="15">15 minutes</SelectItem>
                          <SelectItem value="30">30 minutes</SelectItem>
                          <SelectItem value="45">45 minutes</SelectItem>
                          <SelectItem value="60">60 minutes</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Button
                    onClick={saveSchedulingSettings}
                    disabled={savingScheduling}
                    className="w-full"
                  >
                    {savingScheduling ? (
                      <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                    ) : (
                      <><Clock className="w-4 h-4 mr-2" /> Save Scheduling Settings</>
                    )}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {integration ? (
            <>
              {/* Connected State */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {integration.platform === 'instantly' ? (
                        <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                          <Zap className="w-6 h-6 text-blue-500" />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-orange-500/10 flex items-center justify-center">
                          <Mail className="w-6 h-6 text-orange-500" />
                        </div>
                      )}
                      <div>
                        <CardTitle className="capitalize">{integration.platform}</CardTitle>
                        <CardDescription>
                          Last synced: {formatDate(integration.last_sync_at)}
                        </CardDescription>
                      </div>
                    </div>
                    {getSyncStatusBadge(integration.sync_status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {integration.sync_error && (
                    <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
                      {integration.sync_error}
                    </div>
                  )}
                  
                  <div className="flex gap-3">
                    <Button 
                      onClick={syncData} 
                      disabled={syncing}
                    >
                      <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                      {syncing ? 'Syncing...' : 'Sync Now'}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={disconnectIntegration}
                    >
                      <Unplug className="w-4 h-4 mr-2" /> Disconnect
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Meetings Tag Configuration (EmailBison only) */}
              {integration.platform === 'emailbison' && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Tag className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Meetings Tracking</CardTitle>
                        <CardDescription>
                          Select the tag you use to mark leads when a meeting is booked
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Meetings Booked Tag</Label>
                      <div className="flex gap-2">
                        <Select
                          value={selectedTagId}
                          onValueChange={setSelectedTagId}
                          disabled={loadingTags}
                        >
                          <SelectTrigger className="flex-1">
                            {loadingTags ? (
                              <span className="text-muted-foreground">Loading tags...</span>
                            ) : (
                              <SelectValue placeholder="Select a tag" />
                            )}
                          </SelectTrigger>
                          <SelectContent>
                            {availableTags.map((tag) => (
                              <SelectItem key={tag.id} value={tag.id}>
                                {tag.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          onClick={saveMeetingsTag}
                          disabled={savingTag || !selectedTagId || selectedTagId === integration.meetings_tag_id}
                        >
                          {savingTag ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            'Save'
                          )}
                        </Button>
                      </div>
                      {integration.meetings_tag_name && (
                        <p className="text-sm text-muted-foreground">
                          Currently tracking: <span className="font-medium">{integration.meetings_tag_name}</span>
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Leads with this tag will be counted as "Meetings Booked" during sync.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* CRM Team Assignment (EmailBison only) */}
              {integration.platform === 'emailbison' && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                        <Users className="w-5 h-5 text-blue-500" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Cold Email CRM</CardTitle>
                        <CardDescription>
                          Automatically add interested leads to your CRM team
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Default CRM Team</Label>
                      <div className="flex gap-2">
                        <Select
                          value={selectedTeamId}
                          onValueChange={setSelectedTeamId}
                          disabled={loadingTeams}
                        >
                          <SelectTrigger className="flex-1">
                            {loadingTeams ? (
                              <span className="text-muted-foreground">Loading teams...</span>
                            ) : (
                              <SelectValue placeholder="Select a team" />
                            )}
                          </SelectTrigger>
                          <SelectContent>
                            {userTeams.map((team) => (
                              <SelectItem key={team.id} value={team.id}>
                                {team.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          onClick={saveColdEmailTeam}
                          disabled={savingTeam || !selectedTeamId || selectedTeamId === integration.cold_email_team_id}
                        >
                          {savingTeam ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            'Save'
                          )}
                        </Button>
                      </div>
                      {integration.cold_email_team_id && (
                        <p className="text-sm text-muted-foreground">
                          Leads will be added to: <span className="font-medium">{userTeams.find(t => t.id === integration.cold_email_team_id)?.name || 'Selected team'}</span>
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Interested replies will automatically create leads in the Cold Email tab of your CRM.
                      </p>
                    </div>
                    {userTeams.length === 0 && !loadingTeams && (
                      <div className="p-3 bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 rounded-lg text-sm">
                        No teams found. Create a team in the SDR page first to enable automatic CRM sync.
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Webhook Setup Instructions (EmailBison only) */}
              {integration.platform === 'emailbison' && integration.meetings_tag_name && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                        <Webhook className="w-5 h-5 text-emerald-500" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Real-Time Meetings Tracking</CardTitle>
                        <CardDescription>
                          Set up a webhook to track meetings with timeline accuracy
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                      <p className="text-sm text-muted-foreground">
                        To accurately track when meetings are booked across different time periods, 
                        set up a webhook in your EmailBison workspace:
                      </p>
                      <ol className="text-sm space-y-2 list-decimal list-inside text-muted-foreground">
                        <li>Go to EmailBison → Settings → Webhooks</li>
                        <li>Create a new webhook with the URL below</li>
                        <li>Subscribe to the <code className="bg-muted px-1 rounded">tag_attached</code> event</li>
                        <li>Save and activate the webhook</li>
                      </ol>
                      <div className="space-y-2">
                        <Label className="text-xs">Webhook URL</Label>
                        <div className="flex gap-2">
                          <code className="flex-1 p-2 bg-background border rounded text-xs break-all">
                            https://teelukblrpynzcdabtuu.supabase.co/functions/v1/handle-emailbison-webhook
                          </code>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              navigator.clipboard.writeText('https://teelukblrpynzcdabtuu.supabase.co/functions/v1/handle-emailbison-webhook');
                              toast.success("Copied to clipboard");
                            }}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Once set up, meetings will be tracked in real-time and the timeline filter will show accurate data.
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Interested Replies Webhook Setup (EmailBison only) */}
              {integration.platform === 'emailbison' && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-teal-500/10 flex items-center justify-center">
                        <Mail className="w-5 h-5 text-teal-500" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Real-Time Interested Replies</CardTitle>
                        <CardDescription>
                          Automatically sync interested leads to your Master Inbox
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                      <p className="text-sm text-muted-foreground">
                        Set up a webhook to receive interested replies in real-time 
                        without manual syncing:
                      </p>
                      <ol className="text-sm space-y-2 list-decimal list-inside text-muted-foreground">
                        <li>Go to EmailBison → Settings → Webhooks</li>
                        <li>Create a new webhook with the URL below</li>
                        <li>Subscribe to the <code className="bg-muted px-1 rounded">LEAD_INTERESTED</code> event</li>
                        <li>Save and activate the webhook</li>
                      </ol>
                      <div className="space-y-2">
                        <Label className="text-xs">Webhook URL</Label>
                        <div className="flex gap-2">
                          <code className="flex-1 p-2 bg-background border rounded text-xs break-all">
                            https://teelukblrpynzcdabtuu.supabase.co/functions/v1/handle-emailbison-webhook
                          </code>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              navigator.clipboard.writeText('https://teelukblrpynzcdabtuu.supabase.co/functions/v1/handle-emailbison-webhook');
                              toast.success("Copied to clipboard");
                            }}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Once configured, interested replies will appear in your Master Inbox within seconds of being received.
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Synced Campaigns */}
              {campaigns.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Synced Campaigns ({campaigns.length})</CardTitle>
                    <CardDescription>
                      Campaign data used for AI analysis and KPI tracking
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {campaigns.map((campaign) => (
                        <div 
                          key={campaign.id}
                          className="p-4 border rounded-lg space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{campaign.campaign_name}</span>
                            <Badge variant="outline" className="capitalize">
                              {campaign.campaign_status}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-5 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Sent</span>
                              <p className="font-medium">{campaign.emails_sent.toLocaleString()}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Replies</span>
                              <p className="font-medium">{campaign.unique_replies.toLocaleString()}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Interested</span>
                              <p className="font-medium">{campaign.interested_count.toLocaleString()}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Meetings</span>
                              <p className="font-medium">{campaign.meetings_booked.toLocaleString()}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">IR%</span>
                              <p className="font-medium">{campaign.interested_rate.toFixed(2)}%</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <>
              {/* Setup State */}
              <Card>
                <CardHeader>
                  <CardTitle>Select Your Platform</CardTitle>
                  <CardDescription>
                    Choose the email platform you use for outbound campaigns
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => setSelectedPlatform('instantly')}
                      className={`p-6 border-2 rounded-xl text-left transition-all ${
                        selectedPlatform === 'instantly' 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center mb-3">
                        <Zap className="w-6 h-6 text-blue-500" />
                      </div>
                      <h3 className="font-semibold text-lg">Instantly.ai</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Cold email at scale with unlimited sending accounts
                      </p>
                    </button>

                    <button
                      onClick={() => setSelectedPlatform('emailbison')}
                      className={`p-6 border-2 rounded-xl text-left transition-all ${
                        selectedPlatform === 'emailbison' 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="w-12 h-12 rounded-lg bg-orange-500/10 flex items-center justify-center mb-3">
                        <Mail className="w-6 h-6 text-orange-500" />
                      </div>
                      <h3 className="font-semibold text-lg">EmailBison</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Powerful email automation and campaign management
                      </p>
                    </button>
                  </div>

                  {selectedPlatform && (
                    <div className="space-y-4 pt-4 border-t">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">API Key</label>
                        <div className="flex gap-2">
                          <Input
                            type="password"
                            placeholder={`Enter your ${selectedPlatform === 'instantly' ? 'Instantly.ai' : 'EmailBison'} API key`}
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                          />
                          <Button
                            variant="outline"
                            onClick={testConnection}
                            disabled={testing || !apiKey}
                          >
                            {testing ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Test'}
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {selectedPlatform === 'instantly' 
                            ? 'Find your API key in Instantly → Settings → Integrations → API'
                            : 'Find your API key in EmailBison → Settings → Developer API'}
                        </p>
                      </div>

                      <Button 
                        onClick={saveIntegration}
                        disabled={saving || !apiKey}
                        className="w-full"
                      >
                        {saving ? (
                          <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Connecting...</>
                        ) : (
                          'Connect Platform'
                        )}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-muted/50">
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-2">Why connect your platform?</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-green-500 mt-0.5" />
                      <span>Automatic campaign data sync for real-time KPI tracking</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-green-500 mt-0.5" />
                      <span>AI-powered analysis compares your performance to benchmarks</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-green-500 mt-0.5" />
                      <span>Get specific recommendations based on your actual data</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-green-500 mt-0.5" />
                      <span>Track trends and validate growth steps automatically</span>
                    </li>
                  </ul>
                </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
