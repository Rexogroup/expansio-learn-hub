import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { StepProgressBar } from "@/components/growth/StepProgressBar";
import { KPIComparisonCard } from "@/components/growth/KPIComparisonCard";
import { ValidationBadge } from "@/components/growth/ValidationBadge";
import { RecommendedAction } from "@/components/growth/RecommendedAction";
import { CampaignMetricsCard } from "@/components/growth/CampaignMetricsCard";
import { CampaignPerformanceHistory } from "@/components/growth/CampaignPerformanceHistory";
import { GrowthCopilotChat } from "@/components/growth/GrowthCopilotChat";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Target, Briefcase, Settings, FolderOpen } from "lucide-react";
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

export default function CommandCenter() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [steps, setSteps] = useState<GrowthStep[]>([]);
  const [userProgress, setUserProgress] = useState<UserProgress[]>([]);
  const [currentStepNumber, setCurrentStepNumber] = useState(1);
  const [campaignMetrics, setCampaignMetrics] = useState<CampaignMetrics | null>(null);
  const [integration, setIntegration] = useState<Integration | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [assetCount, setAssetCount] = useState(0);
  const [timelineDays, setTimelineDays] = useState(10);

  useEffect(() => {
    checkAuthAndFetch();
  }, []);

  useEffect(() => {
    const fetchMetricsForTimeline = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await fetchCampaignMetrics(session.user.id, timelineDays);
      }
    };
    
    if (!loading) {
      fetchMetricsForTimeline();
    }
  }, [timelineDays, loading]);

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
      fetchAssetCount(session.user.id),
    ]);
    setLoading(false);
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
      
      // Determine current step (first non-validated step)
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

  const fetchCampaignMetrics = async (userId: string, _days: number) => {
    // Fetch all campaigns - showing all-time cumulative data
    // Timeline filtering will work properly once historical snapshots are collected
    const { data, error } = await supabase
      .from('synced_campaigns')
      .select('emails_sent, unique_opens, unique_replies, interested_count, meetings_booked')
      .eq('user_id', userId);

    if (!error && data && data.length > 0) {
      // Aggregate metrics from all campaigns
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

  const fetchAssetCount = async (userId: string) => {
    const { count } = await supabase
      .from('user_assets')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);
    
    setAssetCount(count || 0);
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
    } catch (error) {
      console.error('Sync error:', error);
      toast.error('Failed to sync campaign data');
    } finally {
      setIsSyncing(false);
    }
  };

  const getCurrentStep = () => steps.find(s => s.step_number === currentStepNumber);
  
  const getCurrentProgress = () => {
    const step = getCurrentStep();
    if (!step) return null;
    return userProgress.find(p => p.step_id === step.id);
  };

  const getStepsWithProgress = () => {
    return steps.map(step => {
      const progress = userProgress.find(p => p.step_id === step.id);
      return {
        ...step,
        status: progress?.status || 'not_started' as const,
      };
    });
  };

  const getRecommendedAction = () => {
    const step = getCurrentStep();
    const progress = getCurrentProgress();
    
    if (!step) return null;

    // Check if integration is connected for step 4+
    if (currentStepNumber >= 4 && !integration) {
      return {
        title: 'Connect Your Outbound Platform',
        description: 'Link your email sending platform to sync campaign data and track your performance.',
        actionLabel: 'Connect Integration',
        actionPath: '/integrations',
      };
    }

    // Step-specific recommendations
    switch (step.step_number) {
      case 1:
        return {
          title: 'Complete Infrastructure Setup',
          description: 'Verify your DNS records, warm-up status, and sending reputation.',
          actionLabel: 'Start Checklist',
          actionPath: '/onboarding',
        };
      case 2:
        return {
          title: 'Define Your ICP & Offer',
          description: 'Create a detailed ideal customer profile and compelling offer.',
          actionLabel: 'Open Script Builder',
          actionPath: '/script-builder',
        };
      case 3:
        return {
          title: 'Create Lead Magnets',
          description: 'Build at least 3 lead magnet variants to test different angles.',
          actionLabel: 'Create Lead Magnet',
          actionPath: '/script-builder',
        };
      case 4:
        if (campaignMetrics && campaignMetrics.interested_rate < 1.2) {
          return {
            title: 'Improve Your Interested Rate',
            description: 'Your interested rate is below benchmark. Test new offer variants to improve resonance.',
            actionLabel: 'Create New Offer Variant',
            actionPath: '/script-builder',
          };
        }
        return {
          title: 'Analyze Campaign Performance',
          description: 'Review your metrics and identify areas for improvement.',
          actionLabel: 'View Campaigns',
          actionPath: '/integrations',
        };
      case 5:
        return {
          title: 'Optimize Appointment Setting',
          description: 'Focus on quick follow-up and value-driven booking scripts.',
          actionLabel: 'Review Sales Scripts',
          actionPath: '/sales-vault',
        };
      case 6:
        return {
          title: 'Scale Your Outreach',
          description: 'Increase volume while maintaining your validated metrics.',
          actionLabel: 'View Scaling Playbook',
          actionPath: '/courses',
        };
      case 7:
        return {
          title: 'Optimize Close Rates',
          description: 'Analyze objections and improve your sales process.',
          actionLabel: 'Review Sales Calls',
          actionPath: '/sales-vault',
        };
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-8 space-y-8">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-24 w-full" />
          <div className="grid md:grid-cols-2 gap-6">
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
          </div>
        </main>
      </div>
    );
  }

  const currentStep = getCurrentStep();
  const currentProgress = getCurrentProgress();
  const recommendedAction = getRecommendedAction();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Command Center</h1>
            <p className="text-muted-foreground mt-1">
              Track your growth journey and next actions
            </p>
          </div>
          <ValidationBadge status={currentProgress?.status || 'not_started'} />
        </div>

        {/* Step Progress Bar */}
        <Card>
          <CardContent className="py-6">
            <StepProgressBar
              steps={getStepsWithProgress()}
              currentStep={currentStepNumber}
              onStepClick={(stepNum) => setCurrentStepNumber(stepNum)}
            />
          </CardContent>
        </Card>

        {/* Current Step Info */}
        {currentStep && (
          <Card className="border-primary/20">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Target className="w-6 h-6 text-primary" />
                <div>
                  <CardTitle>{currentStep.name}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {currentStep.description}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                💡 {currentStep.help_content}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Campaign Metrics */}
        <CampaignMetricsCard
          metrics={campaignMetrics}
          isLoading={false}
          lastSyncAt={integration?.last_sync_at}
          onSync={handleSync}
          isSyncing={isSyncing}
          timelineDays={timelineDays}
          onTimelineChange={setTimelineDays}
        />

        {/* Main Content Grid - KPIs, Actions, and Copilot */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - KPIs and Actions */}
          <div className="lg:col-span-2 space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* KPI Comparison */}
              {currentStep && currentStep.benchmark_kpi_name && (
                <KPIComparisonCard
                  title={currentStep.benchmark_kpi_name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  currentValue={
                    currentStep.benchmark_kpi_name === 'interested_rate' 
                      ? (campaignMetrics?.interested_rate || 0)
                      : currentStep.benchmark_kpi_name === 'reply_rate'
                        ? (campaignMetrics?.reply_rate || 0)
                        : (currentProgress?.current_kpi_value || 0)
                  }
                  benchmarkValue={Number(currentStep.benchmark_kpi_value)}
                  unit={currentStep.benchmark_kpi_unit}
                  description={`Target: ${currentStep.benchmark_kpi_value}${currentStep.benchmark_kpi_unit === 'percent' ? '%' : ''}`}
                />
              )}

              {/* Recommended Action */}
              {recommendedAction && (
                <RecommendedAction
                  title={recommendedAction.title}
                  description={recommendedAction.description}
                  actionLabel={recommendedAction.actionLabel}
                  actionPath={recommendedAction.actionPath}
                />
              )}
            </div>

            {/* Campaign Performance History */}
            <CampaignPerformanceHistory
              onSync={handleSync}
              isSyncing={isSyncing}
              benchmark={1.2}
              timelineDays={timelineDays}
              onTimelineChange={setTimelineDays}
            />
          </div>

          {/* Right Column - AI Copilot */}
          <div className="lg:col-span-1">
            <div className="sticky top-4">
              <GrowthCopilotChat />
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
            {assetCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {assetCount}
              </span>
            )}
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
      </main>
    </div>
  );
}
