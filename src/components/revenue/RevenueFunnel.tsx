import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

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
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const getHealthStatus = (rate?: number, benchmark?: number) => {
    if (rate === undefined || benchmark === undefined) return 'neutral';
    return rate >= benchmark ? 'healthy' : 'unhealthy';
  };

  // Calculate trapezoid dimensions
  const svgWidth = 800;
  const svgHeight = 160;
  const segmentCount = stages.length;
  const segmentWidth = svgWidth / segmentCount;
  const maxHeight = 120;
  const minHeight = 40;
  const heightStep = (maxHeight - minHeight) / (segmentCount - 1);
  const topPadding = 20;

  // Generate trapezoid paths
  const getTrapezoidPath = (index: number) => {
    const leftX = index * segmentWidth;
    const rightX = (index + 1) * segmentWidth;
    
    const leftHeight = maxHeight - (index * heightStep);
    const rightHeight = maxHeight - ((index + 1) * heightStep);
    
    const leftTopY = topPadding + (maxHeight - leftHeight) / 2;
    const leftBottomY = leftTopY + leftHeight;
    const rightTopY = topPadding + (maxHeight - rightHeight) / 2;
    const rightBottomY = rightTopY + rightHeight;

    return `M${leftX},${leftTopY} L${rightX},${rightTopY} L${rightX},${rightBottomY} L${leftX},${leftBottomY} Z`;
  };

  const getStageColor = (index: number, health: string) => {
    if (index === 0) return 'hsl(var(--primary))';
    if (health === 'healthy') return 'hsl(var(--chart-2))';
    if (health === 'unhealthy') return 'hsl(var(--destructive))';
    return 'hsl(var(--primary))';
  };

  const getGradientId = (index: number) => `funnel-gradient-${index}`;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Conversion Funnel</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* SVG Funnel Visualization */}
        <div className="relative">
          <svg 
            viewBox={`0 0 ${svgWidth} ${svgHeight}`} 
            className="w-full h-auto"
            style={{ minHeight: '140px' }}
          >
            {/* Gradient definitions */}
            <defs>
              {stages.map((stage, index) => {
                const health = getHealthStatus(stage.conversionRate, stage.benchmark);
                const baseColor = getStageColor(index, health);
                return (
                  <linearGradient 
                    key={getGradientId(index)} 
                    id={getGradientId(index)} 
                    x1="0%" 
                    y1="0%" 
                    x2="100%" 
                    y2="0%"
                  >
                    <stop offset="0%" stopColor={baseColor} stopOpacity={hoveredIndex === index ? 1 : 0.9} />
                    <stop offset="100%" stopColor={baseColor} stopOpacity={hoveredIndex === index ? 0.9 : 0.7} />
                  </linearGradient>
                );
              })}
            </defs>

            {/* Trapezoid segments */}
            {stages.map((stage, index) => {
              const health = getHealthStatus(stage.conversionRate, stage.benchmark);
              const centerX = (index + 0.5) * segmentWidth;
              const centerY = svgHeight / 2;

              return (
                <g 
                  key={stage.name}
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  className="cursor-pointer transition-all duration-200"
                >
                  {/* Trapezoid shape */}
                  <path
                    d={getTrapezoidPath(index)}
                    fill={`url(#${getGradientId(index)})`}
                    stroke="hsl(var(--background))"
                    strokeWidth="2"
                    className={cn(
                      "transition-all duration-300",
                      hoveredIndex === index && "filter drop-shadow-lg"
                    )}
                  />
                  
                  {/* Stage name */}
                  <text
                    x={centerX}
                    y={centerY - 8}
                    textAnchor="middle"
                    fill="white"
                    fontSize="13"
                    fontWeight="600"
                    className="pointer-events-none"
                  >
                    {stage.name}
                  </text>
                  
                  {/* Count */}
                  <text
                    x={centerX}
                    y={centerY + 14}
                    textAnchor="middle"
                    fill="white"
                    fontSize="18"
                    fontWeight="700"
                    className="pointer-events-none"
                  >
                    {stage.count}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Tooltip */}
          {hoveredIndex !== null && (
            <div 
              className="absolute bg-popover border border-border rounded-lg shadow-lg p-3 z-10 pointer-events-none animate-fade-in"
              style={{
                left: `${((hoveredIndex + 0.5) / stages.length) * 100}%`,
                top: '100%',
                transform: 'translateX(-50%)',
                marginTop: '8px'
              }}
            >
              <div className="text-sm font-semibold text-foreground mb-1">
                {stages[hoveredIndex].name}
              </div>
              <div className="text-2xl font-bold text-foreground">
                {stages[hoveredIndex].count}
              </div>
              {stages[hoveredIndex].conversionRate !== undefined && (
                <div className={cn(
                  "flex items-center gap-1 text-xs mt-1",
                  getHealthStatus(stages[hoveredIndex].conversionRate, stages[hoveredIndex].benchmark) === 'healthy' 
                    ? "text-emerald-500" 
                    : "text-destructive"
                )}>
                  {getHealthStatus(stages[hoveredIndex].conversionRate, stages[hoveredIndex].benchmark) === 'healthy' ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <AlertTriangle className="h-3 w-3" />
                  )}
                  <span>{stages[hoveredIndex].conversionRate?.toFixed(1)}% conversion</span>
                </div>
              )}
              {hoveredIndex > 0 && (
                <div className="text-xs text-muted-foreground mt-1">
                  {stages[hoveredIndex - 1].count - stages[hoveredIndex].count} drop-off from {stages[hoveredIndex - 1].name}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Conversion Rate Indicators */}
        <div className="flex items-center justify-around pt-2">
          {stages.slice(1).map((stage, index) => {
            const health = getHealthStatus(stage.conversionRate, stage.benchmark);
            const prevStage = stages[index];
            const dropOff = prevStage.count - stage.count;
            
            return (
              <div key={`conv-${stage.name}`} className="flex flex-col items-center gap-1">
                <div className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium",
                  health === 'healthy' 
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" 
                    : health === 'unhealthy'
                      ? "bg-destructive/10 text-destructive"
                      : "bg-muted text-muted-foreground"
                )}>
                  {health === 'healthy' ? (
                    <TrendingUp className="h-3.5 w-3.5" />
                  ) : health === 'unhealthy' ? (
                    <AlertTriangle className="h-3.5 w-3.5" />
                  ) : null}
                  <span>{stage.conversionRate?.toFixed(1)}%</span>
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {prevStage.name} → {stage.name}
                </span>
                <span className="text-[10px] text-muted-foreground/70">
                  ({dropOff} lost)
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
