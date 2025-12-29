import { Badge } from "@/components/ui/badge";
import { Check, AlertCircle, Clock, Play } from "lucide-react";
import { cn } from "@/lib/utils";

type Status = 'not_started' | 'in_progress' | 'iteration_needed' | 'validated';

interface ValidationBadgeProps {
  status: Status;
  className?: string;
}

export function ValidationBadge({ status, className }: ValidationBadgeProps) {
  const config = {
    not_started: {
      label: 'Not Started',
      icon: Clock,
      variant: 'secondary' as const,
      className: 'bg-muted text-muted-foreground',
    },
    in_progress: {
      label: 'In Progress',
      icon: Play,
      variant: 'default' as const,
      className: 'bg-primary text-primary-foreground',
    },
    iteration_needed: {
      label: 'Iteration Needed',
      icon: AlertCircle,
      variant: 'outline' as const,
      className: 'bg-amber-500/10 text-amber-600 border-amber-500',
    },
    validated: {
      label: 'Validated',
      icon: Check,
      variant: 'outline' as const,
      className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500',
    },
  };

  const { label, icon: Icon, className: statusClassName } = config[status];

  return (
    <Badge 
      variant="outline"
      className={cn(
        "gap-1.5 px-3 py-1 text-sm font-medium",
        statusClassName,
        className
      )}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </Badge>
  );
}
