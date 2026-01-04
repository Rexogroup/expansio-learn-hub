import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface RevenueKPICardProps {
  title: string;
  value: string | number;
  benchmark?: number;
  benchmarkLabel?: string;
  isCurrency?: boolean;
  isPercentage?: boolean;
  showBenchmark?: boolean;
}

export function RevenueKPICard({
  title,
  value,
  benchmark,
  benchmarkLabel,
  isCurrency = false,
  isPercentage = false,
  showBenchmark = false,
}: RevenueKPICardProps) {
  const numericValue = typeof value === 'string' ? parseFloat(value) : value;
  const isAboveBenchmark = benchmark !== undefined && numericValue >= benchmark;
  const hasBenchmark = showBenchmark && benchmark !== undefined;

  const formatValue = () => {
    if (isCurrency) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(numericValue);
    }
    if (isPercentage) {
      return `${numericValue.toFixed(1)}%`;
    }
    return numericValue.toLocaleString();
  };

  return (
    <Card className={cn(
      "relative overflow-hidden transition-all",
      hasBenchmark && (isAboveBenchmark 
        ? "border-emerald-500/30 bg-emerald-500/5" 
        : "border-destructive/30 bg-destructive/5"
      )
    )}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {title}
            </p>
            <p className={cn(
              "text-2xl font-bold",
              hasBenchmark && (isAboveBenchmark ? "text-emerald-500" : "text-destructive")
            )}>
              {formatValue()}
            </p>
          </div>
          
          {hasBenchmark && (
            <div className={cn(
              "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full",
              isAboveBenchmark 
                ? "bg-emerald-500/10 text-emerald-500" 
                : "bg-destructive/10 text-destructive"
            )}>
              {isAboveBenchmark ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <AlertTriangle className="h-3 w-3" />
              )}
              <span>{benchmarkLabel || `>${benchmark}%`}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
