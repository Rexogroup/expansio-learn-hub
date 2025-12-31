import { CheckCircle2, Heart, Mail, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface StatusPillsProps {
  infrastructureHealthy: boolean;
  alertCount: number;
  emailsSent: number;
  meetingsBooked: number;
}

export function StatusPills({ 
  infrastructureHealthy, 
  alertCount, 
  emailsSent, 
  meetingsBooked 
}: StatusPillsProps) {
  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}k`;
    }
    return num.toString();
  };

  // Determine overall health status
  const needsAttention = !infrastructureHealthy || alertCount > 0;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Infrastructure Status - softer messaging */}
      <Badge 
        variant="outline" 
        className={`flex items-center gap-1.5 px-3 py-1 ${
          needsAttention 
            ? 'border-amber-500/50 text-amber-600 dark:text-amber-400 bg-amber-500/10' 
            : 'border-green-500/50 text-green-600 dark:text-green-400 bg-green-500/10'
        }`}
      >
        {needsAttention ? (
          <Heart className="w-3.5 h-3.5" />
        ) : (
          <CheckCircle2 className="w-3.5 h-3.5" />
        )}
        <span className="text-xs font-medium">
          {needsAttention ? 'Needs Attention' : 'Healthy'}
        </span>
      </Badge>

      {/* Quick Stats */}
      <div className="flex items-center gap-1 text-muted-foreground ml-2">
        <Mail className="w-3.5 h-3.5" />
        <span className="text-xs font-medium">{formatNumber(emailsSent)}</span>
        <span className="text-xs mx-1">|</span>
        <Calendar className="w-3.5 h-3.5" />
        <span className="text-xs font-medium">{meetingsBooked}</span>
      </div>
    </div>
  );
}
