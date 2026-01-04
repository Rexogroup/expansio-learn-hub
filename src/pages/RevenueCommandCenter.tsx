import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RevenueKPICard } from "@/components/revenue/RevenueKPICard";
import { RevenueFunnel } from "@/components/revenue/RevenueFunnel";
import { ChannelFilter, Channel } from "@/components/revenue/ChannelFilter";
import { BottleneckInsights } from "@/components/revenue/BottleneckInsights";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign } from "lucide-react";

interface CRMLead {
  id: string;
  lead_name: string;
  status: string;
  meeting_booked: boolean | null;
  meeting_status: string | null;
  deal_value: number | null;
  source_type: string | null;
  interested: boolean | null;
  created_at: string | null;
}

export default function RevenueCommandCenter() {
  const [leads, setLeads] = useState<CRMLead[]>([]);
  const [channel, setChannel] = useState<Channel>('all');
  const [loading, setLoading] = useState(true);
  const [teamIds, setTeamIds] = useState<string[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      // Get user's teams
      const { data: teams } = await supabase
        .from('teams')
        .select('id')
        .or(`owner_id.eq.${session.user.id}`);

      const { data: memberTeams } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', session.user.id);

      const allTeamIds = [
        ...(teams?.map(t => t.id) || []),
        ...(memberTeams?.map(t => t.team_id) || []),
      ];
      
      const uniqueTeamIds = [...new Set(allTeamIds)];
      setTeamIds(uniqueTeamIds);

      if (uniqueTeamIds.length > 0) {
        const { data: leadsData } = await supabase
          .from('crm_leads')
          .select('*')
          .in('team_id', uniqueTeamIds);

        setLeads(leadsData || []);
      }
      
      setLoading(false);
    };

    fetchData();
  }, []);

  // Filter leads by channel
  const filteredLeads = leads.filter(lead => {
    if (channel === 'all') return true;
    if (channel === 'cold_email') return lead.source_type === 'cold_email';
    return lead.source_type !== 'cold_email';
  });

  // Calculate KPIs
  const totalLeads = filteredLeads.length;
  const interestedLeads = filteredLeads.filter(l => l.interested).length;
  const bookedCalls = filteredLeads.filter(l => l.meeting_booked).length;
  const liveCalls = filteredLeads.filter(l => l.meeting_status === 'completed').length;
  const closedDeals = filteredLeads.filter(l => l.status === 'closed_won').length;

  // Calculate rates
  const bookRate = interestedLeads > 0 ? (bookedCalls / interestedLeads) * 100 : 0;
  const showRate = bookedCalls > 0 ? (liveCalls / bookedCalls) * 100 : 0;
  const closeRate = liveCalls > 0 ? (closedDeals / liveCalls) * 100 : 0;

  // Calculate revenue metrics
  const closedWonLeads = filteredLeads.filter(l => l.status === 'closed_won');
  const cashCollected = closedWonLeads.reduce((sum, l) => sum + (l.deal_value || 0), 0);
  const mrr = cashCollected; // Simplified - assumes monthly deals
  const arr = mrr * 12;

  // Funnel stages
  const funnelStages = [
    { name: 'Interested', count: interestedLeads },
    { name: 'Booked', count: bookedCalls, conversionRate: bookRate, benchmark: 20 },
    { name: 'Live Calls', count: liveCalls, conversionRate: showRate, benchmark: 60 },
    { name: 'Closed', count: closedDeals, conversionRate: closeRate, benchmark: 15 },
  ];

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-80" />
        </div>
        <div className="grid grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <DollarSign className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Revenue Command Center</h1>
            <p className="text-sm text-muted-foreground">
              Unified view of your business growth metrics
            </p>
          </div>
        </div>
        
        <ChannelFilter value={channel} onChange={setChannel} />
      </div>

      {/* KPI Grid - Row 1 */}
      <div className="grid grid-cols-5 gap-4">
        <RevenueKPICard
          title="Leads"
          value={totalLeads}
        />
        <RevenueKPICard
          title="Book Rate %"
          value={bookRate}
          isPercentage
          showBenchmark
          benchmark={20}
          benchmarkLabel=">20%"
        />
        <RevenueKPICard
          title="Booked Calls"
          value={bookedCalls}
        />
        <RevenueKPICard
          title="Show Rate %"
          value={showRate}
          isPercentage
          showBenchmark
          benchmark={60}
          benchmarkLabel=">60%"
        />
        <RevenueKPICard
          title="Live Calls"
          value={liveCalls}
        />
      </div>

      {/* KPI Grid - Row 2 */}
      <div className="grid grid-cols-5 gap-4">
        <RevenueKPICard
          title="Close Rate %"
          value={closeRate}
          isPercentage
          showBenchmark
          benchmark={15}
          benchmarkLabel=">15%"
        />
        <RevenueKPICard
          title="Closed Deals"
          value={closedDeals}
        />
        <RevenueKPICard
          title="MRR"
          value={mrr}
          isCurrency
        />
        <RevenueKPICard
          title="ARR"
          value={arr}
          isCurrency
        />
        <RevenueKPICard
          title="Cash Collected"
          value={cashCollected}
          isCurrency
        />
      </div>

      {/* Funnel and Insights */}
      <div className="grid grid-cols-2 gap-6">
        <RevenueFunnel stages={funnelStages} />
        
        <div className="space-y-4">
          <BottleneckInsights
            bookRate={bookRate}
            showRate={showRate}
            closeRate={closeRate}
          />
        </div>
      </div>
    </div>
  );
}
