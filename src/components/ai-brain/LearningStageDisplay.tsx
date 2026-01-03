import { Sprout, TrendingUp, Zap, ArrowRight, Sparkles } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";

interface LearningStageDisplayProps {
  scriptsCount: number;
  repliesCount: number;
  objectionsCount: number;
  callCount: number;
}

type Stage = "learning" | "personalized" | "predictive";

const STAGE_THRESHOLDS = {
  learning: 0,
  personalized: 11,
  predictive: 30,
};

const getStage = (total: number): Stage => {
  if (total >= STAGE_THRESHOLDS.predictive) return "predictive";
  if (total >= STAGE_THRESHOLDS.personalized) return "personalized";
  return "learning";
};

const stageConfig: Record<Stage, { 
  icon: typeof Sprout; 
  label: string; 
  capability: string;
  color: string;
  bgColor: string;
}> = {
  learning: {
    icon: Sprout,
    label: "Learning",
    capability: "Your AI is observing your outbound patterns",
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
  },
  personalized: {
    icon: TrendingUp,
    label: "Personalized",
    capability: "Your AI suggests scripts & replies based on YOUR data",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  predictive: {
    icon: Zap,
    label: "Predictive",
    capability: "Your AI predicts what works before you test it",
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
  },
};

const nextStageUnlock: Record<Stage, string | null> = {
  learning: "AI-suggested scripts tailored to your winning patterns",
  personalized: "Predict campaign performance before sending",
  predictive: null,
};

export const LearningStageDisplay = ({
  scriptsCount,
  repliesCount,
  objectionsCount,
  callCount,
}: LearningStageDisplayProps) => {
  const navigate = useNavigate();
  const total = scriptsCount + repliesCount + objectionsCount;
  const stage = getStage(total);
  const config = stageConfig[stage];
  const StageIcon = config.icon;

  // Calculate progress to next stage
  const getProgressInfo = () => {
    if (stage === "predictive") {
      return { progress: 100, needed: 0, nextLabel: null };
    }
    
    const nextThreshold = stage === "learning" 
      ? STAGE_THRESHOLDS.personalized 
      : STAGE_THRESHOLDS.predictive;
    const currentThreshold = stage === "learning" ? 0 : STAGE_THRESHOLDS.personalized;
    
    const progressInStage = total - currentThreshold;
    const stageRange = nextThreshold - currentThreshold;
    const progress = Math.min((progressInStage / stageRange) * 100, 100);
    const needed = nextThreshold - total;
    const nextLabel = stage === "learning" ? "Personalized" : "Predictive";
    
    return { progress, needed, nextLabel };
  };

  const { progress, needed, nextLabel } = getProgressInfo();
  const unlock = nextStageUnlock[stage];

  // Level up actions with estimated impact
  const getLevelUpActions = () => {
    const actions: Array<{
      text: string;
      impact: string;
      action: () => void;
      actionLabel: string;
      completed: boolean;
    }> = [];

    if (callCount === 0) {
      actions.push({
        text: "Analyze your first sales call",
        impact: "+3-5 objections",
        action: () => navigate("/sales-coach"),
        actionLabel: "Analyze",
        completed: false,
      });
    } else if (objectionsCount < 10) {
      actions.push({
        text: "Analyze more sales calls",
        impact: "+3-5 objections each",
        action: () => navigate("/sales-coach"),
        actionLabel: "Analyze",
        completed: false,
      });
    }

    if (repliesCount === 0) {
      actions.push({
        text: "Mark reply outcomes in Inbox",
        impact: "+1 pattern per outcome",
        action: () => navigate("/inbox"),
        actionLabel: "Open Inbox",
        completed: false,
      });
    } else if (repliesCount < 10) {
      actions.push({
        text: "Mark more reply outcomes",
        impact: `+${10 - repliesCount} patterns needed`,
        action: () => navigate("/inbox"),
        actionLabel: "Open Inbox",
        completed: false,
      });
    }

    if (scriptsCount === 0) {
      actions.push({
        text: "Send 1,000+ emails for script analysis",
        impact: "+2-3 scripts auto-detected",
        action: () => navigate("/command-center"),
        actionLabel: "View Campaigns",
        completed: false,
      });
    }

    return actions.slice(0, 3); // Max 3 actions
  };

  const levelUpActions = stage !== "predictive" ? getLevelUpActions() : [];

  return (
    <div className="space-y-4">
      {/* Current Stage Header */}
      <div className="flex items-start gap-3">
        <div className={`rounded-full p-2.5 ${config.bgColor} shrink-0`}>
          <StageIcon className={`h-5 w-5 ${config.color}`} />
        </div>
        <div className="min-w-0">
          <span className={`text-sm font-semibold ${config.color}`}>
            {config.label} Stage
          </span>
          <p className="text-xs text-muted-foreground mt-0.5">
            {config.capability}
          </p>
        </div>
      </div>

      {/* Progress to Next Stage */}
      {stage !== "predictive" && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{config.label}</span>
            <Progress value={progress} className="h-1.5 flex-1" />
            <span className="text-xs font-medium">{nextLabel}</span>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            {needed} more pattern{needed !== 1 ? 's' : ''} to unlock {nextLabel}
          </p>
        </div>
      )}

      {/* Next Stage Unlock */}
      {unlock && (
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-primary/5 border border-primary/10">
          <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <div>
            <span className="text-xs font-medium text-primary">Next unlock:</span>
            <p className="text-xs text-muted-foreground">{unlock}</p>
          </div>
        </div>
      )}

      {stage === "predictive" && (
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <Zap className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-600 dark:text-amber-400">
            Full AI intelligence unlocked! Your AI can now predict outcomes.
          </p>
        </div>
      )}

      {/* Value Summary */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="p-2 rounded-lg bg-muted/50">
          <div className="text-lg font-semibold">{scriptsCount}</div>
          <div className="text-[10px] text-muted-foreground">Scripts</div>
        </div>
        <div className="p-2 rounded-lg bg-muted/50">
          <div className="text-lg font-semibold">{repliesCount}</div>
          <div className="text-[10px] text-muted-foreground">Replies</div>
        </div>
        <div className="p-2 rounded-lg bg-muted/50">
          <div className="text-lg font-semibold">{objectionsCount}</div>
          <div className="text-[10px] text-muted-foreground">Objections</div>
        </div>
      </div>

      {/* Level Up Actions */}
      {levelUpActions.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            How to level up
          </span>
          {levelUpActions.map((action, idx) => (
            <button
              key={idx}
              onClick={action.action}
              className="w-full flex items-center justify-between gap-2 p-2.5 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-left group"
            >
              <div className="flex-1 min-w-0">
                <span className="text-xs">{action.text}</span>
                <span className="text-[10px] text-muted-foreground ml-1.5">
                  {action.impact}
                </span>
              </div>
              <span className="text-xs font-medium text-primary flex items-center gap-1 shrink-0 group-hover:gap-1.5 transition-all">
                {action.actionLabel}
                <ArrowRight className="h-3 w-3" />
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
