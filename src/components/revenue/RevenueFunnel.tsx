import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, AlertTriangle } from "lucide-react";
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

  const getHealthStatus = (rate: number | undefined, benchmark: number | undefined) => {
    if (rate === undefined || benchmark === undefined) return 'neutral';
    return rate >= benchmark ? 'healthy' : 'unhealthy';
  };

  const getStageGradient = (index: number, isHovered: boolean, health: string) => {
    const baseOpacity = isHovered ? 1 : 0.9;
    
    if (index === 0) {
      // First stage - primary blue
      return `rgba(59, 130, 246, ${baseOpacity})`;
    }
    
    if (health === 'unhealthy') {
      return `rgba(239, 68, 68, ${baseOpacity})`;
    }
    
    // Gradient from teal to emerald to gold
    const colors = [
      `rgba(20, 184, 166, ${baseOpacity})`, // teal
      `rgba(16, 185, 129, ${baseOpacity})`, // emerald
      `rgba(34, 197, 94, ${baseOpacity})`,  // green
      `rgba(234, 179, 8, ${baseOpacity})`,  // gold/amber
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
    
    // Add slight curve for more organic look
    const curveOffset = 2;
    
    return `
      M ${x1} ${y1Top}
      Q ${x1 + stageWidth * 0.5} ${y1Top - curveOffset}, ${x2} ${y2Top}
      L ${x2} ${y2Bottom}
      Q ${x1 + stageWidth * 0.5} ${y1Bottom + curveOffset}, ${x1} ${y1Bottom}
      Z
    `;
  };

  const getStageCenterX = (index: number) => {
    return (index * stageWidth) + (stageWidth / 2);
  };

  return (
    <Card className="overflow-hidden border-border/50 bg-gradient-to-br from-card via-card to-muted/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">Conversion Funnel</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="relative">
          <svg 
            viewBox={`0 0 ${width} ${height}`} 
            className="w-full"
            style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.1))' }}
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
                      stopOpacity={0.75}
                    />
                  </linearGradient>
                );
              })}
              
              {/* Glow filter for hover state */}
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
              
              {/* Shadow filter */}
              <filter id="shadow" x="-10%" y="-10%" width="120%" height="130%">
                <feDropShadow dx="0" dy="4" stdDeviation="4" floodOpacity="0.15"/>
              </filter>
            </defs>
            
            {/* Render trapezoids */}
            {stages.map((stage, index) => {
              const isHovered = hoveredIndex === index;
              
              return (
                <g 
                  key={index}
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  style={{ cursor: 'pointer' }}
                >
                  {/* Main trapezoid shape */}
                  <path
                    d={getTrapezoidPath(index)}
                    fill={`url(#funnel-gradient-${index})`}
                    filter={isHovered ? 'url(#glow)' : 'url(#shadow)'}
                    style={{
                      transition: 'all 0.3s ease',
                      opacity: isHovered ? 1 : 0.95,
                    }}
                  />
                  
                  {/* Highlight overlay on hover */}
                  {isHovered && (
                    <path
                      d={getTrapezoidPath(index)}
                      fill="rgba(255,255,255,0.1)"
                      style={{ pointerEvents: 'none' }}
                    />
                  )}
                  
                  {/* Stage name */}
                  <text
                    x={getStageCenterX(index)}
                    y={height / 2 - 10}
                    textAnchor="middle"
                    className="fill-white font-semibold"
                    style={{ 
                      textShadow: '0 1px 3px rgba(0,0,0,0.3)',
                      fontSize: '12px',
                    }}
                  >
                    {stage.name}
                  </text>
                  
                  {/* Stage count */}
                  <text
                    x={getStageCenterX(index)}
                    y={height / 2 + 12}
                    textAnchor="middle"
                    className="fill-white font-bold"
                    style={{ 
                      textShadow: '0 1px 3px rgba(0,0,0,0.3)',
                      fontSize: '18px',
                    }}
                  >
                    {stage.count.toLocaleString()}
                  </text>
                </g>
              );
            })}
          </svg>
          
          {/* Hover Tooltip */}
          {hoveredIndex !== null && (
            <div 
              className="absolute z-10 bg-popover/95 backdrop-blur-sm border border-border rounded-lg shadow-xl p-3 min-w-[180px] pointer-events-none animate-in fade-in-0 zoom-in-95 duration-200"
              style={{
                left: `${((hoveredIndex + 0.5) / stages.length) * 100}%`,
                top: '100%',
                transform: 'translateX(-50%) translateY(8px)',
              }}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-4">
                  <span className="font-semibold text-foreground">
                    {stages[hoveredIndex].name}
                  </span>
                  <span className="text-lg font-bold text-foreground">
                    {stages[hoveredIndex].count.toLocaleString()}
                  </span>
                </div>
                
                {stages[hoveredIndex].conversionRate !== undefined && (
                  <>
                    <div className="h-px bg-border" />
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-sm text-muted-foreground">Conversion</span>
                      <span className={`text-sm font-semibold ${
                        getHealthStatus(stages[hoveredIndex].conversionRate, stages[hoveredIndex].benchmark) === 'healthy'
                          ? 'text-emerald-500'
                          : 'text-destructive'
                      }`}>
                        {stages[hoveredIndex].conversionRate?.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-sm text-muted-foreground">Benchmark</span>
                      <span className="text-sm text-muted-foreground">
                        &gt;{stages[hoveredIndex].benchmark}%
                      </span>
                    </div>
                    {hoveredIndex > 0 && (
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-sm text-muted-foreground">Drop-off</span>
                        <span className="text-sm text-destructive font-medium">
                          -{(stages[hoveredIndex - 1].count - stages[hoveredIndex].count).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Conversion Rate Indicators */}
        <div className="flex items-center justify-around mt-6 px-2">
          {stages.slice(1).map((stage, index) => {
            const health = getHealthStatus(stage.conversionRate, stage.benchmark);
            const isHealthy = health === 'healthy';
            const prevCount = stages[index].count;
            const dropOff = prevCount - stage.count;
            
            return (
              <div 
                key={index} 
                className="flex flex-col items-center gap-1"
              >
                {/* Conversion badge */}
                <div className={`
                  flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold
                  transition-all duration-300
                  ${isHealthy 
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' 
                    : 'bg-destructive/15 text-destructive border border-destructive/30'
                  }
                `}>
                  {isHealthy ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <AlertTriangle className="h-3 w-3" />
                  )}
                  <span>{stage.conversionRate?.toFixed(1)}%</span>
                </div>
                
                {/* Drop-off indicator */}
                <span className="text-[10px] text-muted-foreground">
                  -{dropOff.toLocaleString()} lost
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
