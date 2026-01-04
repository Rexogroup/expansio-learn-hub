import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ArrowRight, Zap, TrendingUp, Pause, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
export interface PriorityAction {
  id: string;
  title: string;
  description: string;
  actionLabel: string;
  actionPath?: string;
  prompt?: string;
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
  const [isExpanded, setIsExpanded] = useState(false);
  const displayedActions = isExpanded ? actions : actions.slice(0, maxVisible);

  if (actions.length === 0) return null;

  const getPriorityStyles = (priority: PriorityAction['priority'], actionId: string) => {
    // Special styling for SOP action types
    if (actionId.startsWith('pause-')) {
      return 'border-amber-500/40 bg-amber-500/10';
    }
    if (actionId.startsWith('scale-')) {
      return 'border-emerald-500/40 bg-emerald-500/10';
    }
    if (actionId.startsWith('iterate-')) {
      return 'border-blue-500/30 bg-blue-500/5';
    }
    
    switch (priority) {
      case 'critical':
        return 'border-amber-500/30 bg-amber-500/5';
      case 'high':
        return 'border-amber-500/30 bg-amber-500/5';
      default:
        return 'border-primary/20 bg-primary/5';
    }
  };

  const getIconStyles = (priority: PriorityAction['priority'], actionId: string) => {
    if (actionId.startsWith('pause-')) return 'text-amber-500';
    if (actionId.startsWith('scale-')) return 'text-emerald-500';
    if (actionId.startsWith('iterate-')) return 'text-blue-500';
    
    switch (priority) {
      case 'critical':
        return 'text-amber-500';
      case 'high':
        return 'text-amber-500';
      default:
        return 'text-primary';
    }
  };

  const getActionBadge = (actionId: string) => {
    if (actionId.startsWith('pause-')) {
      return <Badge className="bg-amber-500 text-white text-xs">PAUSE</Badge>;
    }
    if (actionId.startsWith('scale-')) {
      return <Badge className="bg-emerald-500 text-white text-xs">SCALE</Badge>;
    }
    if (actionId.startsWith('iterate-')) {
      return <Badge variant="secondary" className="text-xs">ITERATE</Badge>;
    }
    return null;
  };

  const getDefaultIcon = (actionId: string, priority: PriorityAction['priority']) => {
    if (actionId.startsWith('pause-')) return <Pause className="w-5 h-5" />;
    if (actionId.startsWith('scale-')) return <TrendingUp className="w-5 h-5" />;
    if (actionId.startsWith('iterate-')) return <RefreshCw className="w-5 h-5" />;
    
    return priority === 'critical' 
      ? <AlertTriangle className="w-5 h-5" />
      : <ArrowRight className="w-5 h-5" />;
  };

  const getButtonVariant = (actionId: string, priority: PriorityAction['priority']) => {
    if (actionId.startsWith('pause-')) return 'outline';
    if (actionId.startsWith('scale-')) return 'default';
    return 'default';
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
        <Zap className="w-4 h-4" />
        Priority Actions
      </h3>
      
      <div className="space-y-2">
        {displayedActions.map((action) => (
          <Card 
            key={action.id} 
            className={`transition-all hover:shadow-md ${getPriorityStyles(action.priority, action.id)}`}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className={`mt-0.5 ${getIconStyles(action.priority, action.id)}`}>
                    {action.icon || getDefaultIcon(action.id, action.priority)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-foreground truncate">{action.title}</h4>
                      {getActionBadge(action.id)}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                      {action.description}
                    </p>
                  </div>
                </div>
                <Button 
                  size="sm"
                  variant={getButtonVariant(action.id, action.priority) as "default" | "destructive"}
                  onClick={() => {
                    if (action.onAction) {
                      action.onAction();
                    } else if (action.actionPath) {
                      navigate(action.actionPath, {
                        state: action.prompt ? { initialPrompt: action.prompt } : undefined
                      });
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
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full text-muted-foreground hover:text-foreground"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="w-4 h-4 mr-1" />
              Show less
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4 mr-1" />
              +{actions.length - maxVisible} more actions
            </>
          )}
        </Button>
      )}
    </div>
  );
}
