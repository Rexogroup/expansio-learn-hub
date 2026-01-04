import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RevenueKPICard } from "@/components/revenue/RevenueKPICard";
import { RevenueFunnel } from "@/components/revenue/RevenueFunnel";
import { ChannelFilter, Channel } from "@/components/revenue/ChannelFilter";
import { TimePeriodFilter, TimePeriod, DateRange, getDateRange } from "@/components/revenue/TimePeriodFilter";
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
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('last_30');
  const [dateRange, setDateRange] = useState<DateRange>(getDateRange('last_30'));
  const [loading, setLoading] = useState(true);
  const [teamIds, setTeamIds] = useState<string[]>([]);
  const [totalEmailsSent, setTotalEmailsSent] = useState(0);

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
        // Fetch CRM leads
        const { data: leadsData } = await supabase
          .from('crm_leads')
          .select('id, lead_name, status, meeting_booked, meeting_status, deal_value, source_type, interested, created_at')
          .in('team_id', uniqueTeamIds);

        setLeads((leadsData as CRMLead[]) || []);

        // Fetch total emails sent from synced_campaigns for current user
        const { data: campaignsData } = await supabase
          .from('synced_campaigns')
          .select('emails_sent')
          .eq('user_id', session.user.id);
        
        let emailsSent = 0;
        if (campaignsData) {
          for (const c of campaignsData) {
            emailsSent += c.emails_sent || 0;
          }
        }
        setTotalEmailsSent(emailsSent);
      }
      
      setLoading(false);
    };

    fetchData();
  }, []);

  const handleTimePeriodChange = (period: TimePeriod, range: DateRange) => {
    setTimePeriod(period);
    setDateRange(range);
  };

  // Filter leads by date range and channel
  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      // Date filter
      if (lead.created_at) {
        const leadDate = new Date(lead.created_at);
        if (leadDate < dateRange.from || leadDate > dateRange.to) {
          return false;
        }
      }
      
      // Channel filter
      if (channel === 'all') return true;
      if (channel === 'cold_email') return lead.source_type === 'cold_email';
      return lead.source_type !== 'cold_email';
    });
  }, [leads, channel, dateRange]);

  // Filter SDR leads by date for contacted count
  const filteredSdrLeads = useMemo(() => {
    return leads.filter(lead => {
      if (lead.source_type === 'cold_email') return false;
      if (lead.created_at) {
        const leadDate = new Date(lead.created_at);
        return leadDate >= dateRange.from && leadDate <= dateRange.to;
      }
      return true;
    });
  }, [leads, dateRange]);

  // Calculate Total Contacted (note: emails_sent doesn't have date filter as it's aggregate)
  const sdrLeadsCount = filteredSdrLeads.length;
  const totalContacted = channel === 'cold_email' 
    ? totalEmailsSent 
    : channel === 'sdr' 
      ? sdrLeadsCount 
      : totalEmailsSent + sdrLeadsCount;

  // Calculate KPIs
  const interestedLeads = filteredLeads.filter(l => l.interested).length;
  const bookedCalls = filteredLeads.filter(l => l.meeting_booked).length;
  const liveCalls = filteredLeads.filter(l => l.meeting_status === 'completed').length;
  const closedDeals = filteredLeads.filter(l => l.status === 'closed_won').length;

  // Calculate rates
  const interestedRate = totalContacted > 0 ? (interestedLeads / totalContacted) * 100 : 0;
  const bookRate = interestedLeads > 0 ? (bookedCalls / interestedLeads) * 100 : 0;
  const showRate = bookedCalls > 0 ? (liveCalls / bookedCalls) * 100 : 0;
  const closeRate = liveCalls > 0 ? (closedDeals / liveCalls) * 100 : 0;

  // Calculate revenue metrics
  const closedWonLeads = filteredLeads.filter(l => l.status === 'closed_won');
  const totalRevenue = closedWonLeads.reduce((sum, l) => sum + (l.deal_value || 0), 0);
  const avgDealSize = closedDeals > 0 ? totalRevenue / closedDeals : 0;

  // Funnel stages - now includes Contacted
  const funnelStages = [
    { name: 'Contacted', count: totalContacted },
    { name: 'Interested', count: interestedLeads, conversionRate: interestedRate, benchmark: 5 },
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
        
        <div className="flex items-center gap-3">
          <TimePeriodFilter 
            value={timePeriod} 
            customRange={timePeriod === 'custom' ? dateRange : undefined}
            onChange={handleTimePeriodChange} 
          />
          <ChannelFilter value={channel} onChange={setChannel} />
        </div>
      </div>

      {/* KPI Grid - Row 1 */}
      <div className="grid grid-cols-5 gap-4">
        <RevenueKPICard
          title="Contacted"
          value={totalContacted}
        />
        <RevenueKPICard
          title="Interest Rate %"
          value={interestedRate}
          isPercentage
          showBenchmark
          benchmark={5}
          benchmarkLabel=">5%"
        />
        <RevenueKPICard
          title="Interested"
          value={interestedLeads}
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
      </div>

      {/* KPI Grid - Row 2 */}
      <div className="grid grid-cols-5 gap-4">
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
          title="Avg Deal Size"
          value={avgDealSize}
          isCurrency
        />
      </div>

      {/* Funnel and Insights */}
      <div className="grid grid-cols-2 gap-6">
        <RevenueFunnel stages={funnelStages} />
        
        <div className="space-y-4">
          <BottleneckInsights
            interestedRate={interestedRate}
            bookRate={bookRate}
            showRate={showRate}
            closeRate={closeRate}
          />
        </div>
      </div>
    </div>
  );
}
