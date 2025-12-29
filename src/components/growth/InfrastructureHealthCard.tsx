import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  RefreshCw, 
  Mail, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Flame,
  Send
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface EmailHealth {
  id: string;
  sender_email_id: string;
  email_address: string;
  account_type: string;
  connection_status: string;
  warmup_enabled: boolean;
  warmup_progress: number | null;
  daily_limit: number;
  emails_sent_today: number;
  last_checked_at: string;
}

interface HealthSummary {
  total_accounts: number;
  connected_accounts: number;
  error_accounts: number;
  warmup_enabled_accounts: number;
  total_daily_limit: number;
  total_emails_sent_today: number;
  average_warmup_progress: number | null;
}

export function InfrastructureHealthCard() {
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [healthData, setHealthData] = useState<EmailHealth[]>([]);
  const [summary, setSummary] = useState<HealthSummary | null>(null);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);

  useEffect(() => {
    fetchHealthData();
  }, []);

  const fetchHealthData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from('email_account_health')
        .select('*')
        .eq('user_id', session.user.id)
        .order('email_address');

      if (error) throw error;

      if (data && data.length > 0) {
        setHealthData(data);
        setLastSyncAt(data[0].last_checked_at);
        
        // Calculate summary
        const sum: HealthSummary = {
          total_accounts: data.length,
          connected_accounts: data.filter(d => d.connection_status === 'connected').length,
          error_accounts: data.filter(d => d.connection_status === 'error').length,
          warmup_enabled_accounts: data.filter(d => d.warmup_enabled).length,
          total_daily_limit: data.reduce((acc, d) => acc + (d.daily_limit || 0), 0),
          total_emails_sent_today: data.reduce((acc, d) => acc + (d.emails_sent_today || 0), 0),
          average_warmup_progress: null,
        };
        
        const warmupAccounts = data.filter(d => d.warmup_progress !== null);
        if (warmupAccounts.length > 0) {
          sum.average_warmup_progress = warmupAccounts.reduce((acc, d) => acc + (d.warmup_progress || 0), 0) / warmupAccounts.length;
        }
        
        setSummary(sum);
      }
    } catch (error) {
      console.error('Error fetching health data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await supabase.functions.invoke('sync-email-health', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        if (response.error.message?.includes('NO_INTEGRATION')) {
          toast.error('No EmailBison integration found. Connect your account in Integrations.');
        } else {
          throw response.error;
        }
        return;
      }

      toast.success('Email health data synced');
      await fetchHealthData();
    } catch (error) {
      console.error('Error syncing health:', error);
      toast.error('Failed to sync email health data');
    } finally {
      setSyncing(false);
    }
  };

  const getHealthScore = () => {
    if (!summary || summary.total_accounts === 0) return 0;
    return Math.round((summary.connected_accounts / summary.total_accounts) * 100);
  };

  const getHealthColor = (score: number) => {
    if (score >= 90) return 'text-emerald-500';
    if (score >= 70) return 'text-amber-500';
    return 'text-destructive';
  };

  const formatLastSync = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  const healthScore = getHealthScore();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="flex items-center gap-2">
          <Mail className="w-5 h-5 text-primary" />
          Infrastructure Health
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={handleSync}
          disabled={syncing}
          className="gap-2"
        >
          <RefreshCw className={cn("w-4 h-4", syncing && "animate-spin")} />
          {syncing ? 'Syncing...' : 'Refresh'}
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {!summary || summary.total_accounts === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Mail className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">No email accounts found</p>
            <p className="text-sm mt-1">Click Refresh to sync your EmailBison accounts</p>
          </div>
        ) : (
          <>
            {/* Health Score */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Health Score</p>
                <p className={cn("text-4xl font-bold", getHealthColor(healthScore))}>
                  {healthScore}%
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Last checked</p>
                <p className="text-sm font-medium">{formatLastSync(lastSyncAt)}</p>
              </div>
            </div>

            {/* Account Status Summary */}
            <div className="grid grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <div>
                  <p className="text-lg font-semibold">{summary.connected_accounts}</p>
                  <p className="text-xs text-muted-foreground">Connected</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-destructive" />
                <div>
                  <p className="text-lg font-semibold">{summary.error_accounts}</p>
                  <p className="text-xs text-muted-foreground">Errors</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-amber-500" />
                <div>
                  <p className="text-lg font-semibold">{summary.warmup_enabled_accounts}</p>
                  <p className="text-xs text-muted-foreground">Warming</p>
                </div>
              </div>
            </div>

            {/* Sending Capacity */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <Send className="w-4 h-4" />
                  Daily Sending Capacity
                </span>
                <span className="font-medium">
                  {summary.total_emails_sent_today.toLocaleString()} / {summary.total_daily_limit.toLocaleString()}
                </span>
              </div>
              <Progress 
                value={summary.total_daily_limit > 0 
                  ? (summary.total_emails_sent_today / summary.total_daily_limit) * 100 
                  : 0
                } 
                className="h-2"
              />
              <p className="text-xs text-muted-foreground text-right">
                {(summary.total_daily_limit - summary.total_emails_sent_today).toLocaleString()} emails remaining today
              </p>
            </div>

            {/* Error Accounts Warning */}
            {summary.error_accounts > 0 && (
              <div className="flex items-start gap-3 p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-destructive">
                    {summary.error_accounts} account{summary.error_accounts > 1 ? 's need' : ' needs'} attention
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Check your EmailBison dashboard to reconnect failed accounts
                  </p>
                </div>
              </div>
            )}

            {/* Account List Preview */}
            {healthData.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Accounts</p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {healthData.slice(0, 5).map((account) => (
                    <div 
                      key={account.id}
                      className="flex items-center justify-between p-2 bg-muted/50 rounded-lg"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {account.connection_status === 'connected' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-destructive flex-shrink-0" />
                        )}
                        <span className="text-sm truncate">{account.email_address}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {account.warmup_enabled && (
                          <Badge variant="outline" className="text-xs">
                            <Flame className="w-3 h-3 mr-1" />
                            {account.warmup_progress || 0}%
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {account.emails_sent_today}/{account.daily_limit}
                        </span>
                      </div>
                    </div>
                  ))}
                  {healthData.length > 5 && (
                    <p className="text-xs text-muted-foreground text-center py-1">
                      +{healthData.length - 5} more accounts
                    </p>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
