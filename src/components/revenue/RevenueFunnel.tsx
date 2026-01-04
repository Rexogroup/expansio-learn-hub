import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, ArrowRight } from "lucide-react";
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

  const getStageGradient = (index: number, isHovered: boolean, health: string) => {
    const baseOpacity = isHovered ? 1 : 0.92;
    
    if (index === 0) {
      return `rgba(59, 130, 246, ${baseOpacity})`;
    }
    
    if (health === 'unhealthy') {
      return `rgba(245, 158, 11, ${baseOpacity})`;
    }
    
    const colors = [
      `rgba(20, 184, 166, ${baseOpacity})`,
      `rgba(16, 185, 129, ${baseOpacity})`,
      `rgba(34, 197, 94, ${baseOpacity})`,
      `rgba(234, 179, 8, ${baseOpacity})`,
    ];
    
    return colors[Math.min(index - 1, colors.length - 1)];
  };

  const width = 800;
  const height = 180;
  const stageCount = stages.length;
  const stageWidth = width / stageCount;
  const startHeight = 140;
  const endHeight = 50;
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
    
    // Geometric straight lines
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
    <Card className="border bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Activity className="h-4 w-4 text-primary" />
          </div>
          <CardTitle className="text-lg font-semibold">Conversion Funnel</CardTitle>
        </div>
      </CardHeader>
      
      <CardContent className="p-4 pt-0">
        {/* Floating Conversion Arrows - Above Funnel */}
        <div className="flex items-center justify-around px-8 py-4">
          {stages.slice(1).map((stage, index) => {
            const health = getHealthStatus(stage.conversionRate, stage.benchmark);
            const isHealthy = health === 'healthy';
            
            return (
              <div 
                key={index} 
                className="flex items-center gap-2"
              >
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/50" />
                <span className={cn(
                  "text-xs font-bold px-2.5 py-1 rounded-full transition-all duration-300",
                  isHealthy 
                    ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30" 
                    : "bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                )}>
                  {stage.conversionRate?.toFixed(1)}%
                </span>
              </div>
            );
          })}
        </div>
        
        <div className="relative">
          <svg 
            viewBox={`0 0 ${width} ${height}`} 
            className="w-full"
            style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))' }}
          >
            <defs>
              {stages.map((stage, index) => {
                const health = getHealthStatus(stage.conversionRate, stage.benchmark);
                const isHovered = hoveredIndex === index;
                
                return (
                  <linearGradient
                    key={`gradient-${index}`}
                    id={`funnel-gradient-${index}`}
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="100%"
                  >
                    <stop 
                      offset="0%" 
                      stopColor={getStageGradient(index, isHovered, health)} 
                    />
                    <stop 
                      offset="100%" 
                      stopColor={getStageGradient(index, isHovered, health)}
                      stopOpacity={0.7}
                    />
                  </linearGradient>
                );
              })}
              
              <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
              
              <filter id="shadow" x="-15%" y="-15%" width="130%" height="140%">
                <feDropShadow dx="0" dy="4" stdDeviation="4" floodOpacity="0.15"/>
              </filter>
            </defs>
            
            {stages.map((stage, index) => {
              const isHovered = hoveredIndex === index;
              
              return (
                <g 
                  key={index}
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  style={{ cursor: 'pointer' }}
                >
                  <path
                    d={getTrapezoidPath(index)}
                    fill={`url(#funnel-gradient-${index})`}
                    filter={isHovered ? 'url(#glow)' : 'url(#shadow)'}
                    style={{
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      transform: isHovered ? 'scale(1.015)' : 'scale(1)',
                      transformOrigin: `${getStageCenterX(index)}px ${height / 2}px`,
                      opacity: isHovered ? 1 : 0.95,
                    }}
                  />
                  
                  {isHovered && (
                    <path
                      d={getTrapezoidPath(index)}
                      fill="rgba(255,255,255,0.08)"
                      style={{ pointerEvents: 'none' }}
                    />
                  )}
                  
                  <text
                    x={getStageCenterX(index)}
                    y={height / 2 - 12}
                    textAnchor="middle"
                    className="fill-white font-semibold uppercase tracking-wider"
                    style={{ 
                      textShadow: '0 2px 4px rgba(0,0,0,0.4)',
                      fontSize: '10px',
                      letterSpacing: '0.08em',
                    }}
                  >
                    {stage.name}
                  </text>
                  
                  <text
                    x={getStageCenterX(index)}
                    y={height / 2 + 16}
                    textAnchor="middle"
                    className="fill-white font-bold"
                    style={{ 
                      textShadow: '0 2px 8px rgba(0,0,0,0.5)',
                      fontSize: '22px',
                      letterSpacing: '-0.5px',
                    }}
                  >
                    {stage.count.toLocaleString()}
                  </text>
                </g>
              );
            })}
          </svg>
          
          {hoveredIndex !== null && (
            <div 
              className="absolute z-10 bg-popover border rounded-xl shadow-lg p-4 min-w-[200px] pointer-events-none animate-in fade-in-0 zoom-in-95 duration-200"
              style={{
                left: `${((hoveredIndex + 0.5) / stages.length) * 100}%`,
                top: '100%',
                transform: 'translateX(-50%) translateY(12px)',
              }}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-6">
                  <span className="font-semibold text-foreground">
                    {stages[hoveredIndex].name}
                  </span>
                  <span className="text-xl font-bold text-foreground">
                    {stages[hoveredIndex].count.toLocaleString()}
                  </span>
                </div>
                
                {stages[hoveredIndex].conversionRate !== undefined && (
                  <>
                    <div className="h-px bg-border" />
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-sm text-muted-foreground">Conversion</span>
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
                      <span className="text-sm text-muted-foreground">Benchmark</span>
                      <span className="text-sm text-muted-foreground">
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
