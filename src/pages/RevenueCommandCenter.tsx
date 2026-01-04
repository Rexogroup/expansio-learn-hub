import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RevenueKPICardWithComparison } from "@/components/revenue/RevenueKPICardWithComparison";
import { RevenueFunnel } from "@/components/revenue/RevenueFunnel";
import { ChannelFilter, Channel } from "@/components/revenue/ChannelFilter";
import { TimelineFilter } from "@/components/growth/TimelineFilter";
import { BottleneckInsights } from "@/components/revenue/BottleneckInsights";
import { ComparisonPeriodPicker, ComparisonType, DateRange } from "@/components/revenue/ComparisonPeriodPicker";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  DollarSign, 
  Users, 
  MessageSquare, 
  Sparkles, 
  Calendar, 
  Video, 
  Trophy, 
  TrendingUp,
  TrendingDown,
  FileText
} from "lucide-react";
import { subDays, subMonths, subYears } from "date-fns";
import { cn } from "@/lib/utils";

interface CRMLead {
  id: string;
  lead_name: string;
  status: string;
  meeting_booked: boolean | null;
  meeting_status: string | null;
  meeting_datetime: string | null;
  deal_value: number | null;
  source_type: string | null;
  interested: boolean | null;
  created_at: string | null;
  closed_at: string | null;
  status_changed_at: string | null;
  proposal_status: string | null;
}

export default function RevenueCommandCenter() {
  const [leads, setLeads] = useState<CRMLead[]>([]);
  const [channel, setChannel] = useState<Channel>('all');
  const [timelineDays, setTimelineDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [teamIds, setTeamIds] = useState<string[]>([]);
  const [showComparison, setShowComparison] = useState(false);
  const [comparisonType, setComparisonType] = useState<ComparisonType>('previous');
  const [customComparisonRange, setCustomComparisonRange] = useState<DateRange | null>(null);
  
  // Current period campaign metrics
  const [totalEmailsSent, setTotalEmailsSent] = useState(0);
  const [totalReplies, setTotalReplies] = useState(0);
  const [interestedFromCampaigns, setInterestedFromCampaigns] = useState(0);
  const [meetingsFromCampaigns, setMeetingsFromCampaigns] = useState(0);
  
  // Previous period campaign metrics
  const [prevTotalEmailsSent, setPrevTotalEmailsSent] = useState(0);
  const [prevTotalReplies, setPrevTotalReplies] = useState(0);
  const [prevInterestedFromCampaigns, setPrevInterestedFromCampaigns] = useState(0);
  const [prevMeetingsFromCampaigns, setPrevMeetingsFromCampaigns] = useState(0);

  // Calculate date range from timelineDays
  const dateRange = useMemo(() => {
    const now = new Date();
    return { from: subDays(now, timelineDays), to: now };
  }, [timelineDays]);
  
  // Calculate previous period date range based on comparison type
  const previousDateRange = useMemo(() => {
    switch (comparisonType) {
      case 'previous':
        const previousEnd = subDays(dateRange.from, 1);
        const previousStart = subDays(previousEnd, timelineDays - 1);
        return { from: previousStart, to: previousEnd };
      case 'last_month':
        return { 
          from: subMonths(dateRange.from, 1), 
          to: subMonths(dateRange.to, 1) 
        };
      case 'last_year':
        return { 
          from: subYears(dateRange.from, 1), 
          to: subYears(dateRange.to, 1) 
        };
      case 'custom':
        return customComparisonRange || { from: subDays(dateRange.from, timelineDays), to: subDays(dateRange.from, 1) };
      default:
        return { from: subDays(dateRange.from, timelineDays), to: subDays(dateRange.from, 1) };
    }
  }, [dateRange, timelineDays, comparisonType, customComparisonRange]);

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
          .select('id, lead_name, status, meeting_booked, meeting_status, meeting_datetime, deal_value, source_type, interested, created_at, closed_at, status_changed_at, proposal_status')
          .in('team_id', teamIds);

        setLeads((leadsData as CRMLead[]) || []);
      }

      // Fetch current period campaign metrics
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
      
      // Fetch previous period campaign metrics (double the timeline to calculate diff)
      const { data: prevCampaignsData } = await supabase
        .from('synced_campaigns')
        .select('emails_sent, unique_replies, interested_count, meetings_booked')
        .eq('user_id', session.user.id)
        .eq('timeline_days', timelineDays * 2);
      
      let prevEmailsSent = 0;
      let prevReplies = 0;
      let prevInterested = 0;
      let prevMeetings = 0;
      if (prevCampaignsData) {
        for (const c of prevCampaignsData) {
          prevEmailsSent += c.emails_sent || 0;
          prevReplies += c.unique_replies || 0;
          prevInterested += c.interested_count || 0;
          prevMeetings += c.meetings_booked || 0;
        }
        // Previous period = double period totals - current period totals
        prevEmailsSent = prevEmailsSent - emailsSent;
        prevReplies = prevReplies - replies;
        prevInterested = prevInterested - interested;
        prevMeetings = prevMeetings - meetings;
      }
      setPrevTotalEmailsSent(Math.max(0, prevEmailsSent));
      setPrevTotalReplies(Math.max(0, prevReplies));
      setPrevInterestedFromCampaigns(Math.max(0, prevInterested));
      setPrevMeetingsFromCampaigns(Math.max(0, prevMeetings));
      
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
  
  // Filter previous period leads
  const previousFilteredLeads = useMemo(() => {
    return leads.filter(lead => {
      if (lead.created_at) {
        const leadDate = new Date(lead.created_at);
        if (leadDate < previousDateRange.from || leadDate > previousDateRange.to) {
          return false;
        }
      }
      if (channel === 'all') return true;
      if (channel === 'cold_email') return lead.source_type === 'cold_email';
      return lead.source_type !== 'cold_email';
    });
  }, [leads, channel, previousDateRange]);
  
  // Filter previous period SDR leads
  const previousFilteredSdrLeads = useMemo(() => {
    return leads.filter(lead => {
      if (lead.source_type === 'cold_email') return false;
      if (lead.created_at) {
        const leadDate = new Date(lead.created_at);
        return leadDate >= previousDateRange.from && leadDate <= previousDateRange.to;
      }
      return false;
    });
  }, [leads, previousDateRange]);

  // Calculate Total Contacted - Current Period
  const sdrLeadsCount = filteredSdrLeads.length;
  const totalContacted = channel === 'cold_email' 
    ? totalEmailsSent 
    : channel === 'sdr' 
      ? sdrLeadsCount 
      : totalEmailsSent + sdrLeadsCount;

  // Calculate Total Contacted - Previous Period
  const prevSdrLeadsCount = previousFilteredSdrLeads.length;
  const prevTotalContacted = channel === 'cold_email' 
    ? prevTotalEmailsSent 
    : channel === 'sdr' 
      ? prevSdrLeadsCount 
      : prevTotalEmailsSent + prevSdrLeadsCount;

  // Define stages that imply earlier stages were completed (cascading logic)
  const IMPLIES_INTERESTED = ['meeting_booked', 'meeting_completed', 'proposal', 'closed_won', 'closed_lost'];
  const IMPLIES_BOOKED = ['meeting_completed', 'proposal', 'closed_won', 'closed_lost'];
  const IMPLIES_SHOWN = ['proposal', 'closed_won', 'closed_lost'];
  const IMPLIES_PROPOSAL = ['closed_won', 'closed_lost'];

  // Calculate KPIs using unified CRM-based cascading logic for ALL channels
  // This ensures consistent metrics whether data comes from imports or API sync
  
  // SDR Interested (non-cold_email)
  const sdrInterestedLeads = leads.filter(l => {
    if (l.source_type === 'cold_email') return false;
    const isInterested = l.interested || IMPLIES_INTERESTED.includes(l.status);
    if (!isInterested) return false;
    const attributionDate = l.status_changed_at || l.created_at;
    if (!attributionDate) return true;
    const date = new Date(attributionDate);
    return date >= dateRange.from && date <= dateRange.to;
  }).length;
  
  // Cold Email Interested - use CRM data with cascading logic (not external API)
  const coldEmailInterestedLeads = leads.filter(l => {
    if (l.source_type !== 'cold_email') return false;
    const isInterested = l.interested || IMPLIES_INTERESTED.includes(l.status);
    if (!isInterested) return false;
    const attributionDate = l.status_changed_at || l.created_at;
    if (!attributionDate) return true;
    const date = new Date(attributionDate);
    return date >= dateRange.from && date <= dateRange.to;
  }).length;
  
  const interestedLeads = channel === 'cold_email' 
    ? coldEmailInterestedLeads 
    : channel === 'sdr' 
      ? sdrInterestedLeads 
      : coldEmailInterestedLeads + sdrInterestedLeads;
  
  // Previous period interested - unified CRM logic
  const prevSdrInterestedLeads = leads.filter(l => {
    if (l.source_type === 'cold_email') return false;
    const isInterested = l.interested || IMPLIES_INTERESTED.includes(l.status);
    if (!isInterested) return false;
    const attributionDate = l.status_changed_at || l.created_at;
    if (!attributionDate) return false;
    const date = new Date(attributionDate);
    return date >= previousDateRange.from && date <= previousDateRange.to;
  }).length;
  
  const prevColdEmailInterestedLeads = leads.filter(l => {
    if (l.source_type !== 'cold_email') return false;
    const isInterested = l.interested || IMPLIES_INTERESTED.includes(l.status);
    if (!isInterested) return false;
    const attributionDate = l.status_changed_at || l.created_at;
    if (!attributionDate) return false;
    const date = new Date(attributionDate);
    return date >= previousDateRange.from && date <= previousDateRange.to;
  }).length;
  
  const prevInterestedLeads = channel === 'cold_email' 
    ? prevColdEmailInterestedLeads 
    : channel === 'sdr' 
      ? prevSdrInterestedLeads 
      : prevColdEmailInterestedLeads + prevSdrInterestedLeads;
  
  // SDR Booked Calls
  const sdrBookedCalls = leads.filter(l => {
    if (l.source_type === 'cold_email') return false;
    const isBooked = l.meeting_booked || IMPLIES_BOOKED.includes(l.status);
    if (!isBooked) return false;
    const attributionDate = l.meeting_datetime || l.status_changed_at || l.created_at;
    if (!attributionDate) return true;
    const date = new Date(attributionDate);
    return date >= dateRange.from && date <= dateRange.to;
  }).length;
  
  // Cold Email Booked - use CRM data with cascading logic (not external API)
  const coldEmailBookedCalls = leads.filter(l => {
    if (l.source_type !== 'cold_email') return false;
    const isBooked = l.meeting_booked || IMPLIES_BOOKED.includes(l.status);
    if (!isBooked) return false;
    const attributionDate = l.meeting_datetime || l.status_changed_at || l.created_at;
    if (!attributionDate) return true;
    const date = new Date(attributionDate);
    return date >= dateRange.from && date <= dateRange.to;
  }).length;
  
  const bookedCalls = channel === 'cold_email' 
    ? coldEmailBookedCalls 
    : channel === 'sdr' 
      ? sdrBookedCalls 
      : coldEmailBookedCalls + sdrBookedCalls;
  
  // Previous period booked - unified CRM logic
  const prevSdrBookedCalls = leads.filter(l => {
    if (l.source_type === 'cold_email') return false;
    const isBooked = l.meeting_booked || IMPLIES_BOOKED.includes(l.status);
    if (!isBooked) return false;
    const attributionDate = l.meeting_datetime || l.status_changed_at || l.created_at;
    if (!attributionDate) return false;
    const date = new Date(attributionDate);
    return date >= previousDateRange.from && date <= previousDateRange.to;
  }).length;
  
  const prevColdEmailBookedCalls = leads.filter(l => {
    if (l.source_type !== 'cold_email') return false;
    const isBooked = l.meeting_booked || IMPLIES_BOOKED.includes(l.status);
    if (!isBooked) return false;
    const attributionDate = l.meeting_datetime || l.status_changed_at || l.created_at;
    if (!attributionDate) return false;
    const date = new Date(attributionDate);
    return date >= previousDateRange.from && date <= previousDateRange.to;
  }).length;
  
  const prevBookedCalls = channel === 'cold_email' 
    ? prevColdEmailBookedCalls 
    : channel === 'sdr' 
      ? prevSdrBookedCalls 
      : prevColdEmailBookedCalls + prevSdrBookedCalls;
  
  // Live calls (shows) - cascading: meeting_status completed OR in later stage
  const liveCalls = filteredLeads.filter(l => 
    l.meeting_status === 'completed' || IMPLIES_SHOWN.includes(l.status)
  ).length;
  
  // Closed deals - use closed_at for proper date attribution
  const closedDeals = leads.filter(l => {
    if (l.status !== 'closed_won') return false;
    if (channel === 'cold_email' && l.source_type !== 'cold_email') return false;
    if (channel === 'sdr' && l.source_type === 'cold_email') return false;
    const closeDate = l.closed_at ? new Date(l.closed_at) : (l.status_changed_at ? new Date(l.status_changed_at) : null);
    if (!closeDate) return true; // Include if no date (edge case)
    return closeDate >= dateRange.from && closeDate <= dateRange.to;
  }).length;
  
  // Previous period live calls and closed deals - with cascading logic
  const prevLiveCalls = previousFilteredLeads.filter(l => 
    l.meeting_status === 'completed' || IMPLIES_SHOWN.includes(l.status)
  ).length;
  
  const prevClosedDeals = leads.filter(l => {
    if (l.status !== 'closed_won') return false;
    if (channel === 'cold_email' && l.source_type !== 'cold_email') return false;
    if (channel === 'sdr' && l.source_type === 'cold_email') return false;
    const closeDate = l.closed_at ? new Date(l.closed_at) : (l.status_changed_at ? new Date(l.status_changed_at) : null);
    if (!closeDate) return true;
    return closeDate >= previousDateRange.from && closeDate <= previousDateRange.to;
  }).length;
  
  // Count proposals sent - cascading: includes closed deals (they had proposals)
  const proposalsSent = filteredLeads.filter(l => 
    l.proposal_status === 'sent' || 
    l.proposal_status === 'viewed' || 
    l.proposal_status === 'negotiating' ||
    l.status === 'proposal' ||
    IMPLIES_PROPOSAL.includes(l.status)
  ).length;
  
  // Previous period proposals - with cascading logic
  const prevProposalsSent = previousFilteredLeads.filter(l => 
    l.proposal_status === 'sent' || 
    l.proposal_status === 'viewed' || 
    l.proposal_status === 'negotiating' ||
    l.status === 'proposal' ||
    IMPLIES_PROPOSAL.includes(l.status)
  ).length;

  // Calculate Reply Rate (Replies / Contacted) for cold email
  const coldEmailReplyRate = totalEmailsSent > 0 ? (totalReplies / totalEmailsSent) * 100 : 0;
  const replyRate = channel === 'cold_email' 
    ? coldEmailReplyRate 
    : channel === 'sdr' 
      ? 0 
      : totalEmailsSent > 0 ? (totalReplies / totalEmailsSent) * 100 : 0;

  // Previous period reply rate
  const prevColdEmailReplyRate = prevTotalEmailsSent > 0 ? (prevTotalReplies / prevTotalEmailsSent) * 100 : 0;
  const prevReplyRate = channel === 'cold_email' 
    ? prevColdEmailReplyRate 
    : channel === 'sdr' 
      ? 0 
      : prevTotalEmailsSent > 0 ? (prevTotalReplies / prevTotalEmailsSent) * 100 : 0;

  // Total Replies display by channel
  const totalRepliesDisplay = channel === 'cold_email' 
    ? totalReplies 
    : channel === 'sdr' 
      ? 0 
      : totalReplies;

  const prevTotalRepliesDisplay = channel === 'cold_email' 
    ? prevTotalReplies 
    : channel === 'sdr' 
      ? 0 
      : prevTotalReplies;

  // Calculate rates - use CRM-based interested counts for consistency
  const sdrInterestedRate = sdrLeadsCount > 0 ? (sdrInterestedLeads / sdrLeadsCount) * 100 : 0;
  const coldEmailInterestedRate = totalReplies > 0 ? (coldEmailInterestedLeads / totalReplies) * 100 : 0;
  
  const interestedRate = channel === 'cold_email' 
    ? coldEmailInterestedRate 
    : channel === 'sdr' 
      ? sdrInterestedRate 
      : (totalReplies + sdrLeadsCount) > 0 
        ? ((coldEmailInterestedLeads + sdrInterestedLeads) / (totalReplies + sdrLeadsCount)) * 100 
        : 0;

  // Previous period interest rate - use CRM-based counts
  const prevSdrInterestedRate = prevSdrLeadsCount > 0 ? (prevSdrInterestedLeads / prevSdrLeadsCount) * 100 : 0;
  const prevColdEmailInterestedRate = prevTotalReplies > 0 ? (prevColdEmailInterestedLeads / prevTotalReplies) * 100 : 0;
  
  const prevInterestedRate = channel === 'cold_email' 
    ? prevColdEmailInterestedRate 
    : channel === 'sdr' 
      ? prevSdrInterestedRate 
      : (prevTotalReplies + prevSdrLeadsCount) > 0 
        ? ((prevColdEmailInterestedLeads + prevSdrInterestedLeads) / (prevTotalReplies + prevSdrLeadsCount)) * 100 
        : 0;
  
  const bookRate = interestedLeads > 0 ? (bookedCalls / interestedLeads) * 100 : 0;
  const showRate = bookedCalls > 0 ? (liveCalls / bookedCalls) * 100 : 0;
  const proposalRate = liveCalls > 0 ? (proposalsSent / liveCalls) * 100 : 0;
  const closeRate = liveCalls > 0 ? (closedDeals / liveCalls) * 100 : 0;

  // Previous period rates
  const prevBookRate = prevInterestedLeads > 0 ? (prevBookedCalls / prevInterestedLeads) * 100 : 0;
  const prevShowRate = prevBookedCalls > 0 ? (prevLiveCalls / prevBookedCalls) * 100 : 0;
  const prevProposalRate = prevLiveCalls > 0 ? (prevProposalsSent / prevLiveCalls) * 100 : 0;
  const prevCloseRate = prevLiveCalls > 0 ? (prevClosedDeals / prevLiveCalls) * 100 : 0;

  // Calculate revenue metrics - use closed_at for proper date attribution
  const closedWonLeads = leads.filter(l => {
    if (l.status !== 'closed_won') return false;
    // Use closed_at if available, fall back to created_at
    const closeDate = l.closed_at ? new Date(l.closed_at) : (l.created_at ? new Date(l.created_at) : null);
    if (!closeDate) return false;
    // Apply channel filter
    if (channel === 'cold_email' && l.source_type !== 'cold_email') return false;
    if (channel === 'sdr' && l.source_type === 'cold_email') return false;
    return closeDate >= dateRange.from && closeDate <= dateRange.to;
  });
  const totalRevenue = closedWonLeads.reduce((sum, l) => sum + (l.deal_value || 0), 0);
  
  // Previous period revenue - use closed_at for proper date attribution
  const prevClosedWonLeads = leads.filter(l => {
    if (l.status !== 'closed_won') return false;
    const closeDate = l.closed_at ? new Date(l.closed_at) : (l.created_at ? new Date(l.created_at) : null);
    if (!closeDate) return false;
    if (channel === 'cold_email' && l.source_type !== 'cold_email') return false;
    if (channel === 'sdr' && l.source_type === 'cold_email') return false;
    return closeDate >= previousDateRange.from && closeDate <= previousDateRange.to;
  });
  const prevTotalRevenue = prevClosedWonLeads.reduce((sum, l) => sum + (l.deal_value || 0), 0);

  // Funnel stages - now includes Replies between Contacted and Interested
  const funnelStages = [
    { name: 'Contacted', count: totalContacted },
    { name: 'Replies', count: totalRepliesDisplay, conversionRate: replyRate, benchmark: 1.5 },
    { name: 'Interested', count: interestedLeads, conversionRate: interestedRate, benchmark: 10 },
    { name: 'Booked', count: bookedCalls, conversionRate: bookRate, benchmark: 20 },
    { name: 'Live Calls', count: liveCalls, conversionRate: showRate, benchmark: 60 },
    { name: 'Proposals', count: proposalsSent, conversionRate: proposalRate, benchmark: 70 },
    { name: 'Closed', count: closedDeals, conversionRate: closeRate, benchmark: 15 },
  ];
  
  // Calculate percentage change helper
  const calcChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };
  const revenueChange = calcChange(totalRevenue, prevTotalRevenue);
  const dealsChange = calcChange(closedDeals, prevClosedDeals);

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
              {showComparison && prevTotalRevenue > 0 && (
                <div className={cn(
                  "flex items-center justify-end gap-1 text-xs mt-0.5",
                  revenueChange >= 0 ? "text-emerald-300" : "text-red-300"
                )}>
                  {revenueChange >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  <span>{revenueChange >= 0 ? '+' : ''}{revenueChange.toFixed(1)}%</span>
                </div>
              )}
            </div>
            <div className="h-12 w-px bg-white/20" />
            <div className="text-right">
              <p className="text-xs font-medium text-white/60 uppercase tracking-wider">Closed Deals</p>
              <p className="text-2xl font-bold text-white">{closedDeals}</p>
              {showComparison && prevClosedDeals > 0 && (
                <div className={cn(
                  "flex items-center justify-end gap-1 text-xs mt-0.5",
                  dealsChange >= 0 ? "text-emerald-300" : "text-red-300"
                )}>
                  {dealsChange >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  <span>{dealsChange >= 0 ? '+' : ''}{dealsChange.toFixed(1)}%</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <ComparisonPeriodPicker
              enabled={showComparison}
              onToggle={setShowComparison}
              comparisonType={comparisonType}
              onTypeChange={setComparisonType}
              customRange={customComparisonRange}
              onCustomRangeChange={setCustomComparisonRange}
              currentDateRange={dateRange}
              periodDays={timelineDays}
            />
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
            <RevenueKPICardWithComparison
              title="Contacted"
              value={totalContacted}
              previousValue={showComparison ? prevTotalContacted : undefined}
              icon={Users}
              showComparison={showComparison}
            />
            <RevenueKPICardWithComparison
              title="Reply Rate"
              value={replyRate}
              previousValue={showComparison ? prevReplyRate : undefined}
              secondaryValue={totalRepliesDisplay}
              previousSecondaryValue={showComparison ? prevTotalRepliesDisplay : undefined}
              isPercentage
              showBenchmark
              benchmark={1.5}
              benchmarkLabel=">1.5%"
              icon={MessageSquare}
              showComparison={showComparison}
            />
            <RevenueKPICardWithComparison
              title="Interest Rate"
              value={interestedRate}
              previousValue={showComparison ? prevInterestedRate : undefined}
              secondaryValue={interestedLeads}
              previousSecondaryValue={showComparison ? prevInterestedLeads : undefined}
              isPercentage
              showBenchmark
              benchmark={10}
              benchmarkLabel=">10%"
              icon={Sparkles}
              showComparison={showComparison}
            />
            <RevenueKPICardWithComparison
              title="Book Rate"
              value={bookRate}
              previousValue={showComparison ? prevBookRate : undefined}
              secondaryValue={bookedCalls}
              previousSecondaryValue={showComparison ? prevBookedCalls : undefined}
              isPercentage
              showBenchmark
              benchmark={20}
              benchmarkLabel=">20%"
              icon={Calendar}
              showComparison={showComparison}
            />
          </div>
          <div className="grid grid-cols-4 gap-5">
            <RevenueKPICardWithComparison
              title="Show Rate"
              value={showRate}
              previousValue={showComparison ? prevShowRate : undefined}
              secondaryValue={liveCalls}
              previousSecondaryValue={showComparison ? prevLiveCalls : undefined}
              isPercentage
              showBenchmark
              benchmark={60}
              benchmarkLabel=">60%"
              icon={Video}
              showComparison={showComparison}
            />
            <RevenueKPICardWithComparison
              title="Proposal Rate"
              value={proposalRate}
              previousValue={showComparison ? prevProposalRate : undefined}
              secondaryValue={proposalsSent}
              previousSecondaryValue={showComparison ? prevProposalsSent : undefined}
              isPercentage
              showBenchmark
              benchmark={70}
              benchmarkLabel=">70%"
              icon={FileText}
              showComparison={showComparison}
            />
            <RevenueKPICardWithComparison
              title="Close Rate"
              value={closeRate}
              previousValue={showComparison ? prevCloseRate : undefined}
              secondaryValue={closedDeals}
              previousSecondaryValue={showComparison ? prevClosedDeals : undefined}
              isPercentage
              showBenchmark
              benchmark={15}
              benchmarkLabel=">15%"
              icon={Trophy}
              showComparison={showComparison}
            />
            <RevenueKPICardWithComparison
              title="Total Revenue"
              value={totalRevenue}
              previousValue={showComparison ? prevTotalRevenue : undefined}
              isCurrency
              icon={DollarSign}
              variant="highlight"
              showComparison={showComparison}
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
            proposalRate={proposalRate}
            closeRate={closeRate}
          />
        </div>
      </div>
    </div>
  );
}
