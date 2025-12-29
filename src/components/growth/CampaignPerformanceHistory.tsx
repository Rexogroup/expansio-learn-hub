import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, TrendingUp, TrendingDown, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { TimelineFilter } from "./TimelineFilter";

interface Campaign {
  id: string;
  campaign_name: string;
  campaign_status: string;
  emails_sent: number;
  unique_replies: number;
  interested_count: number;
  meetings_booked: number;
  reply_rate: number;
  interested_rate: number;
  synced_at: string;
}

interface CampaignPerformanceHistoryProps {
  onSync?: () => void;
  isSyncing?: boolean;
  benchmark?: number;
  timelineDays: number;
  onTimelineChange: (days: number) => void;
}

export function CampaignPerformanceHistory({ 
  onSync, 
  isSyncing,
  benchmark = 1.2,
  timelineDays,
  onTimelineChange,
}: CampaignPerformanceHistoryProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'interested_rate' | 'emails_sent'>('interested_rate');
  const [sortDesc, setSortDesc] = useState(true);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    fetchCampaigns();
  }, [timelineDays]);

  const fetchCampaigns = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // Fetch all campaigns - showing all-time cumulative data
    // Timeline filtering will work properly once historical snapshots are collected
    const { data, error } = await supabase
      .from('synced_campaigns')
      .select('*')
      .eq('user_id', session.user.id)
      .order('interested_rate', { ascending: false });

    if (!error && data) {
      setCampaigns(data.map(c => ({
        ...c,
        meetings_booked: c.meetings_booked || 0,
      })));
    }
    setLoading(false);
  };

  const sortedCampaigns = [...campaigns].sort((a, b) => {
    const aVal = a[sortBy] || 0;
    const bVal = b[sortBy] || 0;
    return sortDesc ? bVal - aVal : aVal - bVal;
  });

  const topPerformer = sortedCampaigns.find(c => c.emails_sent > 100 && c.interested_rate >= benchmark);
  const underperformers = sortedCampaigns.filter(c => c.emails_sent > 1000 && c.interested_rate < benchmark * 0.5);

  const toggleSort = (column: 'interested_rate' | 'emails_sent') => {
    if (sortBy === column) {
      setSortDesc(!sortDesc);
    } else {
      setSortBy(column);
      setSortDesc(true);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (campaigns.length === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Campaign Performance History</CardTitle>
          <div className="flex items-center gap-2">
            <TimelineFilter value={timelineDays} onChange={onTimelineChange} />
            <Button variant="ghost" size="sm" onClick={onSync} disabled={isSyncing}>
              <RefreshCw className={cn("w-4 h-4", isSyncing && "animate-spin")} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground">
            No campaigns synced yet. Connect your outbound platform to see performance data.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <CardTitle className="text-lg">Campaign Performance History</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="p-1 h-auto"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <TimelineFilter value={timelineDays} onChange={onTimelineChange} />
          <Button variant="ghost" size="sm" onClick={onSync} disabled={isSyncing}>
            <RefreshCw className={cn("w-4 h-4", isSyncing && "animate-spin")} />
          </Button>
        </div>
      </CardHeader>
      
      {expanded && (
        <CardContent className="space-y-4">
          {/* Summary Insights */}
          <div className="flex flex-wrap gap-2">
            {topPerformer && (
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                <TrendingUp className="w-3 h-3 mr-1" />
                Top: {topPerformer.campaign_name.substring(0, 20)}... ({topPerformer.interested_rate.toFixed(2)}%)
              </Badge>
            )}
            {underperformers.length > 0 && (
              <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
                <TrendingDown className="w-3 h-3 mr-1" />
                {underperformers.length} campaign{underperformers.length > 1 ? 's' : ''} below benchmark
              </Badge>
            )}
          </div>

          {/* Campaign Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-2 font-medium text-muted-foreground">Campaign</th>
                  <th 
                    className="text-right py-2 px-2 font-medium text-muted-foreground cursor-pointer hover:text-foreground"
                    onClick={() => toggleSort('emails_sent')}
                  >
                    Sent {sortBy === 'emails_sent' && (sortDesc ? '↓' : '↑')}
                  </th>
                  <th className="text-right py-2 px-2 font-medium text-muted-foreground">Replies</th>
                  <th className="text-right py-2 px-2 font-medium text-muted-foreground">Interested</th>
                  <th className="text-right py-2 px-2 font-medium text-muted-foreground">Meetings</th>
                  <th 
                    className="text-right py-2 px-2 font-medium text-muted-foreground cursor-pointer hover:text-foreground"
                    onClick={() => toggleSort('interested_rate')}
                  >
                    IR% {sortBy === 'interested_rate' && (sortDesc ? '↓' : '↑')}
                  </th>
                  <th className="text-right py-2 px-2 font-medium text-muted-foreground">vs Bench</th>
                  <th className="text-center py-2 px-2 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {sortedCampaigns.map((campaign) => {
                  const delta = campaign.interested_rate - benchmark;
                  const isAbove = delta >= 0;
                  const statusColor = campaign.campaign_status === 'active' 
                    ? 'bg-emerald-500/10 text-emerald-600'
                    : campaign.campaign_status === 'paused'
                      ? 'bg-amber-500/10 text-amber-600'
                      : 'bg-muted text-muted-foreground';

                  return (
                    <tr key={campaign.id} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="py-2 px-2">
                        <span className="font-medium truncate block max-w-[180px]" title={campaign.campaign_name}>
                          {campaign.campaign_name}
                        </span>
                      </td>
                      <td className="text-right py-2 px-2 tabular-nums">
                        {campaign.emails_sent.toLocaleString()}
                      </td>
                      <td className="text-right py-2 px-2 tabular-nums">
                        {campaign.unique_replies.toLocaleString()}
                      </td>
                      <td className="text-right py-2 px-2 tabular-nums">
                        {campaign.interested_count.toLocaleString()}
                      </td>
                      <td className="text-right py-2 px-2 tabular-nums">
                        {campaign.meetings_booked.toLocaleString()}
                      </td>
                      <td className={cn(
                        "text-right py-2 px-2 font-semibold tabular-nums",
                        isAbove ? "text-emerald-600" : campaign.interested_rate < benchmark * 0.5 ? "text-destructive" : "text-amber-600"
                      )}>
                        {campaign.interested_rate.toFixed(2)}%
                      </td>
                      <td className="text-right py-2 px-2 tabular-nums">
                        <span className={cn(
                          "inline-flex items-center gap-1",
                          isAbove ? "text-emerald-600" : "text-destructive"
                        )}>
                          {isAbove ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {delta >= 0 ? '+' : ''}{delta.toFixed(2)}%
                        </span>
                      </td>
                      <td className="text-center py-2 px-2">
                        <Badge variant="outline" className={cn("text-xs capitalize", statusColor)}>
                          {campaign.campaign_status}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Benchmark Legend */}
          <div className="flex items-center justify-between gap-4 text-xs text-muted-foreground pt-2">
            <span className="text-muted-foreground/70">Showing all-time cumulative data</span>
            <span>Benchmark: {benchmark}% interested rate</span>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
