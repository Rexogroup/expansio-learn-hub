import { CRMLead } from "@/pages/CRM";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Calendar, DollarSign, TrendingUp, CheckCircle2, Percent, Mail, MessageSquare } from "lucide-react";

interface QuickStatsProps {
  leads: CRMLead[];
  sourceType?: 'linkedin' | 'cold_email';
}

export const QuickStats = ({ leads, sourceType = 'linkedin' }: QuickStatsProps) => {
  const totalLeads = leads.length;
  const interestedLeads = leads.filter((l) => l.interested).length;
  const meetingsBooked = leads.filter((l) => l.meeting_booked).length;
  const closedWon = leads.filter((l) => l.status === 'closed_won').length;
  const totalPipelineValue = leads
    .filter((l) => !['closed_won', 'closed_lost'].includes(l.status))
    .reduce((sum, l) => sum + (l.deal_value || 0), 0);
  const closedValue = leads
    .filter((l) => l.status === 'closed_won')
    .reduce((sum, l) => sum + (l.deal_value || 0), 0);

  // Cold email specific stats
  const totalReplies = leads.reduce((sum, l) => sum + ((l as any).reply_count || 1), 0);

  const bookingRate = interestedLeads > 0 
    ? ((meetingsBooked / interestedLeads) * 100).toFixed(0) 
    : 0;

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value.toFixed(0)}`;
  };

  const linkedInStats = [
    {
      label: "Total Leads",
      value: totalLeads,
      icon: Users,
      color: "text-blue-500",
    },
    {
      label: "Interested",
      value: interestedLeads,
      icon: TrendingUp,
      color: "text-yellow-500",
    },
    {
      label: "Meetings Booked",
      value: meetingsBooked,
      icon: Calendar,
      color: "text-purple-500",
    },
    {
      label: "Booking Rate",
      value: `${bookingRate}%`,
      icon: Percent,
      color: "text-cyan-500",
      isString: true,
    },
    {
      label: "Closed Won",
      value: closedWon,
      icon: CheckCircle2,
      color: "text-green-500",
    },
    {
      label: "Pipeline Value",
      value: formatCurrency(totalPipelineValue),
      icon: DollarSign,
      color: "text-orange-500",
      isString: true,
    },
    {
      label: "Closed Revenue",
      value: formatCurrency(closedValue),
      icon: DollarSign,
      color: "text-green-500",
      isString: true,
    },
  ];

  const coldEmailStats = [
    {
      label: "Total Leads",
      value: totalLeads,
      icon: Mail,
      color: "text-blue-500",
    },
    {
      label: "Total Replies",
      value: totalReplies,
      icon: MessageSquare,
      color: "text-cyan-500",
    },
    {
      label: "Meetings Booked",
      value: meetingsBooked,
      icon: Calendar,
      color: "text-purple-500",
    },
    {
      label: "Booking Rate",
      value: `${bookingRate}%`,
      icon: Percent,
      color: "text-yellow-500",
      isString: true,
    },
    {
      label: "Closed Won",
      value: closedWon,
      icon: CheckCircle2,
      color: "text-green-500",
    },
    {
      label: "Pipeline Value",
      value: formatCurrency(totalPipelineValue),
      icon: DollarSign,
      color: "text-orange-500",
      isString: true,
    },
    {
      label: "Closed Revenue",
      value: formatCurrency(closedValue),
      icon: DollarSign,
      color: "text-green-500",
      isString: true,
    },
  ];

  const stats = sourceType === 'cold_email' ? coldEmailStats : linkedInStats;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 mb-1">
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
              <span className="text-xs text-muted-foreground">{stat.label}</span>
            </div>
            <p className="text-2xl font-bold">{stat.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};