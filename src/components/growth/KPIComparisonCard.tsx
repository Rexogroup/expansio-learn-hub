import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface KPIComparisonCardProps {
  title: string;
  currentValue: number;
  benchmarkValue: number;
  unit: string;
  description?: string;
}

export function KPIComparisonCard({
  title,
  currentValue,
  benchmarkValue,
  unit,
  description,
}: KPIComparisonCardProps) {
  const percentage = benchmarkValue > 0 ? Math.min((currentValue / benchmarkValue) * 100, 100) : 0;
  const isAboveBenchmark = currentValue >= benchmarkValue;
  const isClose = percentage >= 75 && percentage < 100;

  const formatValue = (value: number) => {
    if (unit === 'percent') return `${value.toFixed(2)}%`;
    if (unit === 'count') return value.toString();
    return value.toFixed(2);
  };

  const getTrendIcon = () => {
    if (isAboveBenchmark) return <TrendingUp className="w-5 h-5 text-emerald-500" />;
    if (isClose) return <Minus className="w-5 h-5 text-amber-500" />;
    return <TrendingDown className="w-5 h-5 text-destructive" />;
  };

  const getProgressColor = () => {
    if (isAboveBenchmark) return "bg-emerald-500";
    if (isClose) return "bg-amber-500";
    return "bg-destructive";
  };

  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          {getTrendIcon()}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Values comparison */}
        <div className="flex items-baseline justify-between">
          <div>
            <span className={cn(
              "text-3xl font-bold",
              isAboveBenchmark ? "text-emerald-500" : isClose ? "text-amber-500" : "text-destructive"
            )}>
              {formatValue(currentValue)}
            </span>
            <span className="text-sm text-muted-foreground ml-2">current</span>
          </div>
          <div className="text-right">
            <span className="text-xl font-semibold text-foreground">
              {formatValue(benchmarkValue)}
            </span>
            <span className="text-sm text-muted-foreground ml-2">benchmark</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="relative h-3 bg-muted rounded-full overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all duration-500", getProgressColor())}
              style={{ width: `${percentage}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground text-right">
            {percentage.toFixed(0)}% of benchmark
          </p>
        </div>

        {/* Description */}
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}
