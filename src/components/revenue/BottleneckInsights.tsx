import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Calendar, Lightbulb, Phone, Target, CheckCircle2, Zap, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Bottleneck {
  id: string;
  title: string;
  description: string;
  currentValue: number;
  benchmark: number;
  actionLabel: string;
  actionPath: string;
  icon: React.ElementType;
  priority: number;
  prompt: string;
}

interface BottleneckInsightsProps {
  interestedRate: number;
  bookRate: number;
  showRate: number;
  proposalRate: number;
  closeRate: number;
}

export function BottleneckInsights({ interestedRate, bookRate, showRate, proposalRate, closeRate }: BottleneckInsightsProps) {
  const navigate = useNavigate();

  const bottlenecks: Bottleneck[] = [];
  let priority = 1;

  if (interestedRate < 5) {
    bottlenecks.push({
      id: 'interest-rate',
      title: 'Interest Rate Below Benchmark',
      description: `Your interest rate is ${interestedRate.toFixed(1)}% (target: >5%). Consider revising your value proposition or targeting criteria.`,
      currentValue: interestedRate,
      benchmark: 5,
      actionLabel: 'Review Strategy',
      actionPath: '/copilot',
      icon: Lightbulb,
      priority: priority++,
      prompt: `My interest rate is currently ${interestedRate.toFixed(1)}% which is below the 5% benchmark.

Please analyze my situation and provide:
1. The top 3 most likely reasons my interest rate is low
2. Specific action items to improve my value proposition and messaging
3. Recommendations for better ICP targeting criteria
4. Quick wins I can implement this week to boost response rates

Be specific and actionable based on my business context.`,
    });
  }

  if (bookRate < 20) {
    bottlenecks.push({
      id: 'book-rate',
      title: 'Book Rate Below Benchmark',
      description: `Your booking rate is ${bookRate.toFixed(1)}% (target: >20%). Review your follow-up sequences.`,
      currentValue: bookRate,
      benchmark: 20,
      actionLabel: 'Improve Booking',
      actionPath: '/copilot',
      icon: Calendar,
      priority: priority++,
      prompt: `My book rate (interested leads who schedule meetings) is currently ${bookRate.toFixed(1)}% which is below the 20% benchmark.

Please analyze my appointment setting process and provide:
1. Common reasons interested leads don't book meetings
2. Follow-up sequence improvements I should implement
3. Objection handling strategies for scheduling resistance
4. Optimal timing and cadence for follow-up messages
5. CTA and booking link optimization tips

Help me convert more interested leads into booked calls.`,
    });
  }

  if (showRate < 60) {
    bottlenecks.push({
      id: 'show-rate',
      title: 'Show Rate Below Benchmark',
      description: `Your show rate is ${showRate.toFixed(1)}% (target: >60%). Add meeting reminders and confirmations.`,
      currentValue: showRate,
      benchmark: 60,
      actionLabel: 'Improve Shows',
      actionPath: '/copilot',
      icon: Target,
      priority: priority++,
      prompt: `My show rate (booked calls that actually happen) is currently ${showRate.toFixed(1)}% which is below the 60% benchmark. Too many prospects are no-showing.

Please help me reduce no-shows by providing:
1. Pre-meeting confirmation sequence templates
2. Reminder timing strategy (when to send reminders)
3. Value reinforcement messaging to increase commitment
4. Reschedule workflow for no-shows
5. Calendar and scheduling tool optimization tips

I need to get more booked prospects to actually show up.`,
    });
  }

  if (proposalRate < 70) {
    bottlenecks.push({
      id: 'proposal-rate',
      title: 'Proposal Rate Below Benchmark',
      description: `Your proposal rate is ${proposalRate.toFixed(1)}% (target: >70%). Consider qualifying leads better before meetings.`,
      currentValue: proposalRate,
      benchmark: 70,
      actionLabel: 'Review ICP',
      actionPath: '/copilot',
      icon: FileText,
      priority: priority++,
      prompt: `My proposal rate (live calls that receive proposals) is currently ${proposalRate.toFixed(1)}% which is below the 70% benchmark. Not enough meetings are converting to proposals.

Please analyze my qualification and discovery process:
1. What qualification criteria should I add to ensure better-fit leads?
2. How can I improve my discovery call structure to identify proposal-ready prospects?
3. Which ICP segments are most likely to be proposal-worthy?
4. What red flags should I look for during meetings that indicate poor fit?
5. Meeting agenda optimization to better qualify opportunities

Help me send proposals only to truly qualified prospects.`,
    });
  }

  if (closeRate < 15) {
    bottlenecks.push({
      id: 'close-rate',
      title: 'Close Rate Below Benchmark',
      description: `Your closing rate is ${closeRate.toFixed(1)}% (target: >15%). Review objection handling patterns.`,
      currentValue: closeRate,
      benchmark: 15,
      actionLabel: 'Sales Coach',
      actionPath: '/copilot',
      icon: Phone,
      priority: priority++,
      prompt: `My close rate (proposals that convert to closed deals) is currently ${closeRate.toFixed(1)}% which is below the 15% benchmark.

Please analyze my sales closing process and provide:
1. Common objection patterns I should prepare for and how to handle them
2. Pricing and packaging strategies to increase close rates
3. Follow-up cadence after sending proposals
4. Urgency and scarcity tactics that work ethically
5. Which types of offers/services close best and why
6. Negotiation frameworks for handling pushback

Help me close more of my qualified proposals.`,
    });
  }

  if (bottlenecks.length === 0) {
    return (
      <Card className="border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-emerald-500/15 flex items-center justify-center ring-1 ring-emerald-500/20">
              <CheckCircle2 className="h-7 w-7 text-emerald-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">All KPIs Above Benchmark</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Your funnel is performing well across all stages. Keep up the great work!
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
          <Zap className="h-4 w-4 text-amber-500" />
        </div>
        <h3 className="text-lg font-semibold">Growth Opportunities</h3>
      </div>
      
      <div className="space-y-3">
        {bottlenecks.map((bottleneck) => (
          <Card 
            key={bottleneck.id} 
            className="border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent hover:shadow-md transition-all duration-300 hover:-translate-y-0.5"
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  {/* Priority Badge */}
                  <div className="relative">
                    <div className="h-10 w-10 rounded-xl bg-amber-500/15 flex items-center justify-center ring-1 ring-amber-500/20">
                      <bottleneck.icon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-amber-500 text-white text-xs font-bold flex items-center justify-center shadow-sm">
                      {bottleneck.priority}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-semibold text-amber-700 dark:text-amber-300">{bottleneck.title}</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">{bottleneck.description}</p>
                  </div>
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(bottleneck.actionPath, { 
                    state: { initialPrompt: bottleneck.prompt } 
                  })}
                  className="shrink-0 border-amber-500/30 hover:bg-amber-500/10 hover:text-amber-700 dark:hover:text-amber-300"
                >
                  {bottleneck.actionLabel}
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
