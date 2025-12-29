import { Check, Circle, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Step {
  id: string;
  step_number: number;
  name: string;
  status: 'not_started' | 'in_progress' | 'iteration_needed' | 'validated';
}

interface StepProgressBarProps {
  steps: Step[];
  currentStep: number;
  onStepClick?: (stepNumber: number) => void;
}

export function StepProgressBar({ steps, currentStep, onStepClick }: StepProgressBarProps) {
  const getStepIcon = (step: Step) => {
    switch (step.status) {
      case 'validated':
        return <Check className="w-4 h-4" />;
      case 'iteration_needed':
        return <AlertCircle className="w-4 h-4" />;
      case 'in_progress':
        return <Loader2 className="w-4 h-4 animate-spin" />;
      default:
        return <span className="text-xs font-bold">{step.step_number}</span>;
    }
  };

  const getStepStyles = (step: Step) => {
    const isActive = step.step_number === currentStep;
    
    switch (step.status) {
      case 'validated':
        return cn(
          "bg-emerald-500 text-white border-emerald-500",
          isActive && "ring-4 ring-emerald-500/30"
        );
      case 'iteration_needed':
        return cn(
          "bg-amber-500 text-white border-amber-500",
          isActive && "ring-4 ring-amber-500/30"
        );
      case 'in_progress':
        return cn(
          "bg-primary text-primary-foreground border-primary",
          isActive && "ring-4 ring-primary/30"
        );
      default:
        return cn(
          "bg-muted text-muted-foreground border-border",
          isActive && "ring-4 ring-muted/50"
        );
    }
  };

  const getLineStyles = (stepIndex: number) => {
    const step = steps[stepIndex];
    if (!step) return "bg-border";
    
    if (step.status === 'validated') return "bg-emerald-500";
    if (step.status === 'iteration_needed') return "bg-amber-500";
    if (step.status === 'in_progress') return "bg-primary/50";
    return "bg-border";
  };

  return (
    <div className="w-full">
      {/* Step indicators */}
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center flex-1">
            {/* Step circle */}
            <button
              onClick={() => onStepClick?.(step.step_number)}
              className={cn(
                "w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all duration-300",
                "hover:scale-110 cursor-pointer",
                getStepStyles(step)
              )}
              title={step.name}
            >
              {getStepIcon(step)}
            </button>
            
            {/* Connecting line */}
            {index < steps.length - 1 && (
              <div className={cn(
                "flex-1 h-1 mx-2 rounded-full transition-colors duration-300",
                getLineStyles(index)
              )} />
            )}
          </div>
        ))}
      </div>
      
      {/* Step labels (only show current) */}
      <div className="mt-4 text-center">
        <p className="text-sm text-muted-foreground">
          Step {currentStep} of {steps.length}
        </p>
        <h3 className="text-lg font-semibold text-foreground">
          {steps.find(s => s.step_number === currentStep)?.name || 'Unknown Step'}
        </h3>
      </div>
    </div>
  );
}
