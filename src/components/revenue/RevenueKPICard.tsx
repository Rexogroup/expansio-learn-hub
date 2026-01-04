import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, AlertTriangle, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface RevenueKPICardProps {
  title: string;
  value: string | number;
  secondaryValue?: number;
  benchmark?: number;
  benchmarkLabel?: string;
  isCurrency?: boolean;
  isPercentage?: boolean;
  showBenchmark?: boolean;
  icon?: LucideIcon;
  variant?: 'default' | 'highlight';
}

export function RevenueKPICard({
  title,
  value,
  secondaryValue,
  benchmark,
  benchmarkLabel,
  isCurrency = false,
  isPercentage = false,
  showBenchmark = false,
  icon: Icon,
  variant = 'default',
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

  const isHighlight = variant === 'highlight';

  return (
    <Card className={cn(
      "relative overflow-hidden transition-all duration-300 group",
      "bg-gradient-to-br from-card via-card to-muted/30",
      "border-border/50 hover:border-border",
      "hover:shadow-lg hover:-translate-y-0.5",
      hasBenchmark && isAboveBenchmark && "border-l-4 border-l-emerald-500",
      hasBenchmark && !isAboveBenchmark && "border-l-4 border-l-destructive",
      isHighlight && "bg-gradient-to-br from-primary/10 via-card to-primary/5 border-primary/30"
    )}>
      {/* Subtle gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <CardContent className="p-5 relative">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
              {Icon && (
                <div className={cn(
                  "h-8 w-8 rounded-lg flex items-center justify-center transition-colors",
                  hasBenchmark && isAboveBenchmark && "bg-emerald-500/10",
                  hasBenchmark && !isAboveBenchmark && "bg-destructive/10",
                  !hasBenchmark && "bg-primary/10"
                )}>
                  <Icon className={cn(
                    "h-4 w-4",
                    hasBenchmark && isAboveBenchmark && "text-emerald-500",
                    hasBenchmark && !isAboveBenchmark && "text-destructive",
                    !hasBenchmark && "text-primary"
                  )} />
                </div>
              )}
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {title}
              </p>
            </div>
            <div className="flex items-baseline gap-3">
              <span className={cn(
                "text-3xl font-bold tracking-tight",
                hasBenchmark && (isAboveBenchmark ? "text-emerald-500" : "text-destructive"),
                isHighlight && !hasBenchmark && "text-primary"
              )}>
                {formatValue()}
              </span>
              {secondaryValue !== undefined && (
                <>
                  <span className="text-muted-foreground/40 text-2xl font-light">|</span>
                  <span className="text-2xl font-semibold text-muted-foreground/80">
                    {secondaryValue.toLocaleString()}
                  </span>
                </>
              )}
            </div>
          </div>
          
          {hasBenchmark && (
            <div className={cn(
              "flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-full transition-all",
              isAboveBenchmark 
                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/20" 
                : "bg-destructive/15 text-destructive ring-1 ring-destructive/20"
            )}>
              {isAboveBenchmark ? (
                <TrendingUp className="h-3.5 w-3.5" />
              ) : (
                <AlertTriangle className="h-3.5 w-3.5" />
              )}
              <span>{benchmarkLabel || `>${benchmark}%`}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
