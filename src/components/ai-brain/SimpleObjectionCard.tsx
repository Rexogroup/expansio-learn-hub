import { Copy, Shield, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

interface SimpleObjectionCardProps {
  clusterName: string;
  category: string;
  avgScore: number;
  occurrences: number;
  bestResponse?: string;
  difficultyLevel?: string;
}

export const SimpleObjectionCard = ({
  clusterName,
  category,
  avgScore,
  occurrences,
  bestResponse,
  difficultyLevel,
}: SimpleObjectionCardProps) => {
  const isMastered = avgScore >= 7;

  const handleCopy = () => {
    if (bestResponse) {
      navigator.clipboard.writeText(bestResponse);
      toast.success("Response copied to clipboard");
    }
  };

  const getDifficultyColor = (level?: string) => {
    switch (level?.toLowerCase()) {
      case "easy": return "bg-emerald-500/10 text-emerald-500";
      case "moderate": return "bg-amber-500/10 text-amber-500";
      case "hard": return "bg-red-500/10 text-red-500";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div 
      className={`p-3 rounded-lg border transition-colors ${
        isMastered 
          ? "border-l-4 border-l-emerald-500 border-border/50 bg-emerald-500/5" 
          : "border-l-4 border-l-amber-500 border-border/50 bg-amber-500/5"
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            {isMastered ? (
              <Shield className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
            ) : (
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
            )}
            <h4 className="text-sm font-medium truncate">{clusterName}</h4>
          </div>
          <p className="text-xs text-muted-foreground">{category}</p>
        </div>
        {difficultyLevel && (
          <Badge variant="outline" className={`shrink-0 text-[10px] ${getDifficultyColor(difficultyLevel)}`}>
            {difficultyLevel}
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-3 mb-2">
        <div className="flex-1">
          <Progress value={avgScore * 10} className="h-1.5" />
        </div>
        <span className="text-xs font-medium">{avgScore.toFixed(1)}/10</span>
        <span className="text-xs text-muted-foreground">×{occurrences}</span>
      </div>

      {bestResponse && (
        <div className="flex items-end gap-2">
          <p className="text-xs text-muted-foreground line-clamp-2 flex-1">
            {bestResponse}
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 shrink-0"
            onClick={handleCopy}
          >
            <Copy className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
};
