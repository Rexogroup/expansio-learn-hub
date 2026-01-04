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
  const minHeight = 25;

  // Calculate cumulative heights using stage-to-stage ratios for better visualization
  const getStageHeights = () => {
    const heights: number[] = [maxHeight]; // First stage is full height
    
    for (let i = 1; i < stages.length; i++) {
      const prevCount = stages[i - 1].count;
      const currCount = stages[i].count;
      
      // Handle edge case where previous stage has 0
      if (prevCount === 0) {
        heights.push(minHeight);
        continue;
      }
      
      // Calculate stage-to-stage conversion ratio
      const stageRatio = currCount / prevCount;
      
      // Apply this ratio to shrink from previous height
      // Use square root for gentler curve so differences are more visible
      const shrinkFactor = Math.pow(stageRatio, 0.5);
      
      // Calculate new height
      let newHeight = heights[i - 1] * shrinkFactor;
      
      // If count is 0, make it nearly invisible (just a thin line)
      if (currCount === 0) {
        newHeight = 8;
      } else {
        // Ensure minimum visibility for non-zero values
        newHeight = Math.max(minHeight, newHeight);
      }
      
      heights.push(newHeight);
    }
    
    return heights;
  };

  const stageHeights = getStageHeights();

  const getHeightAtStage = (index: number) => {
    return stageHeights[Math.min(index, stageHeights.length - 1)];
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
    <Card className="relative overflow-hidden transition-all duration-300 bg-gradient-to-br from-card via-card to-muted/30 border-border/50">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Activity className="h-4 w-4 text-primary" />
          </div>
          <CardTitle className="text-lg font-semibold text-foreground">Conversion Funnel</CardTitle>
        </div>
      </CardHeader>
      
      <CardContent className="p-4 pt-0">
        {/* Stage Labels Above Funnel */}
        <div className="flex items-end justify-around px-2 pb-4">
        {stages.map((stage, index) => {
            const isHovered = hoveredIndex === index;
            const displayRate = stage.conversionRate;
            
            return (
              <div 
                key={index} 
                className={cn(
                  "flex flex-col items-center gap-1.5 transition-all duration-200",
                  isHovered && "scale-105"
                )}
                style={{ width: `${100 / stageCount}%` }}
              >
                {/* Rate Badge + Count */}
                <div className={cn(
                  "px-3 py-1 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-2",
                  isHovered 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-muted border border-border text-foreground"
                )}>
                  {displayRate !== undefined ? (
                    <>
                      <span>{displayRate.toFixed(1)}%</span>
                      <span className="text-muted-foreground text-xs">|</span>
                      <span className="text-xs text-muted-foreground">{stage.count.toLocaleString()}</span>
                    </>
                  ) : (
                    <span>{stage.count.toLocaleString()}</span>
                  )}
                </div>
                {/* Stage Name */}
                <span className={cn(
                  "text-xs font-medium uppercase tracking-wider transition-colors duration-200",
                  isHovered ? "text-primary" : "text-muted-foreground"
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
              fill="hsl(var(--primary))"
              opacity={0.85}
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
                  stroke="hsl(var(--primary-foreground) / 0.3)"
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
            
          </svg>
          
          {/* Tooltip */}
          {hoveredIndex !== null && (
            <div 
              className="absolute z-10 bg-card/95 backdrop-blur-sm border border-border rounded-xl shadow-lg p-4 min-w-[180px] pointer-events-none animate-in fade-in-0 zoom-in-95 duration-200"
              style={{
                left: `${((hoveredIndex + 0.5) / stages.length) * 100}%`,
                top: '100%',
                transform: 'translateX(-50%) translateY(8px)',
              }}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-6">
                  <span className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
                    {stages[hoveredIndex].name}
                  </span>
                  <span className="text-lg font-bold text-foreground">
                    {stages[hoveredIndex].count.toLocaleString()}
                  </span>
                </div>
                
                {stages[hoveredIndex].conversionRate !== undefined && (
                  <div className="flex items-center justify-between gap-4 pt-1 border-t border-border">
                    <span className="text-xs text-muted-foreground">Conversion Rate</span>
                    <span className={cn(
                      "text-sm font-semibold",
                      (stages[hoveredIndex].conversionRate ?? 0) >= (stages[hoveredIndex].benchmark ?? 0)
                        ? "text-emerald-600"
                        : "text-amber-600"
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
