import { Copy, TrendingUp, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface SimpleScriptCardProps {
  title: string;
  campaign?: string;
  interestedRate?: number;
  emailsPerLead?: number;
  content?: string;
  isWinning: boolean;
  recommendation?: string;
}

export const SimpleScriptCard = ({
  title,
  campaign,
  interestedRate,
  emailsPerLead,
  content,
  isWinning,
  recommendation,
}: SimpleScriptCardProps) => {
  const handleCopy = () => {
    if (content) {
      navigator.clipboard.writeText(content);
      toast.success("Script copied to clipboard");
    }
  };

  return (
    <div 
      className={`p-3 rounded-lg border transition-colors ${
        isWinning 
          ? "border-l-4 border-l-emerald-500 border-border/50 bg-emerald-500/5" 
          : "border-l-4 border-l-amber-500 border-border/50 bg-amber-500/5"
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            {isWinning ? (
              <TrendingUp className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5 text-amber-500 shrink-0" />
            )}
            <h4 className="text-sm font-medium truncate">{title}</h4>
          </div>
          {campaign && (
            <p className="text-xs text-muted-foreground truncate">{campaign}</p>
          )}
        </div>
        {recommendation && (
          <Badge 
            variant={isWinning ? "default" : "secondary"} 
            className={`shrink-0 text-[10px] ${isWinning ? "bg-emerald-500" : ""}`}
          >
            {recommendation}
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
        {interestedRate !== undefined && (
          <span className="flex items-center gap-1">
            <span className="font-medium text-foreground">{interestedRate.toFixed(1)}%</span> IR
          </span>
        )}
        {emailsPerLead !== undefined && (
          <span className="flex items-center gap-1">
            <span className="font-medium text-foreground">{emailsPerLead.toFixed(0)}</span> EPL
          </span>
        )}
      </div>

      {content && (
        <div className="flex items-end gap-2">
          <p className="text-xs text-muted-foreground line-clamp-2 flex-1">
            {content}
          </p>
          {isWinning && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 shrink-0"
              onClick={handleCopy}
            >
              <Copy className="h-3 w-3" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
