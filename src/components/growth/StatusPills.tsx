import { CheckCircle2, AlertTriangle, Mail, Calendar } from "lucide-react";
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

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Infrastructure Status */}
      <Badge 
        variant="outline" 
        className={`flex items-center gap-1.5 px-3 py-1 ${
          infrastructureHealthy 
            ? 'border-green-500/50 text-green-600 dark:text-green-400 bg-green-500/10' 
            : 'border-amber-500/50 text-amber-600 dark:text-amber-400 bg-amber-500/10'
        }`}
      >
        {infrastructureHealthy ? (
          <CheckCircle2 className="w-3.5 h-3.5" />
        ) : (
          <AlertTriangle className="w-3.5 h-3.5" />
        )}
        <span className="text-xs font-medium">
          {infrastructureHealthy ? 'Healthy' : 'Issues'}
        </span>
      </Badge>

      {/* Alert Count - Only show if there are alerts */}
      {alertCount > 0 && (
        <Badge 
          variant="outline" 
          className="flex items-center gap-1.5 px-3 py-1 border-destructive/50 text-destructive bg-destructive/10"
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span className="text-xs font-medium">{alertCount} Alert{alertCount > 1 ? 's' : ''}</span>
        </Badge>
      )}

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
