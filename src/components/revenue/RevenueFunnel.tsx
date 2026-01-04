import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, AlertTriangle, Activity, ArrowRight } from "lucide-react";
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
      // First stage - primary blue with richer gradient
      return `rgba(59, 130, 246, ${baseOpacity})`;
    }
    
    if (health === 'unhealthy') {
      // Softer amber instead of harsh red
      return `rgba(245, 158, 11, ${baseOpacity})`;
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
    
    // Increased curve for smoother organic look
    const curveOffset = 4;
    
    return `
      M ${x1} ${y1Top}
      Q ${x1 + stageWidth * 0.5} ${y1Top - curveOffset}, ${x2} ${y2Top}
      L ${x2} ${y2Bottom}
      Q ${x1 + stageWidth * 0.5} ${y1Bottom + curveOffset}, ${x1} ${y1Bottom}
      Z
    `;
  };

  // Inner highlight path for 3D effect
  const getHighlightPath = (index: number) => {
    const x1 = index * stageWidth + 4;
    const x2 = (index + 1) * stageWidth - 4;
    
    const leftHeight = (startHeight - (index * heightStep)) * 0.4;
    const rightHeight = (startHeight - ((index + 1) * heightStep)) * 0.4;
    
    const y1Top = (height - leftHeight) / 2 - 10;
    const y1Bottom = y1Top + leftHeight * 0.5;
    const y2Top = (height - rightHeight) / 2 - 10;
    const y2Bottom = y2Top + rightHeight * 0.5;
    
    return `
      M ${x1} ${y1Top}
      Q ${x1 + stageWidth * 0.5} ${y1Top - 2}, ${x2} ${y2Top}
      L ${x2} ${y2Bottom}
      Q ${x1 + stageWidth * 0.5} ${y1Bottom + 2}, ${x1} ${y1Bottom}
      Z
    `;
  };

  const getStageCenterX = (index: number) => {
    return (index * stageWidth) + (stageWidth / 2);
  };

  return (
    <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-slate-900/95 via-slate-800/90 to-slate-900/95 backdrop-blur-xl shadow-2xl">
      {/* Ambient glow orbs */}
      <div className="absolute -top-20 -left-20 w-40 h-40 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
      
      {/* Subtle grid pattern overlay */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '32px 32px',
        }}
      />
      
      <CardHeader className="relative pb-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center border border-primary/20">
            <Activity className="h-4 w-4 text-primary" />
          </div>
          <CardTitle className="text-lg font-semibold text-white">Conversion Funnel</CardTitle>
        </div>
      </CardHeader>
      
      <CardContent className="relative p-4 pt-0">
        {/* Floating Conversion Arrows - Above Funnel */}
        <div className="flex items-center justify-around px-8 py-4">
          {stages.slice(1).map((stage, index) => {
            const health = getHealthStatus(stage.conversionRate, stage.benchmark);
            const isHealthy = health === 'healthy';
            
            return (
              <div 
                key={index} 
                className="flex items-center gap-2"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <ArrowRight className="h-3.5 w-3.5 text-white/30 funnel-arrow" />
                <span className={cn(
                  "text-xs font-bold px-2.5 py-1 rounded-full transition-all duration-300",
                  isHealthy 
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" 
                    : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                )}>
                  {stage.conversionRate?.toFixed(1)}%
                </span>
              </div>
            );
          })}
        </div>
        
        {/* 3D Perspective Wrapper */}
        <div 
          className="relative"
          style={{ perspective: '1000px' }}
        >
          <svg 
            viewBox={`0 0 ${width} ${height}`} 
            className="w-full funnel-svg"
            style={{ 
              transform: 'rotateX(3deg)',
              filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.3))',
            }}
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
              
              {/* Enhanced glow filter for hover state */}
              <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
              
              {/* Enhanced shadow filter */}
              <filter id="shadow" x="-15%" y="-15%" width="130%" height="140%">
                <feDropShadow dx="0" dy="6" stdDeviation="6" floodOpacity="0.2"/>
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
                  className="funnel-stage-animated"
                >
                  {/* Main trapezoid shape */}
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
                  
                  {/* Inner highlight for 3D raised effect */}
                  <path
                    d={getHighlightPath(index)}
                    fill="rgba(255,255,255,0.1)"
                    style={{ pointerEvents: 'none' }}
                  />
                  
                  {/* Hover highlight overlay */}
                  {isHovered && (
                    <path
                      d={getTrapezoidPath(index)}
                      fill="rgba(255,255,255,0.08)"
                      style={{ pointerEvents: 'none' }}
                    />
                  )}
                  
                  {/* Stage name - smaller, uppercase */}
                  <text
                    x={getStageCenterX(index)}
                    y={height / 2 - 12}
                    textAnchor="middle"
                    className="fill-white/90 font-semibold uppercase tracking-wider"
                    style={{ 
                      textShadow: '0 2px 4px rgba(0,0,0,0.4)',
                      fontSize: '10px',
                      letterSpacing: '0.08em',
                    }}
                  >
                    {stage.name}
                  </text>
                  
                  {/* Stage count - BIGGER and bolder */}
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
          
          {/* Hover Tooltip - Enhanced with blur */}
          {hoveredIndex !== null && (
            <div 
              className="absolute z-10 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl p-4 min-w-[200px] pointer-events-none animate-in fade-in-0 zoom-in-95 duration-200"
              style={{
                left: `${((hoveredIndex + 0.5) / stages.length) * 100}%`,
                top: '100%',
                transform: 'translateX(-50%) translateY(12px)',
              }}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-6">
                  <span className="font-semibold text-white">
                    {stages[hoveredIndex].name}
                  </span>
                  <span className="text-xl font-bold text-white">
                    {stages[hoveredIndex].count.toLocaleString()}
                  </span>
                </div>
                
                {stages[hoveredIndex].conversionRate !== undefined && (
                  <>
                    <div className="h-px bg-white/10" />
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-sm text-white/60">Conversion</span>
                      <span className={cn(
                        "text-sm font-semibold",
                        getHealthStatus(stages[hoveredIndex].conversionRate, stages[hoveredIndex].benchmark) === 'healthy'
                          ? 'text-emerald-400'
                          : 'text-amber-400'
                      )}>
                        {stages[hoveredIndex].conversionRate?.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-sm text-white/60">Benchmark</span>
                      <span className="text-sm text-white/60">
                        &gt;{stages[hoveredIndex].benchmark}%
                      </span>
                    </div>
                    {hoveredIndex > 0 && (
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-sm text-white/60">Drop-off</span>
                        <span className="text-sm text-rose-400 font-medium">
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
        
        {/* Simplified Drop-off Indicators */}
        <div className="flex items-center justify-around mt-4 px-2">
          {stages.slice(1).map((stage, index) => {
            const prevCount = stages[index].count;
            const dropOff = prevCount - stage.count;
            
            return (
              <div 
                key={index} 
                className="flex flex-col items-center"
              >
                <span className="text-[10px] text-white/40">
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
