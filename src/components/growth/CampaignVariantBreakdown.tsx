import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Star, BarChart3 } from "lucide-react";

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
  is_parent: boolean;
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

    // First try to fetch data for the specific timeline period
    let { data, error } = await supabase
      .from('campaign_variants')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('timeline_days', timelineDays)
      .order('campaign_name')
      .order('step_number')
      .order('variant_label');

    // If no data for this period, fall back to all-time data
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
      // Auto-expand first campaign if there are variants
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
      
      // Aggregate campaign-level stats
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
          is_parent: !variant.variant_label.includes("Variant"),
        };
        campaign.steps.push(step);
      }

      step.variants.push(variant);
    });

    // Calculate rates and best variants
    campaignMap.forEach((campaign) => {
      // Calculate rates
      if (campaign.stats.emails_sent > 0) {
        campaign.stats.reply_rate = (campaign.stats.unique_replies / campaign.stats.emails_sent) * 100;
        campaign.stats.interested_rate = (campaign.stats.interested_count / campaign.stats.emails_sent) * 100;
      }

      // Calculate best variant for each step
      campaign.steps.forEach((step) => {
        const eligibleVariants = step.variants.filter((v) => v.emails_sent >= 50);
        if (eligibleVariants.length > 1) {
          const best = eligibleVariants.reduce((a, b) =>
            a.interested_rate > b.interested_rate ? a : b
          );
          step.best_variant_id = best.variant_id;
        }
      });
      
      // Sort steps by step_number
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
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (variants.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="w-5 h-5" />
            Campaign Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            No campaign data available. Sync your campaigns to see performance metrics.
          </p>
        </CardContent>
      </Card>
    );
  }

  const groupedData = groupVariants();

  return (
    <div className="space-y-6">
      {groupedData.map((campaign) => (
        <Card key={campaign.campaign_id} className="overflow-hidden">
          {/* Campaign Header with Stats */}
          <Collapsible
            open={expandedCampaigns.has(campaign.campaign_id)}
            onOpenChange={() => toggleCampaign(campaign.campaign_id)}
          >
            <CollapsibleTrigger className="w-full text-left">
              <CardHeader className="pb-4 hover:bg-muted/30 transition-colors cursor-pointer">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-base font-semibold">
                      {campaign.campaign_name}
                    </CardTitle>
                    <Badge variant="secondary" className="text-xs">
                      Last {timelineDays} days
                    </Badge>
                  </div>
                  {expandedCampaigns.has(campaign.campaign_id) ? (
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                
                {/* Campaign Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mt-4">
                  <StatBox label="Emails Sent" value={formatNumber(campaign.stats.emails_sent)} />
                  <StatBox 
                    label="Unique Replies" 
                    value={formatNumber(campaign.stats.unique_replies)} 
                    rate={formatRate(campaign.stats.reply_rate)}
                    rateColor="text-blue-600"
                  />
                  <StatBox 
                    label="Interested" 
                    value={formatNumber(campaign.stats.interested_count)} 
                    rate={formatRate(campaign.stats.interested_rate)}
                    rateColor="text-emerald-600"
                  />
                  <StatBox 
                    label="Meetings" 
                    value={formatNumber(campaign.stats.meetings_booked)} 
                  />
                </div>
              </CardHeader>
            </CollapsibleTrigger>

            <CollapsibleContent>
              <CardContent className="pt-0">
                {/* Individual Email Stats */}
                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium text-muted-foreground mb-4">
                    Individual Email Stats
                  </h4>
                  
                  <div className="space-y-3">
                    {campaign.steps.map((step) => (
                      <div key={step.step_number} className="space-y-2">
                        {step.variants.map((variant, idx) => {
                          const isVariant = variant.variant_label.includes("Variant");
                          const variantLetter = isVariant 
                            ? variant.variant_label.split("Variant ")[1] 
                            : null;
                          const isBest = step.best_variant_id === variant.variant_id;
                          
                          return (
                            <div
                              key={variant.id}
                              className={`
                                rounded-lg border p-4 
                                ${isVariant ? 'ml-6 border-l-2 border-l-primary/30' : ''}
                                ${isBest ? 'bg-primary/5 border-primary/30' : 'bg-card'}
                              `}
                            >
                              {/* Step/Variant Label */}
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                  {isVariant 
                                    ? `Variant ${variantLetter} for Step ${variant.step_number}`
                                    : `Step ${variant.step_number}`
                                  }
                                </span>
                                {isBest && (
                                  <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                                )}
                              </div>
                              
                              {/* Subject Line */}
                              <div className="text-sm mb-3">
                                <span className="text-muted-foreground">Subject: </span>
                                <span className="font-medium">{variant.subject_line || "(no subject)"}</span>
                              </div>
                              
                              {/* Stats Row */}
                              <div className="grid grid-cols-3 md:grid-cols-6 gap-4 text-center">
                                <StatCell label="Sent" value={formatNumber(variant.emails_sent)} />
                                <StatCell label="Unique Replies" value={formatNumber(variant.unique_replies)} />
                                <StatCell 
                                  label="Reply %" 
                                  value={variant.emails_sent > 0 
                                    ? formatRate((variant.unique_replies / variant.emails_sent) * 100) 
                                    : "0%"
                                  } 
                                />
                                <StatCell label="Interested" value={formatNumber(variant.interested_count)} />
                                <StatCell 
                                  label="IR%" 
                                  value={formatRate(variant.interested_rate)}
                                  highlight={variant.interested_rate >= 1}
                                />
                                <StatCell label="Meetings" value={formatNumber(variant.meetings_booked)} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ))}
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
      ))}
    </div>
  );
}

// Stat box for campaign header
function StatBox({ 
  label, 
  value, 
  rate, 
  rateColor = "text-muted-foreground" 
}: { 
  label: string; 
  value: string; 
  rate?: string; 
  rateColor?: string;
}) {
  return (
    <div className="bg-muted/30 rounded-lg p-3 border">
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className="flex items-baseline gap-2">
        {rate && (
          <Badge variant="outline" className={`text-xs px-1.5 py-0 ${rateColor}`}>
            {rate}
          </Badge>
        )}
        <span className="text-lg font-semibold">{value}</span>
      </div>
    </div>
  );
}

// Stat cell for individual email stats
function StatCell({ 
  label, 
  value, 
  highlight = false 
}: { 
  label: string; 
  value: string; 
  highlight?: boolean;
}) {
  return (
    <div>
      <div className={`text-sm font-medium ${highlight ? 'text-emerald-600' : ''}`}>
        {value}
      </div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
