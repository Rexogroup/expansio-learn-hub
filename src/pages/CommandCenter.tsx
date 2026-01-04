import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

import { CampaignPerformanceHistory } from "@/components/growth/CampaignPerformanceHistory";
import { GrowthCopilotSheet } from "@/components/growth/GrowthCopilotSheet";
import { AlertsBanner } from "@/components/growth/AlertsBanner";
import { StatusPills } from "@/components/growth/StatusPills";
import { PriorityActionsStack } from "@/components/growth/PriorityActionsStack";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Briefcase, Target, Heart, Zap, Link, TrendingUp, Pause, RefreshCw } from "lucide-react";
import { useVariantRecommendations } from "@/hooks/useVariantRecommendations";
import { toast } from "sonner";

interface GrowthStep {
  id: string;
  step_number: number;
  name: string;
  description: string;
  category: string;
  benchmark_kpi_name: string;
  benchmark_kpi_value: number;
  benchmark_kpi_unit: string;
  required_asset_type: string;
  help_content: string;
}

type ProgressStatus = 'not_started' | 'in_progress' | 'iteration_needed' | 'validated';

interface UserProgress {
  id: string;
  step_id: string;
  status: ProgressStatus;
  current_kpi_value: number | null;
  attempts: number;
}

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

interface Integration {
  id: string;
  platform: string;
  last_sync_at: string | null;
  sync_status: string;
}


interface PriorityAction {
  id: string;
  title: string;
  description: string;
  actionLabel: string;
  actionPath?: string;
  onAction?: () => void;
  priority: 'critical' | 'high' | 'normal';
  icon?: React.ReactNode;
}

export default function CommandCenter() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [steps, setSteps] = useState<GrowthStep[]>([]);
  const [userProgress, setUserProgress] = useState<UserProgress[]>([]);
  const [currentStepNumber, setCurrentStepNumber] = useState(1);
  const [campaignMetrics, setCampaignMetrics] = useState<CampaignMetrics | null>(null);
  const [integration, setIntegration] = useState<Integration | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [timelineDays, setTimelineDays] = useState(10);
  const [variantRefreshKey, setVariantRefreshKey] = useState(0);
  const [alertCount, setAlertCount] = useState(0);

  // Variant recommendations hook
  const { recommendations: variantRecs, winningScripts, recentVolume } = useVariantRecommendations();

  useEffect(() => {
    checkAuthAndFetch();
  }, []);

  useEffect(() => {
    const fetchOrSyncForTimeline = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || loading) return;

      const { data: cachedData } = await supabase
        .from('synced_campaigns')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('timeline_days', timelineDays)
        .limit(1);

      if (cachedData && cachedData.length > 0) {
        await fetchCampaignMetrics(session.user.id, timelineDays);
      } else if (integration) {
        await handleSync();
      } else {
        await fetchCampaignMetrics(session.user.id, timelineDays);
      }
    };
    
    fetchOrSyncForTimeline();
  }, [timelineDays]);

  const checkAuthAndFetch = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/");
      return;
    }

    await Promise.all([
      fetchGrowthSteps(),
      fetchUserProgress(session.user.id),
      fetchCampaignMetrics(session.user.id, timelineDays),
      fetchIntegration(session.user.id),
      fetchAlertCount(session.user.id),
    ]);
    setLoading(false);
  };

  const fetchAlertCount = async (userId: string) => {
    const { count } = await supabase
      .from('email_account_alerts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'active');
    
    const { count: atRiskCount } = await supabase
      .from('email_account_health')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_at_risk', true);
    
    setAlertCount((count || 0) + (atRiskCount || 0));
  };

  const fetchGrowthSteps = async () => {
    const { data, error } = await supabase
      .from('growth_steps')
      .select('*')
      .order('step_number');
    
    if (!error && data) {
      setSteps(data);
    }
  };

  const fetchUserProgress = async (userId: string) => {
    const { data, error } = await supabase
      .from('user_growth_progress')
      .select('*')
      .eq('user_id', userId);
    
    if (!error && data) {
      setUserProgress(data.map(p => ({
        ...p,
        status: p.status as ProgressStatus,
      })));
      
      const progressMap = new Map(data.map(p => [p.step_id, p]));
      const stepsData = await supabase.from('growth_steps').select('*').order('step_number');
      
      if (stepsData.data) {
        for (const step of stepsData.data) {
          const progress = progressMap.get(step.id);
          if (!progress || progress.status !== 'validated') {
            setCurrentStepNumber(step.step_number);
            break;
          }
        }
      }
    }
  };

  const fetchCampaignMetrics = async (userId: string, days: number) => {
    let query = supabase
      .from('synced_campaigns')
      .select('emails_sent, unique_opens, unique_replies, interested_count, meetings_booked, timeline_days')
      .eq('user_id', userId)
      .eq('timeline_days', days);

    let { data, error } = await query;

    if ((!data || data.length === 0) && !error) {
      const fallbackQuery = await supabase
        .from('synced_campaigns')
        .select('emails_sent, unique_opens, unique_replies, interested_count, meetings_booked, timeline_days')
        .eq('user_id', userId)
        .is('timeline_days', null);
      
      data = fallbackQuery.data;
      error = fallbackQuery.error;
    }

    if (!error && data && data.length > 0) {
      const totals = data.reduce((acc, c) => ({
        emails_sent: acc.emails_sent + (c.emails_sent || 0),
        opens: acc.opens + (c.unique_opens || 0),
        replies: acc.replies + (c.unique_replies || 0),
        interested: acc.interested + (c.interested_count || 0),
        meetings: acc.meetings + (c.meetings_booked || 0),
      }), { emails_sent: 0, opens: 0, replies: 0, interested: 0, meetings: 0 });

      setCampaignMetrics({
        total_emails_sent: totals.emails_sent,
        total_opens: totals.opens,
        total_replies: totals.replies,
        total_interested: totals.interested,
        total_meetings: totals.meetings,
        open_rate: totals.emails_sent > 0 ? (totals.opens / totals.emails_sent) * 100 : 0,
        reply_rate: totals.emails_sent > 0 ? (totals.replies / totals.emails_sent) * 100 : 0,
        interested_rate: totals.emails_sent > 0 ? (totals.interested / totals.emails_sent) * 100 : 0,
      });
    } else {
      setCampaignMetrics(null);
    }
  };

  const fetchIntegration = async (userId: string) => {
    const { data, error } = await supabase
      .from('user_integrations')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle();
    
    if (!error && data) {
      setIntegration(data);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await supabase.functions.invoke('sync-campaign-data', {
        body: { days: timelineDays },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) throw response.error;
      
      toast.success('Campaign data synced successfully');
      await fetchCampaignMetrics(session.user.id, timelineDays);
      await fetchIntegration(session.user.id);
      setVariantRefreshKey(k => k + 1);
    } catch (error) {
      console.error('Sync error:', error);
      toast.error('Failed to sync campaign data');
    } finally {
      setIsSyncing(false);
    }
  };

  const getCurrentStep = () => steps.find(s => s.step_number === currentStepNumber);

  const getStepsWithProgress = () => {
    return steps.map(step => {
      const progress = userProgress.find(p => p.step_id === step.id);
      return {
        ...step,
        status: progress?.status || 'not_started' as const,
      };
    });
  };

  const getPriorityActions = (): PriorityAction[] => {
    const actions: PriorityAction[] = [];

    // Account health check (softer framing)
    if (alertCount > 0) {
      actions.push({
        id: 'infrastructure-alert',
        title: 'Account Health Check',
        description: `Some accounts may benefit from a brief pause. Let's review and optimize your sending to protect your reputation.`,
        actionLabel: 'Review',
        actionPath: '/integrations',
        priority: 'high',
        icon: <Heart className="w-5 h-5" />,
      });
    }

    // VARIANT-LEVEL SOP RECOMMENDATIONS
    // PAUSE actions (previously KILL) - softer language
    const pauseVariants = variantRecs.filter(v => v.action === 'KILL');
    pauseVariants.forEach(pauseVar => {
      const winningPattern = winningScripts.length > 0 
        ? ` Try elements from your winning scripts.`
        : '';
      actions.push({
        id: `pause-${pauseVar.id}`,
        title: `Pause: Step ${pauseVar.stepNumber} - Variant ${pauseVar.variantLabel}`,
        description: `Underperforming - consider pausing to iterate.${winningPattern}`,
        actionLabel: 'Rewrite',
        actionPath: '/script-builder',
        priority: 'high',
        icon: <Pause className="w-5 h-5" />,
      });
    });

    // SCALE actions (high priority) - show ALL
    const scaleVariants = variantRecs.filter(v => v.action === 'SCALE');
    scaleVariants.forEach(scaleVar => {
      actions.push({
        id: `scale-${scaleVar.id}`,
        title: `SCALE: Step ${scaleVar.stepNumber} - Variant ${scaleVar.variantLabel}`,
        description: `${scaleVar.reason}. Add more sending domains to increase volume on this winner!`,
        actionLabel: 'Add Domains',
        actionPath: '/integrations',
        priority: 'high',
        icon: <TrendingUp className="w-5 h-5" />,
      });
    });

    // ITERATE actions (normal priority) - show ALL
    const iterateVariants = variantRecs.filter(v => v.action === 'ITERATE');
    iterateVariants.forEach(iterVar => {
      const winningRef = winningScripts.length > 0
        ? ` Try elements from your winning scripts.`
        : '';
      actions.push({
        id: `iterate-${iterVar.id}`,
        title: `ITERATE: Step ${iterVar.stepNumber} - Variant ${iterVar.variantLabel}`,
        description: `${iterVar.reason}${winningRef}`,
        actionLabel: 'Create Variant',
        actionPath: '/script-builder',
        priority: 'normal',
        icon: <RefreshCw className="w-5 h-5" />,
      });
    });

    // Low volume detection - campaigns may be paused
    const avgDailyVolume = recentVolume / 10; // 10-day window
    if (integration && avgDailyVolume < 300 && currentStepNumber >= 4) {
      actions.push({
        id: 'low-volume',
        title: 'Sending Volume is Low',
        description: `Averaging only ${Math.round(avgDailyVolume)} emails/day. Resume campaigns to maintain momentum.`,
        actionLabel: 'Check Campaigns',
        actionPath: '/integrations',
        priority: 'high',
        icon: <Pause className="w-5 h-5" />,
      });
    }

    // High: No integration connected
    if (!integration && currentStepNumber >= 4) {
      actions.push({
        id: 'connect-integration',
        title: 'Connect Your Outbound Platform',
        description: 'Link your email sending platform to sync campaign data and track your performance.',
        actionLabel: 'Connect',
        actionPath: '/integrations',
        priority: 'high',
        icon: <Link className="w-5 h-5" />,
      });
    }

    // Step-based recommendations (only infrastructure-related)
    const step = getCurrentStep();
    if (step && variantRecs.length === 0 && step.step_number === 1 && alertCount === 0) {
      actions.push({
        id: 'infrastructure-check',
        title: 'Verify Infrastructure Setup',
        description: 'Confirm DNS records, warm-up status, and sending reputation are properly configured.',
        actionLabel: 'Start Checklist',
        actionPath: '/onboarding',
        priority: 'normal',
        icon: <Zap className="w-5 h-5" />,
      });
    }

    return actions;
  };

  if (loading) {
    return (
      <main className="container mx-auto px-4 py-8 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-[400px] w-full" />
        <div className="grid md:grid-cols-3 gap-6">
          <Skeleton className="h-48 md:col-span-2" />
          <Skeleton className="h-48" />
        </div>
      </main>
    );
  }

  const currentStep = getCurrentStep();
  const stepsWithProgress = getStepsWithProgress();
  const priorityActions = getPriorityActions();

  return (
    <main className="container mx-auto px-4 py-8 space-y-6">
      {/* Header with Status Pills */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Campaigns</h1>
          <p className="text-muted-foreground mt-1">
            Campaign performance and priority actions
          </p>
        </div>
          <StatusPills
            infrastructureHealthy={alertCount === 0}
            alertCount={alertCount}
            emailsSent={campaignMetrics?.total_emails_sent || 0}
            meetingsBooked={campaignMetrics?.total_meetings || 0}
          />
        </div>

        {/* Alerts Banner */}
        <AlertsBanner />

        {/* Campaign Performance - Always Visible */}
        <CampaignPerformanceHistory
          onSync={handleSync}
          isSyncing={isSyncing}
          benchmark={15}
          timelineDays={timelineDays}
          onTimelineChange={setTimelineDays}
          refreshKey={variantRefreshKey}
        />

        {/* Priority Actions */}
        <PriorityActionsStack actions={priorityActions} maxVisible={3} />


      {/* Floating Growth Copilot */}
      <GrowthCopilotSheet />
    </main>
  );
}
