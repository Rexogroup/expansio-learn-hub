import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ArrowRight, Calendar, Phone, Target } from "lucide-react";
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
}

interface BottleneckInsightsProps {
  bookRate: number;
  showRate: number;
  closeRate: number;
}

export function BottleneckInsights({ bookRate, showRate, closeRate }: BottleneckInsightsProps) {
  const navigate = useNavigate();

  const bottlenecks: Bottleneck[] = [];

  if (bookRate < 20) {
    bottlenecks.push({
      id: 'book-rate',
      title: 'Book Rate Below Benchmark',
      description: `Your booking rate is ${bookRate.toFixed(1)}% (target: >20%). Review your follow-up sequences and improve your value proposition in initial outreach.`,
      currentValue: bookRate,
      benchmark: 20,
      actionLabel: 'Review Appointment Setting',
      actionPath: '/copilot',
      icon: Calendar,
    });
  }

  if (showRate < 60) {
    bottlenecks.push({
      id: 'show-rate',
      title: 'Show Rate Below Benchmark',
      description: `Your show rate is ${showRate.toFixed(1)}% (target: >60%). Consider adding meeting reminders 24h before and confirming attendance.`,
      currentValue: showRate,
      benchmark: 60,
      actionLabel: 'Improve Show Rate',
      actionPath: '/copilot',
      icon: Target,
    });
  }

  if (closeRate < 15) {
    bottlenecks.push({
      id: 'close-rate',
      title: 'Close Rate Below Benchmark',
      description: `Your closing rate is ${closeRate.toFixed(1)}% (target: >15%). Review objection handling patterns and sales techniques in your Sales Memory.`,
      currentValue: closeRate,
      benchmark: 15,
      actionLabel: 'Review Sales Coach',
      actionPath: '/sales-coach',
      icon: Phone,
    });
  }

  if (bottlenecks.length === 0) {
    return (
      <Card className="border-emerald-500/30 bg-emerald-500/5">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <Target className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <h3 className="font-semibold text-emerald-500">All KPIs Above Benchmark</h3>
              <p className="text-sm text-muted-foreground">
                Your funnel is performing well across all stages. Keep up the great work!
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-destructive" />
        Priority Actions
      </h3>
      
      {bottlenecks.map((bottleneck) => (
        <Card key={bottleneck.id} className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                  <bottleneck.icon className="h-5 w-5 text-destructive" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-semibold text-destructive">{bottleneck.title}</h4>
                  <p className="text-sm text-muted-foreground">{bottleneck.description}</p>
                </div>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(bottleneck.actionPath)}
                className="shrink-0"
              >
                {bottleneck.actionLabel}
                <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
