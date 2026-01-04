import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Calendar, Lightbulb, Phone, Target, CheckCircle2, Zap } from "lucide-react";
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
}

interface BottleneckInsightsProps {
  interestedRate: number;
  bookRate: number;
  showRate: number;
  closeRate: number;
}

export function BottleneckInsights({ interestedRate, bookRate, showRate, closeRate }: BottleneckInsightsProps) {
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
      actionPath: '/sales-coach',
      icon: Phone,
      priority: priority++,
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
                  onClick={() => navigate(bottleneck.actionPath)}
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
