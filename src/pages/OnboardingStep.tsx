import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, CheckCircle2, ExternalLink } from "lucide-react";
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


export default function OnboardingStep() {
  const { stepNumber } = useParams<{ stepNumber: string }>();
  const [step, setStep] = useState<OnboardingStep | null>(null);
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [videoWatched, setVideoWatched] = useState(false);
  const [totalSteps, setTotalSteps] = useState(4);
  const videoRef = useRef<HTMLVideoElement>(null);
  const navigate = useNavigate();

  const currentStepNumber = parseInt(stepNumber || "0");

  useEffect(() => {
    fetchStepData();
  }, [stepNumber]);

  useEffect(() => {
    // For Loom videos (iframe), enable checkbox after 5 seconds of viewing
    if (step?.video_url && step.video_url.includes('loom.com')) {
      const timer = setTimeout(() => {
        setVideoWatched(true);
      }, 5000);
      return () => clearTimeout(timer);
    }
    
    // For direct video files, track 90% watch progress
    if (videoRef.current && step?.video_url) {
      const video = videoRef.current;
      
      const handleTimeUpdate = () => {
        const watchPercentage = (video.currentTime / video.duration) * 100;
        if (watchPercentage >= 90) {
          setVideoWatched(true);
        }
      };

      video.addEventListener("timeupdate", handleTimeUpdate);
      return () => video.removeEventListener("timeupdate", handleTimeUpdate);
    }
  }, [step]);

  const fetchStepData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      // Fetch total number of steps
      const { count } = await supabase
        .from("onboarding_steps")
        .select("*", { count: 'exact', head: true });
      setTotalSteps(count || 4);

      // Check if user can access this step (step 0 is always accessible)
      if (currentStepNumber > 0) {
        const { data: allProgress } = await supabase
          .from("user_onboarding_progress")
          .select("completed, step_number")
          .eq("user_id", user.id);
        
        const allCompleted = allProgress?.length === (count || 4) && allProgress.every(p => p.completed);
        
        if (!allCompleted) {
          const previousProgress = allProgress?.find(p => p.step_number === currentStepNumber - 1);
          const hasLaterProgress = allProgress?.some(p => p.step_number > currentStepNumber && p.completed);
          
          if (!previousProgress?.completed && !hasLaterProgress) {
            toast.error("Please complete the previous step first");
            navigate("/onboarding");
            return;
          }
        }
      }

      // Fetch step details
      const { data: stepData, error: stepError } = await supabase
        .from("onboarding_steps")
        .select("*")
        .eq("step_number", currentStepNumber)
        .maybeSingle();

      if (stepError) throw stepError;
      if (!stepData) {
        toast.error("Step not found");
        navigate("/onboarding");
        return;
      }
      setStep(stepData);

      // Check if step is already completed
      const { data: progressData } = await supabase
        .from("user_onboarding_progress")
        .select("*")
        .eq("user_id", user.id)
        .eq("step_number", currentStepNumber)
        .maybeSingle();

      if (progressData?.completed) {
        setCompleted(true);
        if (stepData.video_url) {
          setVideoWatched(true);
        }
      }
    } catch (error: any) {
      console.error("Error fetching step data:", error);
      toast.error("Failed to load step data");
      navigate("/onboarding");
    } finally {
      setLoading(false);
    }
  };

  const markStepComplete = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Upsert progress
      const { error } = await supabase
        .from("user_onboarding_progress")
        .upsert({
          user_id: user.id,
          step_number: currentStepNumber,
          completed: true,
          completed_at: new Date().toISOString()
        }, {
          onConflict: "user_id,step_number"
        });

      if (error) throw error;

      toast.success(`Step ${currentStepNumber + 1} completed!`);
      setCompleted(true);

      // Navigate to next step if not the last one
      setTimeout(() => {
        if (currentStepNumber < totalSteps - 1) {
          navigate(`/onboarding/step/${currentStepNumber + 1}`);
        } else {
          navigate("/onboarding");
        }
      }, 1000);
    } catch (error: any) {
      console.error("Error marking step complete:", error);
      toast.error("Failed to save progress");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading step...</p>
      </div>
    );
  }

  if (!step) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Step not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Button
          variant="ghost"
          onClick={() => navigate("/onboarding")}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Overview
        </Button>

        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-semibold text-muted-foreground">
              Step {step.step_number + 1} of {totalSteps}
            </span>
            {completed && (
              <span className="text-xs px-2 py-1 rounded-full bg-green-500/10 text-green-500 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Completed
              </span>
            )}
          </div>
          <h1 className="text-4xl font-bold mb-2">{step.title}</h1>
          <p className="text-muted-foreground">{step.description}</p>
        </div>

        <Card className="mb-6">
          <CardContent className="pt-6">
            {/* Dynamic Google Doc Section */}
            {step.google_doc_url && !step.video_url && !step.template_url && (
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <h3 className="font-semibold mb-2">Instructions:</h3>
                  <ol className="list-decimal list-inside space-y-2 text-sm">
                    <li>Click the button below to open the Google Doc template</li>
                    <li>Make a copy of the template to your Google Drive</li>
                    <li>Fill in your Ideal Customer Profile details and pain points</li>
                    <li>Return here and mark the step as complete</li>
                  </ol>
                </div>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => window.open(step.google_doc_url, "_blank")}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open Google Doc Template
                </Button>

                <div className="flex items-start space-x-2 p-4 border rounded-lg">
                  <Checkbox
                    id="step-complete"
                    checked={completed}
                    onCheckedChange={(checked) => {
                      if (checked && !completed) {
                        markStepComplete();
                      }
                    }}
                    disabled={completed || saving}
                  />
                  <label
                    htmlFor="step-complete"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    I have completed this step
                  </label>
                </div>
              </div>
            )}

            {/* Dynamic Video Section */}
            {step.video_url && (
              <div className="space-y-4">
                <div className="aspect-video bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                  {step.video_url.includes('loom.com') ? (
                    <iframe
                      src={step.video_url.replace('/share/', '/embed/')}
                      className="w-full h-full rounded-lg"
                      allow="autoplay; fullscreen; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <video
                      ref={videoRef}
                      controls
                      className="w-full h-full rounded-lg"
                      src={step.video_url}
                    >
                      Your browser does not support the video tag.
                    </video>
                  )}
                </div>

                <div className="flex items-start space-x-2 p-4 border rounded-lg">
                  <Checkbox
                    id="step-complete"
                    checked={completed}
                    onCheckedChange={(checked) => {
                      if (checked && !completed && videoWatched) {
                        markStepComplete();
                      }
                    }}
                    disabled={completed || saving || !videoWatched}
                  />
                  <label
                    htmlFor="step-complete"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {videoWatched
                      ? "I have watched the video"
                      : step.video_url.includes('loom.com')
                      ? "Watch the video for a few seconds to continue"
                      : "Watch at least 90% of the video to continue"}
                  </label>
                </div>
              </div>
            )}

            {/* Dynamic Template Section */}
            {step.template_url && !step.video_url && !step.google_doc_url && (
              <div className="space-y-4">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => window.open(step.template_url, "_blank")}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open Template
                </Button>

                <div className="flex items-start space-x-2 p-4 border rounded-lg">
                  <Checkbox
                    id="step-complete"
                    checked={completed}
                    onCheckedChange={(checked) => {
                      if (checked && !completed) {
                        markStepComplete();
                      }
                    }}
                    disabled={completed || saving}
                  />
                  <label
                    htmlFor="step-complete"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    I have reviewed the templates
                  </label>
                </div>
              </div>
            )}

            {/* Completion Section - for last step or steps without specific resources */}
            {(step.step_number === totalSteps - 1 || (!step.video_url && !step.google_doc_url && !step.template_url)) && (
              <div className="space-y-6 text-center py-8">
                <div className="flex justify-center">
                  <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center">
                    <CheckCircle2 className="w-12 h-12 text-green-500" />
                  </div>
                </div>

                <div>
                  <h2 className="text-2xl font-bold mb-2">
                    {step.step_number === totalSteps - 1 ? "Congratulations!" : "Complete This Step"}
                  </h2>
                  <p className="text-muted-foreground">
                    {step.step_number === totalSteps - 1
                      ? "You have successfully completed the onboarding process. You now have full access to all platform resources."
                      : "Mark this step as complete to continue."}
                  </p>
                </div>

                <Button
                  onClick={() => {
                    markStepComplete();
                    if (step.step_number === totalSteps - 1) {
                      navigate("/courses");
                    }
                  }}
                  size="lg"
                  disabled={saving}
                >
                  {step.step_number === totalSteps - 1 ? "Access Resources" : "Mark as Complete"}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        {currentStepNumber < totalSteps - 1 && completed && (
          <div className="flex justify-end">
            <Button onClick={() => navigate(`/onboarding/step/${currentStepNumber + 1}`)}>
              Next Step
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
