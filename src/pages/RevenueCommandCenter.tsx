import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RevenueKPICard } from "@/components/revenue/RevenueKPICard";
import { RevenueFunnel } from "@/components/revenue/RevenueFunnel";
import { ChannelFilter, Channel } from "@/components/revenue/ChannelFilter";
import { TimelineFilter } from "@/components/growth/TimelineFilter";
import { BottleneckInsights } from "@/components/revenue/BottleneckInsights";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  DollarSign, 
  Users, 
  MessageSquare, 
  Sparkles, 
  Calendar, 
  Video, 
  Trophy, 
  TrendingUp
} from "lucide-react";
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
  const [totalReplies, setTotalReplies] = useState(0);
  const [interestedFromCampaigns, setInterestedFromCampaigns] = useState(0);
  const [meetingsFromCampaigns, setMeetingsFromCampaigns] = useState(0);

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
        .select('emails_sent, unique_replies, interested_count, meetings_booked')
        .eq('user_id', session.user.id)
        .eq('timeline_days', timelineDays);
      
      let emailsSent = 0;
      let replies = 0;
      let interested = 0;
      let meetings = 0;
      if (campaignsData) {
        for (const c of campaignsData) {
          emailsSent += c.emails_sent || 0;
          replies += c.unique_replies || 0;
          interested += c.interested_count || 0;
          meetings += c.meetings_booked || 0;
        }
      }
      setTotalEmailsSent(emailsSent);
      setTotalReplies(replies);
      setInterestedFromCampaigns(interested);
      setMeetingsFromCampaigns(meetings);
      
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
  
  // Use campaign meetings for cold email, CRM booked for SDR
  const sdrBookedCalls = filteredLeads.filter(l => l.meeting_booked && l.source_type !== 'cold_email').length;
  const bookedCalls = channel === 'cold_email' 
    ? meetingsFromCampaigns 
    : channel === 'sdr' 
      ? sdrBookedCalls 
      : meetingsFromCampaigns + sdrBookedCalls;
  
  const liveCalls = filteredLeads.filter(l => l.meeting_status === 'completed').length;
  const closedDeals = filteredLeads.filter(l => l.status === 'closed_won').length;

  // Calculate Reply Rate (Replies / Contacted) for cold email
  const coldEmailReplyRate = totalEmailsSent > 0 ? (totalReplies / totalEmailsSent) * 100 : 0;
  const replyRate = channel === 'cold_email' 
    ? coldEmailReplyRate 
    : channel === 'sdr' 
      ? 0 
      : totalEmailsSent > 0 ? (totalReplies / totalEmailsSent) * 100 : 0;

  // Total Replies display by channel
  const totalRepliesDisplay = channel === 'cold_email' 
    ? totalReplies 
    : channel === 'sdr' 
      ? 0 
      : totalReplies;

  // Calculate rates - use Interested / Replies for cold email (matches Campaigns page)
  const sdrInterestedRate = sdrLeadsCount > 0 ? (sdrInterestedLeads / sdrLeadsCount) * 100 : 0;
  const coldEmailInterestedRate = totalReplies > 0 ? (interestedFromCampaigns / totalReplies) * 100 : 0;
  
  const interestedRate = channel === 'cold_email' 
    ? coldEmailInterestedRate 
    : channel === 'sdr' 
      ? sdrInterestedRate 
      : (totalReplies + sdrLeadsCount) > 0 
        ? ((interestedFromCampaigns + sdrInterestedLeads) / (totalReplies + sdrLeadsCount)) * 100 
        : 0;
  
  const bookRate = interestedLeads > 0 ? (bookedCalls / interestedLeads) * 100 : 0;
  const showRate = bookedCalls > 0 ? (liveCalls / bookedCalls) * 100 : 0;
  const closeRate = liveCalls > 0 ? (closedDeals / liveCalls) * 100 : 0;

  // Calculate revenue metrics
  const closedWonLeads = filteredLeads.filter(l => l.status === 'closed_won');
  const totalRevenue = closedWonLeads.reduce((sum, l) => sum + (l.deal_value || 0), 0);

  // Funnel stages - now includes Replies between Contacted and Interested
  const funnelStages = [
    { name: 'Contacted', count: totalContacted },
    { name: 'Replies', count: totalRepliesDisplay, conversionRate: replyRate, benchmark: 1.5 },
    { name: 'Interested', count: interestedLeads, conversionRate: interestedRate, benchmark: 10 },
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
    <div className="min-h-screen">
      {/* Premium Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/95 via-primary to-primary/90 px-6 py-8 mb-8">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
            backgroundSize: '32px 32px'
          }} />
        </div>
        
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center ring-1 ring-white/20">
              <TrendingUp className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">Revenue Command Center</h1>
              <p className="text-primary-foreground/80 mt-1">
                Unified view of your business growth metrics
              </p>
            </div>
          </div>
          
          {/* Summary Stats in Hero */}
          <div className="hidden lg:flex items-center gap-6">
            <div className="text-right">
              <p className="text-xs font-medium text-white/60 uppercase tracking-wider">Total Revenue</p>
              <p className="text-2xl font-bold text-white">${totalRevenue.toLocaleString()}</p>
            </div>
            <div className="h-12 w-px bg-white/20" />
            <div className="text-right">
              <p className="text-xs font-medium text-white/60 uppercase tracking-wider">Closed Deals</p>
              <p className="text-2xl font-bold text-white">{closedDeals}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <TimelineFilter value={timelineDays} onChange={setTimelineDays} />
            <ChannelFilter value={channel} onChange={setChannel} />
          </div>
        </div>
      </div>

      <div className="px-6 space-y-8 pb-8">
        {/* Section: Overview */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-1 w-1 rounded-full bg-primary" />
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Overview</h2>
          </div>
          <div className="grid grid-cols-4 gap-5">
            <RevenueKPICard
              title="Contacted"
              value={totalContacted}
              icon={Users}
            />
            <RevenueKPICard
              title="Reply Rate"
              value={replyRate}
              secondaryValue={totalRepliesDisplay}
              isPercentage
              showBenchmark
              benchmark={1.5}
              benchmarkLabel=">1.5%"
              icon={MessageSquare}
            />
            <RevenueKPICard
              title="Interest Rate"
              value={interestedRate}
              secondaryValue={interestedLeads}
              isPercentage
              showBenchmark
              benchmark={10}
              benchmarkLabel=">10%"
              icon={Sparkles}
            />
            <RevenueKPICard
              title="Book Rate"
              value={bookRate}
              secondaryValue={bookedCalls}
              isPercentage
              showBenchmark
              benchmark={20}
              benchmarkLabel=">20%"
              icon={Calendar}
            />
          </div>
          <div className="grid grid-cols-3 gap-5">
            <RevenueKPICard
              title="Show Rate"
              value={showRate}
              secondaryValue={liveCalls}
              isPercentage
              showBenchmark
              benchmark={60}
              benchmarkLabel=">60%"
              icon={Video}
            />
            <RevenueKPICard
              title="Close Rate"
              value={closeRate}
              secondaryValue={closedDeals}
              isPercentage
              showBenchmark
              benchmark={15}
              benchmarkLabel=">15%"
              icon={Trophy}
            />
            <RevenueKPICard
              title="Total Revenue"
              value={totalRevenue}
              isCurrency
              icon={DollarSign}
              variant="highlight"
            />
          </div>
        </div>

        {/* Section: Conversion Funnel */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-1 w-1 rounded-full bg-primary" />
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Conversion Funnel</h2>
          </div>
          <RevenueFunnel stages={funnelStages} />
        </div>

        {/* Section: Growth Opportunities */}
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
