import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity } from "lucide-react";
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

  const width = 800;
  const height = 140;
  const stageCount = stages.length;
  const stageWidth = width / stageCount;
  const maxHeight = 120;
  const minHeight = 30;

  // Calculate height at each stage based on count relative to first stage
  const getHeightAtStage = (index: number) => {
    if (index === 0 || stages[0].count === 0) return maxHeight;
    const ratio = stages[index].count / stages[0].count;
    return Math.max(minHeight, maxHeight * ratio);
  };

  // Build smooth bezier curve path for the funnel
  const getFunnelPath = () => {
    const points: { x: number; topY: number; bottomY: number }[] = [];
    
    for (let i = 0; i <= stageCount; i++) {
      const x = (i / stageCount) * width;
      const h = i === stageCount ? getHeightAtStage(stageCount - 1) : getHeightAtStage(i);
      const topY = (height - h) / 2;
      const bottomY = (height + h) / 2;
      points.push({ x, topY, bottomY });
    }

    // Start top path
    let pathTop = `M ${points[0].x} ${points[0].topY}`;
    let pathBottom = '';

    // Build top edge with smooth curves
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const midX = (prev.x + curr.x) / 2;
      pathTop += ` C ${midX} ${prev.topY}, ${midX} ${curr.topY}, ${curr.x} ${curr.topY}`;
    }

    // Build bottom edge with smooth curves (in reverse)
    for (let i = points.length - 1; i >= 0; i--) {
      const curr = points[i];
      if (i === points.length - 1) {
        pathBottom = `L ${curr.x} ${curr.bottomY}`;
      } else {
        const next = points[i + 1];
        const midX = (curr.x + next.x) / 2;
        pathBottom += ` C ${midX} ${next.bottomY}, ${midX} ${curr.bottomY}, ${curr.x} ${curr.bottomY}`;
      }
    }

    return pathTop + pathBottom + ' Z';
  };

  // Get percentage relative to first stage
  const getPercentage = (index: number) => {
    if (index === 0 || stages[0].count === 0) return 100;
    return Math.round((stages[index].count / stages[0].count) * 100);
  };

  // Get X position for stage center
  const getStageCenterX = (index: number) => {
    return (index * stageWidth) + (stageWidth / 2);
  };

  // Get divider line coordinates
  const getDividerY = (index: number) => {
    const leftH = getHeightAtStage(index);
    const rightH = getHeightAtStage(index + 1);
    const avgH = (leftH + rightH) / 2;
    return {
      y1: (height - avgH) / 2,
      y2: (height + avgH) / 2,
    };
  };

  return (
    <Card className="relative overflow-hidden bg-slate-900 border-slate-800/60">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
            <Activity className="h-4 w-4 text-blue-400" />
          </div>
          <CardTitle className="text-lg font-semibold text-white">Conversion Funnel</CardTitle>
        </div>
      </CardHeader>
      
      <CardContent className="p-4 pt-0">
        {/* Stage Labels Above Funnel */}
        <div className="flex items-end justify-around px-2 pb-4">
          {stages.map((stage, index) => {
            const isHovered = hoveredIndex === index;
            const percentage = getPercentage(index);
            
            return (
              <div 
                key={index} 
                className={cn(
                  "flex flex-col items-center gap-1.5 transition-all duration-200",
                  isHovered && "scale-105"
                )}
                style={{ width: `${100 / stageCount}%` }}
              >
                {/* Percentage Badge */}
                <div className={cn(
                  "px-3 py-1 rounded-lg text-sm font-semibold transition-all duration-200",
                  isHovered 
                    ? "bg-blue-500 text-white" 
                    : "bg-slate-800 border border-slate-700 text-slate-200"
                )}>
                  {percentage}%
                </div>
                {/* Stage Name */}
                <span className={cn(
                  "text-xs font-medium uppercase tracking-wider transition-colors duration-200",
                  isHovered ? "text-blue-400" : "text-slate-500"
                )}>
                  {stage.name}
                </span>
              </div>
            );
          })}
        </div>
        
        <div className="relative">
          <svg 
            viewBox={`0 0 ${width} ${height}`} 
            className="w-full"
            style={{ overflow: 'visible' }}
          >
            {/* Main funnel shape */}
            <path
              d={getFunnelPath()}
              fill="#3B82F6"
              className="transition-all duration-300"
            />
            
            {/* Vertical divider lines */}
            {stages.slice(0, -1).map((_, index) => {
              const x = ((index + 1) / stageCount) * width;
              const { y1, y2 } = getDividerY(index);
              
              return (
                <line
                  key={`divider-${index}`}
                  x1={x}
                  y1={y1}
                  x2={x}
                  y2={y2}
                  stroke="rgba(255, 255, 255, 0.2)"
                  strokeWidth={1}
                />
              );
            })}
            
            {/* Invisible hover zones for each stage */}
            {stages.map((_, index) => {
              const x = index * stageWidth;
              return (
                <rect
                  key={`hover-${index}`}
                  x={x}
                  y={0}
                  width={stageWidth}
                  height={height}
                  fill="transparent"
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  style={{ cursor: 'pointer' }}
                />
              );
            })}
            
            {/* Stage count labels inside funnel */}
            {stages.map((stage, index) => {
              const centerX = getStageCenterX(index);
              const stageHeight = getHeightAtStage(index);
              const showCount = stageHeight > 40;
              
              return showCount ? (
                <text
                  key={`count-${index}`}
                  x={centerX}
                  y={height / 2 + 5}
                  textAnchor="middle"
                  className="fill-white font-bold pointer-events-none"
                  style={{ 
                    fontSize: stageHeight > 60 ? '16px' : '12px',
                    opacity: 0.9,
                  }}
                >
                  {stage.count.toLocaleString()}
                </text>
              ) : null;
            })}
          </svg>
          
          {/* Tooltip */}
          {hoveredIndex !== null && (
            <div 
              className="absolute z-10 bg-slate-800/95 backdrop-blur-sm border border-slate-700 rounded-xl shadow-2xl p-4 min-w-[180px] pointer-events-none animate-in fade-in-0 zoom-in-95 duration-200"
              style={{
                left: `${((hoveredIndex + 0.5) / stages.length) * 100}%`,
                top: '100%',
                transform: 'translateX(-50%) translateY(8px)',
              }}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-6">
                  <span className="font-medium text-slate-400 text-xs uppercase tracking-wide">
                    {stages[hoveredIndex].name}
                  </span>
                  <span className="text-lg font-bold text-white">
                    {stages[hoveredIndex].count.toLocaleString()}
                  </span>
                </div>
                
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs text-slate-500">Of total</span>
                  <span className="text-sm font-semibold text-blue-400">
                    {getPercentage(hoveredIndex)}%
                  </span>
                </div>
                
                {stages[hoveredIndex].conversionRate !== undefined && hoveredIndex > 0 && (
                  <div className="flex items-center justify-between gap-4 pt-1 border-t border-slate-700">
                    <span className="text-xs text-slate-500">Stage Conv.</span>
                    <span className={cn(
                      "text-sm font-semibold",
                      (stages[hoveredIndex].conversionRate ?? 0) >= (stages[hoveredIndex].benchmark ?? 0)
                        ? "text-emerald-400"
                        : "text-amber-400"
                    )}>
                      {stages[hoveredIndex].conversionRate?.toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
