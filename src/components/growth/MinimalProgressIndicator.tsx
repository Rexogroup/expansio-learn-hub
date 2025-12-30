import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { StepProgressBar } from "./StepProgressBar";

interface Step {
  id: string;
  step_number: number;
  name: string;
  status: 'not_started' | 'in_progress' | 'iteration_needed' | 'validated';
}

interface MinimalProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
  currentStepName: string;
  steps: Step[];
  alertSteps?: number[];
  onStepClick?: (stepNumber: number) => void;
}

const STEP_PHASES: Record<number, string> = {
  1: 'Infrastructure',
  2: 'ICP & Offer',
  3: 'Lead Magnets',
  4: 'Testing',
  5: 'Appointment Setting',
  6: 'Scaling',
  7: 'Optimization',
};

export function MinimalProgressIndicator({ 
  currentStep, 
  totalSteps,
  currentStepName,
  steps,
  alertSteps = [],
  onStepClick
}: MinimalProgressIndicatorProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const phaseName = STEP_PHASES[currentStep] || currentStepName;

  return (
    <div className="flex items-center justify-between py-3 px-4 bg-muted/30 rounded-lg border">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div 
              key={i}
              className={`w-2 h-2 rounded-full transition-colors ${
                i + 1 < currentStep 
                  ? 'bg-green-500' 
                  : i + 1 === currentStep 
                    ? 'bg-primary' 
                    : 'bg-muted-foreground/30'
              }`}
            />
          ))}
        </div>
        <span className="text-sm text-muted-foreground ml-2">
          Step {currentStep} of {totalSteps}
        </span>
        <span className="text-sm font-medium text-foreground">
          — {phaseName}
        </span>
      </div>
      
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground">
            View Full Journey
            <ChevronRight className="w-3 h-3 ml-1" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Growth Journey</DialogTitle>
          </DialogHeader>
          <div className="py-6">
            <StepProgressBar 
              steps={steps}
              currentStep={currentStep}
              onStepClick={(stepNum) => {
                onStepClick?.(stepNum);
                setDialogOpen(false);
              }}
              alertSteps={alertSteps}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
