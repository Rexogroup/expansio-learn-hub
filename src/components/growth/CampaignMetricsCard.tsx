import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Eye, MessageSquare, ThumbsUp, Calendar, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface CampaignMetrics {
  total_emails_sent: number;
  total_opens: number;
  total_replies: number;
  total_interested: number;
  total_meetings: number;
  open_rate: number;
  reply_rate: number;
  interested_rate: number;
}

interface CampaignMetricsCardProps {
  metrics: CampaignMetrics | null;
  isLoading: boolean;
  lastSyncAt?: string | null;
  onSync?: () => void;
  isSyncing?: boolean;
}

export function CampaignMetricsCard({
  metrics,
  isLoading,
  lastSyncAt,
  onSync,
  isSyncing,
}: CampaignMetricsCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-16" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!metrics) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Campaign Performance</CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <Mail className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">
            No campaign data yet. Connect your outbound platform to sync data.
          </p>
          <Button variant="outline" onClick={onSync} disabled={isSyncing}>
            {isSyncing ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Sync Now
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const stats = [
    { label: 'Emails Sent', value: metrics.total_emails_sent.toLocaleString(), icon: Mail },
    { label: 'Opens', value: `${metrics.open_rate.toFixed(1)}%`, icon: Eye },
    { label: 'Replies', value: `${metrics.reply_rate.toFixed(2)}%`, icon: MessageSquare },
    { label: 'Interested', value: `${metrics.interested_rate.toFixed(2)}%`, icon: ThumbsUp },
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Campaign Performance</CardTitle>
        <div className="flex items-center gap-2">
          {lastSyncAt && (
            <span className="text-xs text-muted-foreground">
              Last sync: {new Date(lastSyncAt).toLocaleTimeString()}
            </span>
          )}
          <Button variant="ghost" size="sm" onClick={onSync} disabled={isSyncing}>
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((stat) => (
            <div key={stat.label} className="space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground">
                <stat.icon className="w-4 h-4" />
                <span className="text-sm">{stat.label}</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
