import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, TrendingUp, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface FunnelStage {
  name: string;
  count: number;
  conversionRate?: number;
  benchmark?: number;
}

interface RevenueFunnelProps {
  stages: FunnelStage[];
}

export function RevenueFunnel({ stages }: RevenueFunnelProps) {
  const maxCount = Math.max(...stages.map(s => s.count), 1);

  const getHealthStatus = (rate?: number, benchmark?: number) => {
    if (rate === undefined || benchmark === undefined) return 'neutral';
    return rate >= benchmark ? 'healthy' : 'unhealthy';
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Conversion Funnel</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stage labels and conversion rates */}
        <div className="flex items-center justify-between">
          {stages.map((stage, index) => (
            <div key={stage.name} className="flex items-center">
              <div className="text-center min-w-[80px]">
                <p className="text-xs text-muted-foreground mb-1">{stage.name}</p>
                <p className="text-lg font-bold">{stage.count}</p>
                {stage.conversionRate !== undefined && (
                  <div className={cn(
                    "flex items-center justify-center gap-1 text-xs font-medium mt-1",
                    getHealthStatus(stage.conversionRate, stage.benchmark) === 'healthy' 
                      ? "text-emerald-500" 
                      : getHealthStatus(stage.conversionRate, stage.benchmark) === 'unhealthy'
                        ? "text-destructive"
                        : "text-muted-foreground"
                  )}>
                    {getHealthStatus(stage.conversionRate, stage.benchmark) === 'healthy' ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : getHealthStatus(stage.conversionRate, stage.benchmark) === 'unhealthy' ? (
                      <AlertTriangle className="h-3 w-3" />
                    ) : null}
                    <span>{stage.conversionRate.toFixed(1)}%</span>
                  </div>
                )}
              </div>
              
              {index < stages.length - 1 && (
                <ArrowRight className="h-4 w-4 text-muted-foreground mx-2" />
              )}
            </div>
          ))}
        </div>

        {/* Visual funnel bars */}
        <div className="space-y-2 pt-2">
          {stages.map((stage, index) => {
            const widthPercent = (stage.count / maxCount) * 100;
            const health = getHealthStatus(stage.conversionRate, stage.benchmark);
            
            return (
              <div
                key={stage.name}
                className={cn(
                  "h-8 rounded-md transition-all relative overflow-hidden",
                  health === 'healthy' ? "bg-emerald-500/80" :
                  health === 'unhealthy' ? "bg-destructive/80" :
                  "bg-primary/80"
                )}
                style={{ 
                  width: `${Math.max(widthPercent, 10)}%`,
                  opacity: 1 - (index * 0.15)
                }}
              >
                <div className="absolute inset-0 flex items-center px-3">
                  <span className="text-xs font-medium text-white truncate">
                    {stage.name}: {stage.count}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
