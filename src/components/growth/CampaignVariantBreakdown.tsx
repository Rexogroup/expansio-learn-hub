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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChevronDown, ChevronRight, Beaker, Star } from "lucide-react";

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
}

interface GroupedVariants {
  campaign_id: string;
  campaign_name: string;
  steps: {
    step_number: number;
    variants: CampaignVariant[];
    best_variant_id: string | null;
  }[];
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

  const groupVariants = (): GroupedVariants[] => {
    const campaignMap = new Map<string, GroupedVariants>();

    variants.forEach((variant) => {
      if (!campaignMap.has(variant.campaign_id)) {
        campaignMap.set(variant.campaign_id, {
          campaign_id: variant.campaign_id,
          campaign_name: variant.campaign_name,
          steps: [],
        });
      }

      const campaign = campaignMap.get(variant.campaign_id)!;
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

    // Calculate best variant for each step (highest interested rate with min 50 emails sent)
    campaignMap.forEach((campaign) => {
      campaign.steps.forEach((step) => {
        const eligibleVariants = step.variants.filter((v) => v.emails_sent >= 50);
        if (eligibleVariants.length > 0) {
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
            <Beaker className="w-5 h-5" />
            A/B Variant Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            No variant data available. Sync your campaigns to see A/B test performance.
          </p>
        </CardContent>
      </Card>
    );
  }

  const groupedData = groupVariants();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Beaker className="w-5 h-5" />
          A/B Variant Performance
          <Badge variant="secondary" className="ml-2">
            Last {timelineDays} days
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {groupedData.map((campaign) => (
          <Collapsible
            key={campaign.campaign_id}
            open={expandedCampaigns.has(campaign.campaign_id)}
            onOpenChange={() => toggleCampaign(campaign.campaign_id)}
          >
            <CollapsibleTrigger className="w-full flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
              <span className="font-medium text-sm truncate max-w-[80%]">
                {campaign.campaign_name}
              </span>
              {expandedCampaigns.has(campaign.campaign_id) ? (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              )}
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Step</TableHead>
                      <TableHead className="w-24">Variant</TableHead>
                      <TableHead>Subject Line</TableHead>
                      <TableHead className="text-right w-20">Sent</TableHead>
                      <TableHead className="text-right w-20">Replies</TableHead>
                      <TableHead className="text-right w-20">Interested</TableHead>
                      <TableHead className="text-right w-20">IR%</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {campaign.steps.map((step) =>
                      step.variants.map((variant) => (
                        <TableRow
                          key={variant.id}
                          className={
                            step.best_variant_id === variant.variant_id
                              ? "bg-primary/5"
                              : ""
                          }
                        >
                          <TableCell className="font-medium">
                            {variant.step_number}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {variant.variant_label.replace(/Step \d+ - /, "")}
                              {step.best_variant_id === variant.variant_id && (
                                <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {variant.subject_line || "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            {variant.emails_sent.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            {variant.unique_replies.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            {variant.interested_count.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <span
                              className={
                                variant.interested_rate >= 1.2
                                  ? "text-green-600 font-medium"
                                  : variant.interested_rate >= 0.8
                                  ? "text-yellow-600"
                                  : "text-muted-foreground"
                              }
                            >
                              {variant.interested_rate.toFixed(2)}%
                            </span>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                Best performing variant (min 50 emails sent)
              </p>
            </CollapsibleContent>
          </Collapsible>
        ))}
      </CardContent>
    </Card>
  );
}
