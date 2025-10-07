import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, Lock } from "lucide-react";
import { toast } from "sonner";
import { Navbar } from "@/components/Navbar";

interface OnboardingStep {
  id: string;
  step_number: number;
  title: string;
  description: string;
  video_url?: string;
  google_doc_url?: string;
  template_url?: string;
}

interface UserProgress {
  step_number: number;
  completed: boolean;
  completed_at?: string;
}

export default function Onboarding() {
  const [steps, setSteps] = useState<OnboardingStep[]>([]);
  const [progress, setProgress] = useState<UserProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);
  const navigate = useNavigate();

  useEffect(() => {
    fetchOnboardingData();
  }, []);

  const fetchOnboardingData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      // Fetch all onboarding steps
      const { data: stepsData, error: stepsError } = await supabase
        .from("onboarding_steps")
        .select("*")
        .order("order_index", { ascending: true });

      if (stepsError) throw stepsError;

      // Fetch user's progress
      const { data: progressData, error: progressError } = await supabase
        .from("user_onboarding_progress")
        .select("*")
        .eq("user_id", user.id);

      if (progressError) throw progressError;

      setSteps(stepsData || []);
      setProgress(progressData || []);

      // Determine current step (first incomplete step)
      const currentStepNumber = progressData?.find(p => !p.completed)?.step_number || 
        (progressData?.length === 4 && progressData.every(p => p.completed) ? 5 : 1);
      
      setCurrentStep(currentStepNumber);

      // If all steps completed, redirect to courses
      if (progressData?.length === 4 && progressData.every(p => p.completed)) {
        toast.success("Onboarding complete! Welcome to Expansio Learning.");
        navigate("/courses");
      }
    } catch (error: any) {
      console.error("Error fetching onboarding data:", error);
      toast.error("Failed to load onboarding data");
    } finally {
      setLoading(false);
    }
  };

  const getStepStatus = (stepNumber: number) => {
    const stepProgress = progress.find(p => p.step_number === stepNumber);
    if (stepProgress?.completed) return "completed";
    if (stepNumber === currentStep) return "current";
    if (stepNumber < currentStep) return "completed";
    return "locked";
  };

  const canAccessStep = (stepNumber: number) => {
    if (stepNumber === 1) return true;
    const previousProgress = progress.find(p => p.step_number === stepNumber - 1);
    return previousProgress?.completed || false;
  };

  const handleStepClick = (stepNumber: number) => {
    if (canAccessStep(stepNumber)) {
      navigate(`/onboarding/step/${stepNumber}`);
    } else {
      toast.error("Please complete the previous step first");
    }
  };

  const completedSteps = progress.filter(p => p.completed).length;
  const progressPercentage = (completedSteps / 4) * 100;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading onboarding...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Welcome to Expansio Learning</h1>
          <p className="text-muted-foreground">
            Complete these {steps.length} steps to get started with our platform
          </p>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Your Progress</CardTitle>
            <CardDescription>
              {completedSteps} of {steps.length} steps completed
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Progress value={progressPercentage} className="h-3" />
          </CardContent>
        </Card>

        <div className="space-y-4">
          {steps.map((step) => {
            const status = getStepStatus(step.step_number);
            const canAccess = canAccessStep(step.step_number);

            return (
              <Card
                key={step.id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  status === "current" ? "ring-2 ring-primary" : ""
                } ${!canAccess ? "opacity-60" : ""}`}
                onClick={() => handleStepClick(step.step_number)}
              >
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <div className="mt-1">
                      {status === "completed" ? (
                        <CheckCircle2 className="w-6 h-6 text-green-500" />
                      ) : status === "current" ? (
                        <Circle className="w-6 h-6 text-primary" />
                      ) : (
                        <Lock className="w-6 h-6 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-semibold text-muted-foreground">
                          Step {step.step_number}
                        </span>
                        {status === "completed" && (
                          <span className="text-xs px-2 py-1 rounded-full bg-green-500/10 text-green-500">
                            Completed
                          </span>
                        )}
                        {status === "current" && (
                          <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                            Current
                          </span>
                        )}
                      </div>
                      <CardTitle className="text-xl mb-2">{step.title}</CardTitle>
                      <CardDescription>{step.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button
                    variant={status === "current" ? "default" : "outline"}
                    disabled={!canAccess}
                    className="w-full sm:w-auto"
                  >
                    {status === "completed" ? "Review" : status === "current" ? "Continue" : "Start"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
}
