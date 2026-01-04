import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RevenueKPICard } from "@/components/revenue/RevenueKPICard";
import { RevenueFunnel } from "@/components/revenue/RevenueFunnel";
import { ChannelFilter, Channel } from "@/components/revenue/ChannelFilter";
import { TimelineFilter } from "@/components/growth/TimelineFilter";
import { BottleneckInsights } from "@/components/revenue/BottleneckInsights";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign } from "lucide-react";
import { subDays } from "date-fns";

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
  const [timelineDays, setTimelineDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [teamIds, setTeamIds] = useState<string[]>([]);
  const [totalEmailsSent, setTotalEmailsSent] = useState(0);
  const [interestedFromCampaigns, setInterestedFromCampaigns] = useState(0);

  // Calculate date range from timelineDays
  const dateRange = useMemo(() => {
    const now = new Date();
    return { from: subDays(now, timelineDays), to: now };
  }, [timelineDays]);

  // Fetch teams on mount
  useEffect(() => {
    const fetchTeams = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setLoading(false);
        return;
      }

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
      
      setTeamIds([...new Set(allTeamIds)]);
    };

    fetchTeams();
  }, []);

  // Fetch data when teamIds or timelineDays changes
  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      setLoading(true);

      // Fetch CRM leads
      if (teamIds.length > 0) {
        const { data: leadsData } = await supabase
          .from('crm_leads')
          .select('id, lead_name, status, meeting_booked, meeting_status, deal_value, source_type, interested, created_at')
          .in('team_id', teamIds);

        setLeads((leadsData as CRMLead[]) || []);
      }

      // Fetch campaign metrics filtered by timeline_days
      const { data: campaignsData } = await supabase
        .from('synced_campaigns')
        .select('emails_sent, interested_count')
        .eq('user_id', session.user.id)
        .eq('timeline_days', timelineDays);
      
      let emailsSent = 0;
      let interested = 0;
      if (campaignsData) {
        for (const c of campaignsData) {
          emailsSent += c.emails_sent || 0;
          interested += c.interested_count || 0;
        }
      }
      setTotalEmailsSent(emailsSent);
      setInterestedFromCampaigns(interested);
      
      setLoading(false);
    };

    fetchData();
  }, [teamIds, timelineDays]);

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

  // Calculate Total Contacted
  const sdrLeadsCount = filteredSdrLeads.length;
  const totalContacted = channel === 'cold_email' 
    ? totalEmailsSent 
    : channel === 'sdr' 
      ? sdrLeadsCount 
      : totalEmailsSent + sdrLeadsCount;

  // Calculate KPIs - use campaign data for cold email interested count
  const sdrInterestedLeads = filteredLeads.filter(l => l.interested && l.source_type !== 'cold_email').length;
  const interestedLeads = channel === 'cold_email' 
    ? interestedFromCampaigns 
    : channel === 'sdr' 
      ? sdrInterestedLeads 
      : interestedFromCampaigns + sdrInterestedLeads;
  
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
          <TimelineFilter value={timelineDays} onChange={setTimelineDays} />
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
