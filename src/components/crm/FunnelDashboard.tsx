import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, Users, Target } from "lucide-react";
import type { CRMLead } from "@/pages/CRM";

interface FunnelDashboardProps {
  leads: CRMLead[];
  sourceType?: 'linkedin' | 'cold_email';
}

export function FunnelDashboard({ leads, sourceType = 'linkedin' }: FunnelDashboardProps) {
  // Calculate funnel stages
  const totalLeads = leads.length;
  const meetingsBooked = leads.filter(l => l.meeting_booked || l.status === 'meeting_booked' || l.status === 'meeting_completed' || l.status === 'proposal' || l.status === 'closed_won').length;
  const proposals = leads.filter(l => l.status === 'proposal' || l.status === 'closed_won').length;
  const closedWon = leads.filter(l => l.status === 'closed_won').length;

  // Conversion rates
  const meetingRate = totalLeads > 0 ? Math.round((meetingsBooked / totalLeads) * 100) : 0;
  const proposalRate = meetingsBooked > 0 ? Math.round((proposals / meetingsBooked) * 100) : 0;
  const closeRate = proposals > 0 ? Math.round((closedWon / proposals) * 100) : 0;
  const overallRate = totalLeads > 0 ? Math.round((closedWon / totalLeads) * 100) : 0;

  // Revenue metrics
  const activeRevenue = leads
    .filter(l => !['closed_won', 'closed_lost'].includes(l.status))
    .reduce((sum, l) => sum + (l.deal_value || 0), 0);
  const closedRevenue = leads
    .filter(l => l.status === 'closed_won')
    .reduce((sum, l) => sum + (l.deal_value || 0), 0);

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toLocaleString()}`;
  };

  const funnelStages = [
    { name: 'Leads', count: totalLeads, rate: 100, color: 'hsl(var(--primary))' },
    { name: 'Meeting', count: meetingsBooked, rate: meetingRate, color: 'hsl(var(--chart-2))' },
    { name: 'Proposal', count: proposals, rate: proposalRate, color: 'hsl(var(--chart-3))' },
    { name: 'Won', count: closedWon, rate: closeRate, color: 'hsl(var(--chart-4))' },
  ];

  return (
    <div className="space-y-6">
      {/* Funnel Visualization */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-medium">Sales Funnel</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Percentage and labels row */}
          <div className="flex justify-between items-end mb-2 px-1">
            {funnelStages.map((stage, index) => (
              <div key={stage.name} className="flex flex-col items-center flex-1">
                <span className="text-lg font-bold text-foreground">
                  {index === 0 ? '100%' : `${stage.rate}%`}
                </span>
                <span className="text-xs text-muted-foreground mt-0.5">{stage.name}</span>
                <span className="text-sm font-medium text-muted-foreground">({stage.count})</span>
              </div>
            ))}
          </div>

          {/* Horizontal funnel bars */}
          <div className="relative mt-4 space-y-1">
            {funnelStages.map((stage, index) => {
              // Calculate width based on cumulative conversion
              const widthPercentage = index === 0 
                ? 100 
                : funnelStages.slice(0, index + 1).reduce((acc, s, i) => {
                    if (i === 0) return 100;
                    return acc * (s.rate / 100);
                  }, 100);
              
              return (
                <div
                  key={stage.name}
                  className="h-10 rounded-md transition-all duration-500 ease-out flex items-center justify-center"
                  style={{
                    width: `${Math.max(widthPercentage, 5)}%`,
                    backgroundColor: stage.color,
                    marginLeft: 'auto',
                    marginRight: 'auto',
                    opacity: 0.9 - (index * 0.15),
                  }}
                >
                  <span className="text-xs font-medium text-white drop-shadow-sm">
                    {stage.count} {stage.name.toLowerCase()}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Conversion arrows between stages */}
          <div className="flex justify-around mt-4 px-8">
            {[meetingRate, proposalRate, closeRate].map((rate, index) => (
              <div key={index} className="flex items-center gap-1 text-xs text-muted-foreground">
                <TrendingUp className="h-3 w-3" />
                <span>{rate}%</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Pipeline</p>
                <p className="text-2xl font-bold">{formatCurrency(activeRevenue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-chart-4/10">
                <DollarSign className="h-5 w-5 text-chart-4" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Closed Revenue</p>
                <p className="text-2xl font-bold">{formatCurrency(closedRevenue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-chart-2/10">
                <Target className="h-5 w-5 text-chart-2" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Overall Win Rate</p>
                <p className="text-2xl font-bold">{overallRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
