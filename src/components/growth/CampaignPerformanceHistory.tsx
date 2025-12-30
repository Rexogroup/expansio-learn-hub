import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { RefreshCw, TrendingUp, TrendingDown, ChevronDown, ChevronUp, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { TimelineFilter } from "./TimelineFilter";

interface Campaign {
  id: string;
  external_campaign_id: string;
  campaign_name: string;
  campaign_status: string;
  emails_sent: number;
  unique_replies: number;
  interested_count: number;
  meetings_booked: number;
  reply_rate: number;
  interested_rate: number;
  synced_at: string;
  timeline_days: number | null;
  emails_per_lead?: number;
  interested_to_meeting_rate?: number;
}

interface CampaignVariant {
  id: string;
  campaign_id: string;
  campaign_name: string;
  step_number: number;
  variant_id: string;
  variant_label: string;
  subject_line: string;
  is_active: boolean;
  emails_sent: number;
  unique_replies: number;
  interested_count: number;
  meetings_booked: number;
  interested_rate: number;
  reply_rate?: number;
  emails_per_lead?: number;
}

// Performance badge based on emails per interested lead (from SOP)
const getPerformanceBadge = (emailsPerLead: number | null) => {
  if (!emailsPerLead || emailsPerLead === 0) return null;
  
  if (emailsPerLead < 250) {
    return { label: "ELITE", color: "bg-emerald-500", textColor: "text-white", action: "Scale heavily" };
  } else if (emailsPerLead <= 500) {
    return { label: "STRONG", color: "bg-blue-500", textColor: "text-white", action: "Scale + iterate" };
  } else if (emailsPerLead <= 700) {
    return { label: "GOOD", color: "bg-amber-500", textColor: "text-white", action: "Improve offer" };
  } else {
    return { label: "POOR", color: "bg-destructive", textColor: "text-white", action: "Kill or rewrite" };
  }
};

// Get recommended action based on emails per lead and email volume
const getRecommendedAction = (emailsPerLead: number | null, emailsSent: number) => {
  // Need minimum emails to make a recommendation
  if (emailsSent < 700) {
    return { action: "TESTING", color: "bg-muted", textColor: "text-muted-foreground", description: "Collect more data" };
  }
  
  if (!emailsPerLead || emailsPerLead === 0) {
    return { action: "KILL", color: "bg-destructive", textColor: "text-white", description: "No interested leads" };
  }
  
  if (emailsPerLead < 500) {
    return { action: "SCALE", color: "bg-emerald-500", textColor: "text-white", description: "Increase volume" };
  } else if (emailsPerLead <= 700) {
    return { action: "ITERATE", color: "bg-amber-500", textColor: "text-white", description: "Improve messaging" };
  } else {
    return { action: "KILL", color: "bg-destructive", textColor: "text-white", description: "Rewrite or stop" };
  }
};

interface GroupedStep {
  step_number: number;
  variants: CampaignVariant[];
  best_variant_id: string | null;
}

interface CampaignPerformanceHistoryProps {
  onSync?: () => void;
  isSyncing?: boolean;
  benchmark?: number;
  timelineDays: number;
  onTimelineChange: (days: number) => void;
  refreshKey?: number;
}

export function CampaignPerformanceHistory({ 
  onSync, 
  isSyncing,
  benchmark = 1.2,
  timelineDays,
  onTimelineChange,
  refreshKey,
}: CampaignPerformanceHistoryProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [variants, setVariants] = useState<CampaignVariant[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'interested_rate' | 'emails_sent'>('interested_rate');
  const [sortDesc, setSortDesc] = useState(true);
  const [expanded, setExpanded] = useState(true);
  const [expandedCampaigns, setExpandedCampaigns] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchData();
  }, [timelineDays, refreshKey]);

  const fetchData = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setLoading(false);
      return;
    }

    // Fetch campaigns
    let { data: campaignData, error: campaignError } = await supabase
      .from('synced_campaigns')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('timeline_days', timelineDays)
      .order('interested_rate', { ascending: false });

    if ((!campaignData || campaignData.length === 0) && !campaignError) {
      const fallbackQuery = await supabase
        .from('synced_campaigns')
        .select('*')
        .eq('user_id', session.user.id)
        .is('timeline_days', null)
        .order('interested_rate', { ascending: false });
      
      campaignData = fallbackQuery.data;
      campaignError = fallbackQuery.error;
    }

    if (!campaignError && campaignData) {
      setCampaigns(campaignData.map(c => ({
        ...c,
        meetings_booked: c.meetings_booked || 0,
      })));
    }

    // Fetch variants
    let { data: variantData, error: variantError } = await supabase
      .from('campaign_variants')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('timeline_days', timelineDays)
      .order('campaign_name')
      .order('step_number')
      .order('variant_label');

    if ((!variantData || variantData.length === 0) && !variantError) {
      const fallbackQuery = await supabase
        .from('campaign_variants')
        .select('*')
        .eq('user_id', session.user.id)
        .is('timeline_days', null)
        .order('campaign_name')
        .order('step_number')
        .order('variant_label');
      
      variantData = fallbackQuery.data;
      variantError = fallbackQuery.error;
    }

    if (!variantError && variantData) {
      setVariants(variantData as CampaignVariant[]);
    }

    setLoading(false);
  };

  const getVariantsForCampaign = (campaignId: string): GroupedStep[] => {
    const campaignVariants = variants.filter(v => v.campaign_id === campaignId);
    const stepMap = new Map<number, GroupedStep>();

    campaignVariants.forEach(variant => {
      if (!stepMap.has(variant.step_number)) {
        stepMap.set(variant.step_number, {
          step_number: variant.step_number,
          variants: [],
          best_variant_id: null,
        });
      }
      stepMap.get(variant.step_number)!.variants.push(variant);
    });

    // Determine best variant per step
    stepMap.forEach(step => {
      const eligibleVariants = step.variants.filter(v => v.emails_sent >= 50);
      if (eligibleVariants.length > 1) {
        const best = eligibleVariants.reduce((a, b) =>
          a.interested_rate > b.interested_rate ? a : b
        );
        step.best_variant_id = best.variant_id;
      }
    });

    return Array.from(stepMap.values()).sort((a, b) => a.step_number - b.step_number);
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

  const toggleCampaignExpand = (campaignId: string) => {
    setExpandedCampaigns(prev => {
      const next = new Set(prev);
      if (next.has(campaignId)) {
        next.delete(campaignId);
      } else {
        next.add(campaignId);
      }
      return next;
    });
  };

  const formatNumber = (num: number) => num.toLocaleString();
  const formatRate = (rate: number) => rate.toFixed(2) + "%";

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
          <CardTitle className="text-lg">Campaign Performance</CardTitle>
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
          <CardTitle className="text-lg">Campaign Performance</CardTitle>
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

          {/* Campaign List */}
          <div className="space-y-3">
            {sortedCampaigns.map((campaign) => {
              const delta = campaign.interested_rate - benchmark;
              const isAbove = delta >= 0;
              const statusColor = campaign.campaign_status === 'active' 
                ? 'bg-emerald-500/10 text-emerald-600'
                : campaign.campaign_status === 'paused'
                  ? 'bg-amber-500/10 text-amber-600'
                  : 'bg-muted text-muted-foreground';
              const isExpanded = expandedCampaigns.has(campaign.external_campaign_id);
              const campaignSteps = getVariantsForCampaign(campaign.external_campaign_id);
              const hasVariants = campaignSteps.length > 0;
              
              // Calculate emails per interested lead
              const emailsPerLead = campaign.interested_count > 0 
                ? Math.round(campaign.emails_sent / campaign.interested_count)
                : null;
              const performanceBadge = getPerformanceBadge(emailsPerLead);
              const recommendedAction = getRecommendedAction(emailsPerLead, campaign.emails_sent);

              return (
                <Collapsible
                  key={campaign.id}
                  open={isExpanded}
                  onOpenChange={() => hasVariants && toggleCampaignExpand(campaign.external_campaign_id)}
                >
                  <div className="border rounded-lg overflow-hidden">
                    {/* Campaign Row */}
                    <CollapsibleTrigger className="w-full" disabled={!hasVariants}>
                      <div className={cn(
                        "grid grid-cols-[1fr_repeat(8,_auto)_32px] gap-4 items-center px-4 py-3 text-sm",
                        hasVariants && "hover:bg-muted/30 cursor-pointer"
                      )}>
                        <div className="text-left">
                          <span className="font-medium truncate block max-w-[180px]" title={campaign.campaign_name}>
                            {campaign.campaign_name}
                          </span>
                        </div>
                        <div className="text-right tabular-nums min-w-[60px]">
                          <div className="text-sm font-medium">{formatNumber(campaign.emails_sent)}</div>
                          <div className="text-xs text-muted-foreground">Sent</div>
                        </div>
                        <div className="text-right tabular-nums min-w-[60px]">
                          <div className="text-sm font-medium">{formatNumber(campaign.unique_replies)}</div>
                          <div className="text-xs text-muted-foreground">Replies</div>
                        </div>
                        <div className="text-right tabular-nums min-w-[60px]">
                          <div className="text-sm font-medium">{formatNumber(campaign.interested_count)}</div>
                          <div className="text-xs text-muted-foreground">Interested</div>
                        </div>
                        <div className="text-right tabular-nums min-w-[60px]">
                          <div className="text-sm font-medium">{formatNumber(campaign.meetings_booked)}</div>
                          <div className="text-xs text-muted-foreground">Meetings</div>
                        </div>
                        <div className={cn(
                          "text-right tabular-nums min-w-[50px]",
                          isAbove ? "text-emerald-600" : campaign.interested_rate < benchmark * 0.5 ? "text-destructive" : "text-amber-600"
                        )}>
                          <div className="text-sm font-semibold">{formatRate(campaign.interested_rate)}</div>
                          <div className="text-xs text-muted-foreground">IR%</div>
                        </div>
                        {/* Emails per Lead with Performance Badge */}
                        <div className="text-right tabular-nums min-w-[70px]">
                          <div className="flex items-center justify-end gap-1.5">
                            <span className="text-sm font-medium">{emailsPerLead ?? '-'}</span>
                            {performanceBadge && (
                              <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", performanceBadge.color, performanceBadge.textColor)}>
                                {performanceBadge.label}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">Emails/Lead</div>
                        </div>
                        {/* Recommended Action Badge */}
                        <div className="min-w-[70px]">
                          <span 
                            className={cn(
                              "text-[10px] px-2 py-1 rounded font-bold tracking-wide",
                              recommendedAction.color, 
                              recommendedAction.textColor
                            )}
                            title={recommendedAction.description}
                          >
                            {recommendedAction.action}
                          </span>
                        </div>
                        <Badge variant="outline" className={cn("text-xs capitalize", statusColor)}>
                          {campaign.campaign_status}
                        </Badge>
                        <div className="flex justify-center">
                          {hasVariants ? (
                            isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <div className="w-4" />
                          )}
                        </div>
                      </div>
                    </CollapsibleTrigger>

                    {/* Expanded Variant Details */}
                    <CollapsibleContent>
                      <div className="border-t bg-muted/20 px-4 py-4">
                        <p className="text-sm text-muted-foreground mb-3">Individual Email Stats</p>
                        
                        <div className="space-y-2">
                          {campaignSteps.flatMap((step) => 
                            step.variants.map((variant) => {
                              const isVariant = variant.variant_label?.includes("Variant");
                              const variantLetter = isVariant 
                                ? variant.variant_label.split("Variant ")[1] 
                                : null;
                              const isBest = step.best_variant_id === variant.variant_id;
                              const replyRate = variant.emails_sent > 0 
                                ? (variant.unique_replies / variant.emails_sent) * 100 
                                : 0;
                              
                              return (
                                <div
                                  key={variant.id}
                                  className="bg-background rounded-lg p-3 border"
                                >
                                  {/* Label and Subject */}
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                      {isVariant 
                                        ? `VARIANT ${variantLetter} FOR STEP ${variant.step_number}`
                                        : `STEP ${variant.step_number}`
                                      }
                                    </span>
                                  {isBest && (
                                      <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                                    )}
                                  </div>
                                  
                                  {/* Stats Grid */}
                                  <div className="grid grid-cols-6 gap-4">
                                    <div>
                                      <div className="text-sm font-medium">{formatNumber(variant.emails_sent)}</div>
                                      <div className="text-xs text-muted-foreground">Sent</div>
                                    </div>
                                    <div>
                                      <div className="text-sm font-medium">{formatNumber(variant.unique_replies)}</div>
                                      <div className="text-xs text-muted-foreground">Replies</div>
                                    </div>
                                    <div>
                                      <div className="text-sm font-medium">{formatRate(replyRate)}</div>
                                      <div className="text-xs text-muted-foreground">Reply %</div>
                                    </div>
                                    <div>
                                      <div className="text-sm font-medium">{formatNumber(variant.interested_count)}</div>
                                      <div className="text-xs text-muted-foreground">Interested</div>
                                    </div>
                                    <div>
                                      <div className={cn(
                                        "text-sm font-medium",
                                        variant.interested_rate >= 1 && "text-emerald-600"
                                      )}>
                                        {formatRate(variant.interested_rate)}
                                      </div>
                                      <div className="text-xs text-muted-foreground">IR%</div>
                                    </div>
                                    <div>
                                      <div className="text-sm font-medium">{formatNumber(variant.meetings_booked)}</div>
                                      <div className="text-xs text-muted-foreground">Meetings</div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                        
                        {campaignSteps.some(s => s.best_variant_id) && (
                          <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1.5">
                            <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                            Best performing variant (min 50 emails sent)
                          </p>
                        )}
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              );
            })}
          </div>

          {/* Benchmark Legend */}
          <div className="flex items-center justify-between gap-4 text-xs text-muted-foreground pt-2">
            <span className="text-muted-foreground/70">
              {campaigns.length > 0 && campaigns[0].timeline_days 
                ? `Showing last ${campaigns[0].timeline_days} days` 
                : 'Showing all-time cumulative data (sync to get period-specific data)'}
            </span>
            <span>Benchmark: {benchmark}% Positive Reply Rate (Interested / Replies)</span>
          </div>
        </CardContent>
      )}
    </Card>
  );
}