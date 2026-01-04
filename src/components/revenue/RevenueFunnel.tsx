import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, ArrowRight, TrendingDown, TrendingUp } from "lucide-react";
import { useState } from "react";
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
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const getHealthStatus = (rate: number | undefined, benchmark: number | undefined) => {
    if (rate === undefined || benchmark === undefined) return 'neutral';
    return rate >= benchmark ? 'healthy' : 'unhealthy';
  };

  // Glassmorphism opacity gradient - darker at top, lighter at bottom
  const getGlassOpacity = (index: number, isHovered: boolean) => {
    const baseOpacity = 0.12 - (index * 0.015);
    return isHovered ? baseOpacity + 0.08 : Math.max(baseOpacity, 0.04);
  };

  const width = 800;
  const height = 160;
  const stageCount = stages.length;
  const stageWidth = width / stageCount;
  const startHeight = 130;
  const endHeight = 45;
  const heightStep = (startHeight - endHeight) / (stageCount - 1);

  const getTrapezoidPath = (index: number) => {
    const x1 = index * stageWidth;
    const x2 = (index + 1) * stageWidth;
    
    const leftHeight = startHeight - (index * heightStep);
    const rightHeight = startHeight - ((index + 1) * heightStep);
    
    const y1Top = (height - leftHeight) / 2;
    const y1Bottom = y1Top + leftHeight;
    const y2Top = (height - rightHeight) / 2;
    const y2Bottom = y2Top + rightHeight;
    
    return `
      M ${x1} ${y1Top}
      L ${x2} ${y2Top}
      L ${x2} ${y2Bottom}
      L ${x1} ${y1Bottom}
      Z
    `;
  };

  const getStageCenterX = (index: number) => {
    return (index * stageWidth) + (stageWidth / 2);
  };

  return (
    <Card className="relative overflow-hidden transition-all duration-300 bg-gradient-to-br from-card via-card to-muted/30 border-border/50 hover:border-border hover:shadow-lg">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Activity className="h-4 w-4 text-primary" />
          </div>
          <CardTitle className="text-lg font-semibold">Conversion Funnel</CardTitle>
        </div>
      </CardHeader>
      
      <CardContent className="p-4 pt-0">
        {/* Conversion Rate Pills - Above Funnel */}
        <div className="flex items-center justify-around px-6 py-3">
          {stages.slice(1).map((stage, index) => {
            const health = getHealthStatus(stage.conversionRate, stage.benchmark);
            const isHealthy = health === 'healthy';
            const Icon = isHealthy ? TrendingUp : TrendingDown;
            
            return (
              <div 
                key={index} 
                className="flex items-center gap-1.5"
              >
                <ArrowRight className="h-3 w-3 text-muted-foreground/40" />
                <div className={cn(
                  "flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full transition-all duration-300",
                  isHealthy 
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/20" 
                    : "bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/20"
                )}>
                  <Icon className="h-3 w-3" />
                  <span>{stage.conversionRate?.toFixed(1)}%</span>
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="relative">
          <svg 
            viewBox={`0 0 ${width} ${height}`} 
            className="w-full"
          >
            <defs>
              {/* Glass gradient for each stage */}
              {stages.map((_, index) => {
                const isHovered = hoveredIndex === index;
                const opacity = getGlassOpacity(index, isHovered);
                
                return (
                  <linearGradient
                    key={`gradient-${index}`}
                    id={`glass-gradient-${index}`}
                    x1="0%"
                    y1="0%"
                    x2="0%"
                    y2="100%"
                  >
                    <stop 
                      offset="0%" 
                      stopColor="hsl(var(--primary))"
                      stopOpacity={opacity + 0.1}
                    />
                    <stop 
                      offset="50%" 
                      stopColor="hsl(var(--primary))"
                      stopOpacity={opacity}
                    />
                    <stop 
                      offset="100%" 
                      stopColor="hsl(var(--primary))"
                      stopOpacity={opacity - 0.02}
                    />
                  </linearGradient>
                );
              })}
              
              {/* Subtle inner glow */}
              <filter id="inner-glow" x="-10%" y="-10%" width="120%" height="120%">
                <feGaussianBlur stdDeviation="2" result="blur"/>
                <feComposite in="SourceGraphic" in2="blur" operator="over"/>
              </filter>
            </defs>
            
            {stages.map((stage, index) => {
              const isHovered = hoveredIndex === index;
              const health = getHealthStatus(stage.conversionRate, stage.benchmark);
              
              return (
                <g 
                  key={index}
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  style={{ cursor: 'pointer' }}
                >
                  {/* Glass background fill */}
                  <path
                    d={getTrapezoidPath(index)}
                    fill={`url(#glass-gradient-${index})`}
                    style={{
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      transform: isHovered ? 'scale(1.01)' : 'scale(1)',
                      transformOrigin: `${getStageCenterX(index)}px ${height / 2}px`,
                    }}
                  />
                  
                  {/* Glass border */}
                  <path
                    d={getTrapezoidPath(index)}
                    fill="none"
                    stroke="hsl(var(--primary) / 0.15)"
                    strokeWidth={isHovered ? 1.5 : 1}
                    style={{
                      transition: 'all 0.3s ease',
                    }}
                  />
                  
                  {/* Top edge highlight for glass effect */}
                  <path
                    d={getTrapezoidPath(index)}
                    fill="none"
                    stroke="hsl(var(--primary) / 0.25)"
                    strokeWidth={0.5}
                    strokeDasharray={`${stageWidth * 0.8} 1000`}
                    strokeDashoffset={-stageWidth * 0.1}
                    style={{ pointerEvents: 'none' }}
                  />
                  
                  {/* Health indicator ring (only for stages with conversion data) */}
                  {index > 0 && health !== 'neutral' && (
                    <path
                      d={getTrapezoidPath(index)}
                      fill="none"
                      stroke={health === 'healthy' 
                        ? 'hsl(var(--chart-2) / 0.3)'  
                        : 'hsl(var(--chart-4) / 0.3)'
                      }
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      style={{ 
                        pointerEvents: 'none',
                        opacity: isHovered ? 1 : 0.5,
                        transition: 'opacity 0.3s ease',
                      }}
                    />
                  )}
                  
                  {/* Hover overlay */}
                  {isHovered && (
                    <path
                      d={getTrapezoidPath(index)}
                      fill="hsl(var(--primary) / 0.08)"
                      style={{ pointerEvents: 'none' }}
                    />
                  )}
                  
                  {/* Stage name */}
                  <text
                    x={getStageCenterX(index)}
                    y={height / 2 - 10}
                    textAnchor="middle"
                    className="fill-foreground/60 font-medium uppercase tracking-wider"
                    style={{ 
                      fontSize: '9px',
                      letterSpacing: '0.1em',
                    }}
                  >
                    {stage.name}
                  </text>
                  
                  {/* Stage count */}
                  <text
                    x={getStageCenterX(index)}
                    y={height / 2 + 14}
                    textAnchor="middle"
                    className="fill-foreground font-semibold"
                    style={{ 
                      fontSize: '18px',
                      letterSpacing: '-0.3px',
                    }}
                  >
                    {stage.count.toLocaleString()}
                  </text>
                </g>
              );
            })}
          </svg>
          
          {/* Tooltip */}
          {hoveredIndex !== null && (
            <div 
              className="absolute z-10 bg-popover/95 backdrop-blur-sm border border-border/50 rounded-xl shadow-xl p-4 min-w-[200px] pointer-events-none animate-in fade-in-0 zoom-in-95 duration-200"
              style={{
                left: `${((hoveredIndex + 0.5) / stages.length) * 100}%`,
                top: '100%',
                transform: 'translateX(-50%) translateY(12px)',
              }}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-6">
                  <span className="font-medium text-foreground/80 text-sm uppercase tracking-wide">
                    {stages[hoveredIndex].name}
                  </span>
                  <span className="text-xl font-bold text-foreground">
                    {stages[hoveredIndex].count.toLocaleString()}
                  </span>
                </div>
                
                {stages[hoveredIndex].conversionRate !== undefined && (
                  <>
                    <div className="h-px bg-border/50" />
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-xs text-muted-foreground">Conversion</span>
                      <span className={cn(
                        "text-sm font-semibold",
                        getHealthStatus(stages[hoveredIndex].conversionRate, stages[hoveredIndex].benchmark) === 'healthy'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-amber-600 dark:text-amber-400'
                      )}>
                        {stages[hoveredIndex].conversionRate?.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-xs text-muted-foreground">Benchmark</span>
                      <span className="text-xs text-muted-foreground">
                        &gt;{stages[hoveredIndex].benchmark}%
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
