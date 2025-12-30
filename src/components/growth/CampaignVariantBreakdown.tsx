import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, Star, BarChart3 } from "lucide-react";

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
}

interface CampaignStats {
  emails_sent: number;
  unique_replies: number;
  interested_count: number;
  meetings_booked: number;
  reply_rate: number;
  interested_rate: number;
}

interface GroupedStep {
  step_number: number;
  variants: CampaignVariant[];
  best_variant_id: string | null;
}

interface GroupedCampaign {
  campaign_id: string;
  campaign_name: string;
  stats: CampaignStats;
  steps: GroupedStep[];
}

interface CampaignVariantBreakdownProps {
  timelineDays: number;
  refreshKey?: number;
}

export function CampaignVariantBreakdown({ timelineDays, refreshKey }: CampaignVariantBreakdownProps) {
  const [variants, setVariants] = useState<CampaignVariant[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCampaigns, setExpandedCampaigns] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchVariants();
  }, [timelineDays, refreshKey]);

  const fetchVariants = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setLoading(false);
      return;
    }

    let { data, error } = await supabase
      .from('campaign_variants')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('timeline_days', timelineDays)
      .order('campaign_name')
      .order('step_number')
      .order('variant_label');

    if ((!data || data.length === 0) && !error) {
      const fallbackQuery = await supabase
        .from('campaign_variants')
        .select('*')
        .eq('user_id', session.user.id)
        .is('timeline_days', null)
        .order('campaign_name')
        .order('step_number')
        .order('variant_label');

      data = fallbackQuery.data;
      error = fallbackQuery.error;
    }

    if (!error && data) {
      setVariants(data as CampaignVariant[]);
      if (data.length > 0) {
        const firstCampaignId = data[0].campaign_id;
        setExpandedCampaigns(new Set([firstCampaignId]));
      }
    }
    setLoading(false);
  };

  const groupVariants = (): GroupedCampaign[] => {
    const campaignMap = new Map<string, GroupedCampaign>();

    variants.forEach((variant) => {
      if (!campaignMap.has(variant.campaign_id)) {
        campaignMap.set(variant.campaign_id, {
          campaign_id: variant.campaign_id,
          campaign_name: variant.campaign_name,
          stats: {
            emails_sent: 0,
            unique_replies: 0,
            interested_count: 0,
            meetings_booked: 0,
            reply_rate: 0,
            interested_rate: 0,
          },
          steps: [],
        });
      }

      const campaign = campaignMap.get(variant.campaign_id)!;
      
      campaign.stats.emails_sent += variant.emails_sent;
      campaign.stats.unique_replies += variant.unique_replies;
      campaign.stats.interested_count += variant.interested_count;
      campaign.stats.meetings_booked += variant.meetings_booked;

      let step = campaign.steps.find((s) => s.step_number === variant.step_number);

      if (!step) {
        step = {
          step_number: variant.step_number,
          variants: [],
          best_variant_id: null,
        };
        campaign.steps.push(step);
      }

      step.variants.push(variant);
    });

    campaignMap.forEach((campaign) => {
      if (campaign.stats.emails_sent > 0) {
        campaign.stats.reply_rate = (campaign.stats.unique_replies / campaign.stats.emails_sent) * 100;
        campaign.stats.interested_rate = (campaign.stats.interested_count / campaign.stats.emails_sent) * 100;
      }

      campaign.steps.forEach((step) => {
        const eligibleVariants = step.variants.filter((v) => v.emails_sent >= 50);
        if (eligibleVariants.length > 1) {
          const best = eligibleVariants.reduce((a, b) =>
            a.interested_rate > b.interested_rate ? a : b
          );
          step.best_variant_id = best.variant_id;
        }
      });
      
      campaign.steps.sort((a, b) => a.step_number - b.step_number);
    });

    return Array.from(campaignMap.values());
  };

  const toggleCampaign = (campaignId: string) => {
    setExpandedCampaigns((prev) => {
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
        <div className="p-6">
          <Skeleton className="h-6 w-48 mb-4" />
          <Skeleton className="h-32 w-full" />
        </div>
      </Card>
    );
  }

  if (variants.length === 0) {
    return (
      <Card>
        <div className="p-6">
          <h3 className="flex items-center gap-2 text-lg font-semibold mb-2">
            <BarChart3 className="w-5 h-5" />
            Campaign Performance
          </h3>
          <p className="text-muted-foreground text-sm">
            No campaign data available. Sync your campaigns to see performance metrics.
          </p>
        </div>
      </Card>
    );
  }

  const groupedData = groupVariants();

  return (
    <div className="space-y-4">
      {groupedData.map((campaign) => {
        const isExpanded = expandedCampaigns.has(campaign.campaign_id);
        
        return (
          <Card key={campaign.campaign_id} className="overflow-hidden">
            <Collapsible
              open={isExpanded}
              onOpenChange={() => toggleCampaign(campaign.campaign_id)}
            >
              {/* Campaign Header */}
              <CollapsibleTrigger className="w-full text-left">
                <div className="p-4 hover:bg-muted/30 transition-colors cursor-pointer">
                  {/* Title Row */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <h3 className="text-base font-semibold">{campaign.campaign_name}</h3>
                      <Badge variant="secondary" className="text-xs font-normal">
                        Last {timelineDays} days
                      </Badge>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                  
                  {/* Campaign Stats Row */}
                  <div className="grid grid-cols-4 gap-8">
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Emails Sent</div>
                      <div className="text-xl font-semibold">{formatNumber(campaign.stats.emails_sent)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Unique Replies</div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm text-blue-600">{formatRate(campaign.stats.reply_rate)}</span>
                        <span className="text-xl font-semibold">{formatNumber(campaign.stats.unique_replies)}</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Interested</div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm text-emerald-600">{formatRate(campaign.stats.interested_rate)}</span>
                        <span className="text-xl font-semibold">{formatNumber(campaign.stats.interested_count)}</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Meetings</div>
                      <div className="text-xl font-semibold">{formatNumber(campaign.stats.meetings_booked)}</div>
                    </div>
                  </div>
                </div>
              </CollapsibleTrigger>

              {/* Individual Email Stats */}
              <CollapsibleContent>
                <CardContent className="pt-0 pb-4 px-4">
                  <div className="border-t pt-4">
                    <p className="text-sm text-muted-foreground mb-4">Individual Email Stats</p>
                    
                    <div className="space-y-2">
                      {campaign.steps.flatMap((step) => 
                        step.variants.map((variant) => {
                          const isVariant = variant.variant_label.includes("Variant");
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
                              className="bg-muted/30 rounded-lg p-4"
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
                              <p className="text-sm mb-3">
                                <span className="text-muted-foreground">Subject: </span>
                                <span className="font-medium">{variant.subject_line || "(no subject)"}</span>
                              </p>
                              
                              {/* Stats Grid */}
                              <div className="grid grid-cols-6 gap-4">
                                <div>
                                  <div className="text-base font-medium">{formatNumber(variant.emails_sent)}</div>
                                  <div className="text-xs text-muted-foreground">Sent</div>
                                </div>
                                <div>
                                  <div className="text-base font-medium">{formatNumber(variant.unique_replies)}</div>
                                  <div className="text-xs text-muted-foreground">Unique Replies</div>
                                </div>
                                <div>
                                  <div className="text-base font-medium">{formatRate(replyRate)}</div>
                                  <div className="text-xs text-muted-foreground">Reply %</div>
                                </div>
                                <div>
                                  <div className="text-base font-medium">{formatNumber(variant.interested_count)}</div>
                                  <div className="text-xs text-muted-foreground">Interested</div>
                                </div>
                                <div>
                                  <div className={`text-base font-medium ${variant.interested_rate >= 1 ? 'text-emerald-600' : ''}`}>
                                    {formatRate(variant.interested_rate)}
                                  </div>
                                  <div className="text-xs text-muted-foreground">IR%</div>
                                </div>
                                <div>
                                  <div className="text-base font-medium">{formatNumber(variant.meetings_booked)}</div>
                                  <div className="text-xs text-muted-foreground">Meetings</div>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                    
                    {/* Legend */}
                    <p className="text-xs text-muted-foreground mt-4 flex items-center gap-1.5">
                      <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                      Best performing variant (min 50 emails sent)
                    </p>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        );
      })}
    </div>
  );
}
