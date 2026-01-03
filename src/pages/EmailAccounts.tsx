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

export default function EmailAccounts() {
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
  const healthScore = getHealthScore();

  if (loading) {
    return (
      <div className="container max-w-6xl py-8">
        <div className="space-y-6">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-96 mt-2" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Skeleton className="h-64" />
            <Skeleton className="h-64 lg:col-span-2" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl py-8">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Email Accounts</h1>
            <p className="text-muted-foreground mt-2">
              Monitor the health and performance of your connected email accounts.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={handleSync}
            disabled={syncing}
            className="gap-2"
          >
            <RefreshCw className={cn("w-4 h-4", syncing && "animate-spin")} />
            {syncing ? 'Syncing...' : 'Sync Now'}
          </Button>
        </div>

        {!summary || summary.total_accounts === 0 ? (
          <Card>
            <CardContent className="py-16">
              <div className="text-center text-muted-foreground">
                <Mail className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No email accounts found</p>
                <p className="text-sm mt-2">Connect your EmailBison account in Integrations to sync your email accounts</p>
                <Button variant="outline" className="mt-4" onClick={handleSync}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Sync Accounts
                </Button>
              </div>
            </CardContent>
          </Card>
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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Health Summary Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="w-5 h-5 text-primary" />
                    Health Overview
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="text-center">
                    <p className={cn("text-5xl font-bold", getHealthColor(healthScore))}>
                      {healthScore}%
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">Overall Health Score</p>
                    <p className="text-xs text-muted-foreground">Last checked: {formatLastSync(lastSyncAt)}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
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

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <Send className="w-4 h-4" />
                        Daily Capacity
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
                      {(summary.total_daily_limit - summary.total_emails_sent_today).toLocaleString()} remaining
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Active Alerts & Accounts List */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>
                    {alerts.length > 0 ? (
                      <span className="flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-destructive" />
                        Active Alerts ({alerts.length})
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Mail className="w-5 h-5" />
                        All Accounts ({healthData.length})
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {alerts.length > 0 ? (
                    <div className="space-y-3 max-h-80 overflow-y-auto">
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
                  ) : (
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                      {healthData.map((account) => (
                        <div 
                          key={account.id}
                          className={cn(
                            "flex items-center justify-between p-3 rounded-lg border",
                            getAccountStatusColor(account)
                          )}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {account.is_at_risk ? (
                              <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0" />
                            ) : account.connection_status === 'connected' ? (
                              <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                            ) : (
                              <XCircle className="w-5 h-5 text-destructive flex-shrink-0" />
                            )}
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">{account.email_address}</p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span className="capitalize">{account.connection_status}</span>
                                {account.warmup_enabled && (
                                  <>
                                    <span>•</span>
                                    <span className="flex items-center gap-1">
                                      <Flame className="w-3 h-3 text-amber-500" />
                                      {account.warmup_progress?.toFixed(0) || 0}% warmup
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-sm font-medium">
                              {account.emails_sent_today || 0} / {account.daily_limit || 0}
                            </p>
                            <p className="text-xs text-muted-foreground">emails today</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Full Account List when alerts exist */}
            {alerts.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="w-5 h-5" />
                    All Accounts ({healthData.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {healthData.map((account) => (
                      <div 
                        key={account.id}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-lg border",
                          getAccountStatusColor(account)
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {account.is_at_risk ? (
                            <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0" />
                          ) : account.connection_status === 'connected' ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                          ) : (
                            <XCircle className="w-5 h-5 text-destructive flex-shrink-0" />
                          )}
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{account.email_address}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span className="capitalize">{account.connection_status}</span>
                              {account.warmup_enabled && (
                                <>
                                  <span>•</span>
                                  <span className="flex items-center gap-1">
                                    <Flame className="w-3 h-3 text-amber-500" />
                                    {account.warmup_progress?.toFixed(0) || 0}% warmup
                                  </span>
                                </>
                              )}
                              {account.health_score !== undefined && (
                                <>
                                  <span>•</span>
                                  <span>Health: {account.health_score.toFixed(0)}%</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-medium">
                            {account.emails_sent_today || 0} / {account.daily_limit || 0}
                          </p>
                          <p className="text-xs text-muted-foreground">emails today</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
