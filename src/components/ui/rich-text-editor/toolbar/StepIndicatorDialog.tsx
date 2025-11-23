import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChevronRight } from 'lucide-react';
import { Editor } from '@tiptap/react';

interface StepIndicatorDialogProps {
  editor: Editor;
}

export const StepIndicatorDialog = ({ editor }: StepIndicatorDialogProps) => {
  const [open, setOpen] = useState(false);
  const [stepCount, setStepCount] = useState(4);
  const [activeStep, setActiveStep] = useState(2);
  const [labels, setLabels] = useState<string[]>(['', '', '', '']);

  const handleStepCountChange = (value: number) => {
    const count = Math.max(2, Math.min(10, value)); // Between 2 and 10 steps
    setStepCount(count);
    
    // Adjust labels array
    const newLabels = [...labels];
    while (newLabels.length < count) {
      newLabels.push('');
    }
    setLabels(newLabels.slice(0, count));
    
    // Adjust active step if needed
    if (activeStep > count) {
      setActiveStep(count);
    }
  };

  const handleActiveStepChange = (value: number) => {
    const step = Math.max(1, Math.min(stepCount, value));
    setActiveStep(step);
  };

  const handleLabelChange = (index: number, value: string) => {
    const newLabels = [...labels];
    newLabels[index] = value;
    setLabels(newLabels);
  };

  const handleInsert = () => {
    // Filter out empty labels
    const filteredLabels = labels.map(label => label.trim());
    
    editor
      .chain()
      .focus()
      .setStepIndicator({
        stepCount,
        activeStep,
        labels: filteredLabels,
      })
      .run();
    
    setOpen(false);
  };

  const resetForm = () => {
    setStepCount(4);
    setActiveStep(2);
    setLabels(['', '', '', '']);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) resetForm();
    }}>
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="ghost" className="w-full justify-start">
          <ChevronRight className="w-4 h-4 mr-2" />
          Step Indicator
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto bg-background">
        <DialogHeader>
          <DialogTitle>Insert Step Indicator</DialogTitle>
          <DialogDescription>
            Configure your step indicator with custom count, active state, and optional labels.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-6 py-4">
          <div className="grid gap-2">
            <Label htmlFor="stepCount">
              Number of Steps (2-10)
            </Label>
            <Input
              id="stepCount"
              type="number"
              min={2}
              max={10}
              value={stepCount}
              onChange={(e) => handleStepCountChange(parseInt(e.target.value) || 2)}
              className="bg-background"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="activeStep">
              Active Step (1-{stepCount})
            </Label>
            <Input
              id="activeStep"
              type="number"
              min={1}
              max={stepCount}
              value={activeStep}
              onChange={(e) => handleActiveStepChange(parseInt(e.target.value) || 1)}
              className="bg-background"
            />
            <p className="text-sm text-muted-foreground">
              Steps 1-{activeStep} will be highlighted as active
            </p>
          </div>

          <div className="grid gap-3">
            <Label>Step Labels (Optional)</Label>
            <p className="text-sm text-muted-foreground">
              Add labels below each step number (leave blank if not needed)
            </p>
            {Array.from({ length: stepCount }).map((_, index) => (
              <div key={index} className="grid gap-1.5">
                <Label htmlFor={`label-${index}`} className="text-xs text-muted-foreground">
                  Step {index + 1} Label
                </Label>
                <Input
                  id={`label-${index}`}
                  placeholder={`e.g., ${index === 0 ? 'Planning' : index === 1 ? 'Execution' : index === 2 ? 'Review' : 'Completion'}`}
                  value={labels[index] || ''}
                  onChange={(e) => handleLabelChange(index, e.target.value)}
                  maxLength={20}
                  className="bg-background"
                />
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <p className="text-sm font-medium mb-2">Preview</p>
            <div className="flex items-center gap-0 overflow-x-auto pb-2">
              {Array.from({ length: stepCount }).map((_, index) => (
                <div
                  key={index}
                  className={`
                    flex flex-col items-center justify-center h-12 min-w-[80px] px-3 text-xs font-bold
                    ${index + 1 <= activeStep ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}
                    ${index === 0 ? 'rounded-l' : ''}
                    ${index === stepCount - 1 ? 'rounded-r' : ''}
                  `}
                  style={{
                    clipPath: index === 0 
                      ? 'polygon(0 0, calc(100% - 8px) 0, 100% 50%, calc(100% - 8px) 100%, 0 100%)'
                      : index === stepCount - 1
                      ? 'polygon(0 0, 100% 0, 100% 100%, 0 100%, 8px 50%)'
                      : 'polygon(0 0, calc(100% - 8px) 0, 100% 50%, calc(100% - 8px) 100%, 0 100%, 8px 50%)',
                    marginLeft: index === 0 ? '0' : '-8px',
                  }}
                >
                  <span className="text-base">{index + 1}</span>
                  {labels[index] && (
                    <span className="text-[8px] uppercase mt-0.5 opacity-80">
                      {labels[index]}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleInsert}>
            Insert Step Indicator
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
