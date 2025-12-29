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
import { ArrowLeft, Check, X, RefreshCw, Unplug, Zap, Mail, Tag, Webhook, Copy } from "lucide-react";

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

  useEffect(() => {
    fetchIntegration();
  }, []);

  useEffect(() => {
    // Fetch tags when integration is connected and is EmailBison
    if (integration && integration.platform === 'emailbison') {
      fetchAvailableTags();
      if (integration.meetings_tag_id) {
        setSelectedTagId(integration.meetings_tag_id);
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl py-8">
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>

        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Platform Integration</h1>
            <p className="text-muted-foreground mt-2">
              Connect your outbound email platform to sync campaign data and enable AI-powered analysis.
            </p>
          </div>

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
    </div>
  );
}
