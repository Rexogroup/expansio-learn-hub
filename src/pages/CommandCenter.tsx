import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { CampaignPerformanceHistory } from "@/components/growth/CampaignPerformanceHistory";
import { GrowthCopilotSheet } from "@/components/growth/GrowthCopilotSheet";
import { AlertsBanner } from "@/components/growth/AlertsBanner";
import { StatusPills } from "@/components/growth/StatusPills";
import { PriorityActionsStack } from "@/components/growth/PriorityActionsStack";
import { AssetSummaryCard } from "@/components/growth/AssetSummaryCard";
import { AssetVaultScripts } from "@/components/growth/AssetVaultScripts";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Briefcase, Settings, FolderOpen, Target, FileText, AlertTriangle, Zap, Link, GraduationCap, TrendingUp, XCircle, Pause, RefreshCw } from "lucide-react";
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

interface ICPAsset {
  id: string;
  content: {
    company_name?: string;
    company_description?: string;
    services_offered?: string;
    target_industries?: string;
    icp_revenue_range?: string;
    icp_employee_count?: string;
    icp_location?: string;
    icp_tech_stack?: string;
    icp_additional_details?: string;
    pain_points?: { problem: string; solution: string }[];
    custom_notes?: string;
  };
  created_at: string;
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
  const [icpAsset, setIcpAsset] = useState<ICPAsset | null>(null);
  const [leadMagnetsCount, setLeadMagnetsCount] = useState(0);
  const [scriptsCount, setScriptsCount] = useState(0);

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
      fetchICPAsset(session.user.id),
      fetchAssetCounts(session.user.id),
    ]);
    setLoading(false);
  };

  const fetchICPAsset = async (userId: string) => {
    const { data, error } = await supabase
      .from('user_assets')
      .select('id, content, created_at')
      .eq('user_id', userId)
      .eq('asset_type', 'icp_document')
      .maybeSingle();
    
    if (!error && data) {
      setIcpAsset({
        id: data.id,
        content: data.content as ICPAsset['content'],
        created_at: data.created_at,
      });
    }
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

  const fetchAssetCounts = async (userId: string) => {
    const { count: leadMagnets } = await supabase
      .from('saved_lead_magnets')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    const { count: scripts } = await supabase
      .from('generated_scripts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    setLeadMagnetsCount(leadMagnets || 0);
    setScriptsCount(scripts || 0);
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

    // Critical: Infrastructure alerts (always first)
    if (alertCount > 0) {
      actions.push({
        id: 'infrastructure-alert',
        title: 'Infrastructure Issues Detected',
        description: `${alertCount} email account${alertCount > 1 ? 's' : ''} require${alertCount === 1 ? 's' : ''} attention. High bounce rates or low health scores can damage your sender reputation.`,
        actionLabel: 'View Issues',
        actionPath: '/integrations',
        priority: 'critical',
        icon: <AlertTriangle className="w-5 h-5" />,
      });
    }

    // VARIANT-LEVEL SOP RECOMMENDATIONS
    // KILL actions (critical priority) - show ALL
    const killVariants = variantRecs.filter(v => v.action === 'KILL');
    killVariants.forEach(killVar => {
      const winningPattern = winningScripts.length > 0 
        ? ` Rewrite using your winning pattern.`
        : '';
      actions.push({
        id: `kill-${killVar.id}`,
        title: `KILL: Step ${killVar.stepNumber} - Variant ${killVar.variantLabel}`,
        description: `${killVar.reason}${winningPattern}`,
        actionLabel: 'Rewrite',
        actionPath: '/script-builder',
        priority: 'critical',
        icon: <XCircle className="w-5 h-5" />,
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

    // High: No ICP document
    if (!icpAsset) {
      actions.push({
        id: 'create-icp',
        title: 'Complete Your ICP Document',
        description: 'Define your ideal customer profile to personalize your outreach and unlock lead magnets.',
        actionLabel: 'Create ICP',
        actionPath: '/onboarding/step/2',
        priority: 'high',
        icon: <FileText className="w-5 h-5" />,
      });
    }

    // Step-based recommendations (only if no variant-specific actions)
    const step = getCurrentStep();
    if (step && variantRecs.length === 0) {
      switch (step.step_number) {
        case 1:
          if (alertCount === 0) {
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
          break;
        case 3:
          actions.push({
            id: 'create-lead-magnets',
            title: 'Create Lead Magnets',
            description: 'Build at least 3 lead magnet variants to test different angles.',
            actionLabel: 'Create',
            actionPath: '/script-builder',
            priority: 'normal',
          });
          break;
        case 5:
        case 6:
        case 7:
          actions.push({
            id: 'review-sales',
            title: 'Review Sales Performance',
            description: 'Analyze objections and improve your sales process.',
            actionLabel: 'Sales Vault',
            actionPath: '/sales-vault',
            priority: 'normal',
          });
          break;
      }
    }

    return actions;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-8 space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-[400px] w-full" />
          <div className="grid md:grid-cols-3 gap-6">
            <Skeleton className="h-48 md:col-span-2" />
            <Skeleton className="h-48" />
          </div>
        </main>
      </div>
    );
  }

  const currentStep = getCurrentStep();
  const stepsWithProgress = getStepsWithProgress();
  const priorityActions = getPriorityActions();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* Header with Status Pills */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Command Center</h1>
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

        {/* Priority Actions + Asset Summary Grid */}
        <div className="space-y-6">
          <PriorityActionsStack actions={priorityActions} maxVisible={3} />
          
          {/* Asset Cards Row */}
          <div className="grid md:grid-cols-2 gap-4">
            <AssetSummaryCard
              hasIcpDocument={!!icpAsset}
              leadMagnetsCount={leadMagnetsCount}
              scriptsCount={scriptsCount}
            />
            <AssetVaultScripts />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Button
            variant="outline"
            className="h-auto py-4 flex flex-col items-center gap-2"
            onClick={() => navigate('/script-builder')}
          >
            <Briefcase className="w-5 h-5" />
            <span className="text-sm">Script Builder</span>
          </Button>
          <Button
            variant="outline"
            className="h-auto py-4 flex flex-col items-center gap-2 relative"
            onClick={() => navigate('/script-builder')}
          >
            <FolderOpen className="w-5 h-5" />
            <span className="text-sm">Asset Vault</span>
            {(leadMagnetsCount + scriptsCount) > 0 && (
              <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {leadMagnetsCount + scriptsCount}
              </span>
            )}
          </Button>
          <Button
            variant="outline"
            className="h-auto py-4 flex flex-col items-center gap-2"
            onClick={() => navigate('/courses')}
          >
            <GraduationCap className="w-5 h-5" />
            <span className="text-sm">Courses</span>
          </Button>
          <Button
            variant="outline"
            className="h-auto py-4 flex flex-col items-center gap-2"
            onClick={() => navigate('/integrations')}
          >
            <Settings className="w-5 h-5" />
            <span className="text-sm">Integrations</span>
          </Button>
          <Button
            variant="outline"
            className="h-auto py-4 flex flex-col items-center gap-2"
            onClick={() => navigate('/sales-vault')}
          >
            <Target className="w-5 h-5" />
            <span className="text-sm">Sales Vault</span>
          </Button>
        </div>

        {/* Floating Growth Copilot */}
        <GrowthCopilotSheet />
      </main>
    </div>
  );
}
