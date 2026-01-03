import { Sprout, TrendingUp, Zap, ArrowRight } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";

interface LearningStageDisplayProps {
  scriptsCount: number;
  repliesCount: number;
  objectionsCount: number;
  callCount: number;
}

type Stage = "growing" | "established" | "expert";

const getStage = (total: number): Stage => {
  if (total >= 30) return "expert";
  if (total >= 11) return "established";
  return "growing";
};

const stageConfig: Record<Stage, { 
  icon: typeof Sprout; 
  label: string; 
  tagline: string;
  color: string;
  bgColor: string;
}> = {
  growing: {
    icon: Sprout,
    label: "Growing",
    tagline: "Your AI is learning your business patterns",
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
  },
  established: {
    icon: TrendingUp,
    label: "Established",
    tagline: "Your AI knows your winning playbook",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  expert: {
    icon: Zap,
    label: "Expert",
    tagline: "Your AI is your competitive advantage",
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
  },
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

  // Determine the smart tip based on what's missing
  const getSmartTip = () => {
    if (callCount === 0) {
      return {
        text: "Analyze your first sales call to unlock objection intelligence",
        action: () => navigate("/sales-coach"),
        actionLabel: "Go to Sales Coach",
      };
    }
    if (repliesCount === 0) {
      return {
        text: "Mark reply outcomes in Master Inbox to learn booking patterns",
        action: () => navigate("/inbox"),
        actionLabel: "Open Inbox",
      };
    }
    if (scriptsCount === 0) {
      return {
        text: "Send 1,000+ emails to unlock script performance analysis",
        action: () => navigate("/command-center"),
        actionLabel: "View Campaigns",
      };
    }
    if (objectionsCount < 5) {
      return {
        text: "Analyze more calls to build your objection playbook",
        action: () => navigate("/sales-coach"),
        actionLabel: "Analyze Calls",
      };
    }
    return null;
  };

  const smartTip = getSmartTip();

  // Progress thresholds for next stage
  const nextStageThreshold = stage === "growing" ? 11 : stage === "established" ? 30 : 100;
  const progressPercent = Math.min((total / nextStageThreshold) * 100, 100);

  return (
    <div className="space-y-4">
      {/* Stage Badge */}
      <div className="flex items-center gap-3">
        <div className={`rounded-full p-2.5 ${config.bgColor}`}>
          <StageIcon className={`h-5 w-5 ${config.color}`} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-semibold ${config.color}`}>
              {config.label}
            </span>
            {stage !== "expert" && (
              <span className="text-xs text-muted-foreground">
                ({total}/{nextStageThreshold} to next stage)
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{config.tagline}</p>
        </div>
      </div>

      {/* Progress bar to next stage */}
      {stage !== "expert" && (
        <Progress value={progressPercent} className="h-1.5" />
      )}

      {/* Value Bars */}
      <div className="space-y-2">
        <ValueRow
          count={scriptsCount}
          label="proven scripts ready to scale"
          context={callCount > 0 ? `from campaign data` : undefined}
          maxCount={10}
        />
        <ValueRow
          count={repliesCount}
          label="reply patterns identified"
          context={repliesCount > 0 ? `for booking optimization` : undefined}
          maxCount={10}
        />
        <ValueRow
          count={objectionsCount}
          label="objections mapped"
          context={callCount > 0 ? `from ${callCount} call${callCount !== 1 ? 's' : ''}` : undefined}
          maxCount={15}
        />
      </div>

      {/* Smart Tip */}
      {smartTip && (
        <button
          onClick={smartTip.action}
          className="w-full flex items-center justify-between gap-2 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-left group"
        >
          <span className="text-xs text-muted-foreground">{smartTip.text}</span>
          <span className="text-xs font-medium text-primary flex items-center gap-1 shrink-0 group-hover:gap-2 transition-all">
            {smartTip.actionLabel}
            <ArrowRight className="h-3 w-3" />
          </span>
        </button>
      )}
    </div>
  );
};

interface ValueRowProps {
  count: number;
  label: string;
  context?: string;
  maxCount: number;
}

const ValueRow = ({ count, label, context, maxCount }: ValueRowProps) => {
  const progress = Math.min((count / maxCount) * 100, 100);
  
  return (
    <div className="flex items-center gap-3">
      <div className="w-12 shrink-0">
        <Progress value={progress} className="h-1" />
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-sm">
          <span className="font-medium">{count}</span>{" "}
          <span className="text-muted-foreground">{label}</span>
        </span>
        {context && (
          <span className="text-xs text-muted-foreground ml-1">• {context}</span>
        )}
      </div>
    </div>
  );
};
