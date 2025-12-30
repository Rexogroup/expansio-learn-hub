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
  Send,
  AlertTriangle,
  ShieldAlert
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
  bounce_rate?: number;
  health_score?: number;
  is_at_risk?: boolean;
}

interface HealthSummary {
  total_accounts: number;
  connected_accounts: number;
  error_accounts: number;
  warmup_enabled_accounts: number;
  total_daily_limit: number;
  total_emails_sent_today: number;
  average_warmup_progress: number | null;
  at_risk_accounts: number;
}

interface EmailAlert {
  id: string;
  sender_email_id: string;
  email_address: string;
  alert_type: string;
  severity: string;
  current_value: number;
  threshold_value: number;
  recommended_action: string;
  status: string;
  created_at: string;
}

export function InfrastructureHealthCard() {
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [healthData, setHealthData] = useState<EmailHealth[]>([]);
  const [summary, setSummary] = useState<HealthSummary | null>(null);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<EmailAlert[]>([]);

  useEffect(() => {
    fetchHealthData();
  }, []);

  const fetchHealthData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Fetch health data and alerts in parallel
      const [healthResponse, alertsResponse] = await Promise.all([
        supabase
          .from('email_account_health')
          .select('*')
          .eq('user_id', session.user.id)
          .order('email_address'),
        supabase
          .from('email_account_alerts')
          .select('*')
          .eq('user_id', session.user.id)
          .eq('status', 'active')
          .order('severity', { ascending: true })
      ]);

      if (healthResponse.error) throw healthResponse.error;

      const data = healthResponse.data;
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
          at_risk_accounts: data.filter(d => d.is_at_risk).length,
        };
        
        const warmupAccounts = data.filter(d => d.warmup_progress !== null);
        if (warmupAccounts.length > 0) {
          sum.average_warmup_progress = warmupAccounts.reduce((acc, d) => acc + (d.warmup_progress || 0), 0) / warmupAccounts.length;
        }
        
        setSummary(sum);
      }

      if (alertsResponse.data) {
        setAlerts(alertsResponse.data);
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

  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('email_account_alerts')
        .update({ status: 'acknowledged' })
        .eq('id', alertId);

      if (error) throw error;
      
      toast.success('Alert acknowledged');
      setAlerts(prev => prev.filter(a => a.id !== alertId));
    } catch (error) {
      console.error('Error acknowledging alert:', error);
      toast.error('Failed to acknowledge alert');
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

  const getAccountStatusColor = (account: EmailHealth) => {
    if (account.is_at_risk) return 'border-destructive/50 bg-destructive/5';
    if (account.connection_status === 'error') return 'border-destructive/50 bg-destructive/5';
    if ((account.health_score ?? 100) < 90) return 'border-amber-500/50 bg-amber-500/5';
    return 'bg-muted/50';
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

  const criticalAlerts = alerts.filter(a => a.severity === 'critical');
  const warningAlerts = alerts.filter(a => a.severity === 'warning');

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
            {/* Critical Alerts Banner */}
            {criticalAlerts.length > 0 && (
              <div className="flex items-start gap-3 p-4 bg-destructive/10 rounded-lg border border-destructive/30">
                <ShieldAlert className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-destructive">
                    {criticalAlerts.length} account{criticalAlerts.length > 1 ? 's need' : ' needs'} immediate attention
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    High bounce rate or low health score detected. Pause these accounts from campaigns to prevent damage.
                  </p>
                </div>
              </div>
            )}

            {/* Warning Alerts Banner */}
            {warningAlerts.length > 0 && criticalAlerts.length === 0 && (
              <div className="flex items-start gap-3 p-4 bg-amber-500/10 rounded-lg border border-amber-500/30">
                <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                    {warningAlerts.length} account{warningAlerts.length > 1 ? 's have' : ' has'} warnings
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Monitor these accounts closely and consider reducing sending volume.
                  </p>
                </div>
              </div>
            )}

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
            <div className="grid grid-cols-4 gap-3">
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
              <div className="flex items-center gap-2">
                <AlertTriangle className={cn("w-5 h-5", summary.at_risk_accounts > 0 ? "text-destructive" : "text-muted-foreground")} />
                <div>
                  <p className={cn("text-lg font-semibold", summary.at_risk_accounts > 0 && "text-destructive")}>{summary.at_risk_accounts}</p>
                  <p className="text-xs text-muted-foreground">At Risk</p>
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

            {/* Active Alerts List */}
            {alerts.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-destructive" />
                  Active Alerts ({alerts.length})
                </p>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {alerts.map((alert) => (
                    <div 
                      key={alert.id}
                      className={cn(
                        "p-3 rounded-lg border",
                        alert.severity === 'critical' 
                          ? "bg-destructive/5 border-destructive/30" 
                          : "bg-amber-500/5 border-amber-500/30"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant={alert.severity === 'critical' ? 'destructive' : 'outline'}
                              className={cn(
                                "text-xs",
                                alert.severity === 'warning' && "border-amber-500 text-amber-600 dark:text-amber-400"
                              )}
                            >
                              {alert.severity}
                            </Badge>
                            <span className="text-sm font-medium truncate">{alert.email_address}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {alert.alert_type === 'high_bounce_rate' 
                              ? `Bounce Rate: ${alert.current_value.toFixed(2)}% (threshold: ${alert.threshold_value}%)`
                              : `Health Score: ${alert.current_value.toFixed(0)}% (threshold: ${alert.threshold_value}%)`
                            }
                          </p>
                          <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                            {alert.recommended_action}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleAcknowledgeAlert(alert.id)}
                          className="text-xs flex-shrink-0"
                        >
                          Acknowledge
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Error Accounts Warning (legacy, keep for non-alert errors) */}
            {summary.error_accounts > 0 && alerts.length === 0 && (
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
                      className={cn(
                        "flex items-center justify-between p-2 rounded-lg border",
                        getAccountStatusColor(account)
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {account.is_at_risk ? (
                          <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0" />
                        ) : account.connection_status === 'connected' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-destructive flex-shrink-0" />
                        )}
                        <span className="text-sm truncate">{account.email_address}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {account.bounce_rate !== undefined && account.bounce_rate > 0 && (
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "text-xs",
                              account.bounce_rate >= 2 ? "border-destructive text-destructive" :
                              account.bounce_rate >= 1 ? "border-amber-500 text-amber-600" :
                              "border-muted"
                            )}
                          >
                            {account.bounce_rate.toFixed(1)}% bounce
                          </Badge>
                        )}
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
