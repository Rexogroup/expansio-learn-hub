import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ArrowRight, Zap } from "lucide-react";

interface PriorityAction {
  id: string;
  title: string;
  description: string;
  actionLabel: string;
  actionPath?: string;
  onAction?: () => void;
  priority: 'critical' | 'high' | 'normal';
  icon?: React.ReactNode;
}

interface PriorityActionsStackProps {
  actions: PriorityAction[];
  maxVisible?: number;
}

export function PriorityActionsStack({ actions, maxVisible = 3 }: PriorityActionsStackProps) {
  const navigate = useNavigate();
  const visibleActions = actions.slice(0, maxVisible);

  if (actions.length === 0) return null;

  const getPriorityStyles = (priority: PriorityAction['priority']) => {
    switch (priority) {
      case 'critical':
        return 'border-destructive/30 bg-destructive/5';
      case 'high':
        return 'border-amber-500/30 bg-amber-500/5';
      default:
        return 'border-primary/20 bg-primary/5';
    }
  };

  const getIconStyles = (priority: PriorityAction['priority']) => {
    switch (priority) {
      case 'critical':
        return 'text-destructive';
      case 'high':
        return 'text-amber-500';
      default:
        return 'text-primary';
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
        <Zap className="w-4 h-4" />
        Priority Actions
      </h3>
      
      <div className="space-y-2">
        {visibleActions.map((action) => (
          <Card 
            key={action.id} 
            className={`transition-all hover:shadow-md ${getPriorityStyles(action.priority)}`}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className={`mt-0.5 ${getIconStyles(action.priority)}`}>
                    {action.icon || (
                      action.priority === 'critical' ? (
                        <AlertTriangle className="w-5 h-5" />
                      ) : (
                        <ArrowRight className="w-5 h-5" />
                      )
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-foreground truncate">{action.title}</h4>
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                      {action.description}
                    </p>
                  </div>
                </div>
                <Button 
                  size="sm"
                  variant={action.priority === 'critical' ? 'destructive' : 'default'}
                  onClick={() => {
                    if (action.onAction) {
                      action.onAction();
                    } else if (action.actionPath) {
                      navigate(action.actionPath);
                    }
                  }}
                  className="shrink-0"
                >
                  {action.actionLabel}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {actions.length > maxVisible && (
        <p className="text-xs text-muted-foreground text-center">
          +{actions.length - maxVisible} more actions
        </p>
      )}
    </div>
  );
}
