import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

interface FormData {
  fullName: string;
  company: string;
  phone: string;
  email: string;
}

export default function OnboardingStep() {
  const { stepNumber } = useParams<{ stepNumber: string }>();
  const [step, setStep] = useState<OnboardingStep | null>(null);
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [videoWatched, setVideoWatched] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    fullName: "",
    company: "",
    phone: "",
    email: ""
  });
  const videoRef = useRef<HTMLVideoElement>(null);
  const navigate = useNavigate();

  const currentStepNumber = parseInt(stepNumber || "1");

  useEffect(() => {
    fetchStepData();
  }, [stepNumber]);

  useEffect(() => {
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

      // Check if user can access this step
      if (currentStepNumber > 1) {
        const { data: previousProgress } = await supabase
          .from("user_onboarding_progress")
          .select("completed")
          .eq("user_id", user.id)
          .eq("step_number", currentStepNumber - 1)
          .single();

        if (!previousProgress?.completed) {
          toast.error("Please complete the previous step first");
          navigate("/onboarding");
          return;
        }
      }

      // Fetch step details
      const { data: stepData, error: stepError } = await supabase
        .from("onboarding_steps")
        .select("*")
        .eq("step_number", currentStepNumber)
        .single();

      if (stepError) throw stepError;
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
        if (currentStepNumber === 2) {
          setVideoWatched(true);
        }
        if (progressData.notes && currentStepNumber === 3) {
          try {
            const savedData = JSON.parse(progressData.notes);
            setFormData(savedData);
          } catch (e) {
            console.error("Failed to parse saved form data");
          }
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

      let notes = null;
      if (currentStepNumber === 3) {
        // Validate form data for step 3
        if (!formData.fullName || !formData.email) {
          toast.error("Please fill in all required fields");
          setSaving(false);
          return;
        }
        notes = JSON.stringify(formData);
      }

      // Upsert progress
      const { error } = await supabase
        .from("user_onboarding_progress")
        .upsert({
          user_id: user.id,
          step_number: currentStepNumber,
          completed: true,
          completed_at: new Date().toISOString(),
          notes
        }, {
          onConflict: "user_id,step_number"
        });

      if (error) throw error;

      toast.success(`Step ${currentStepNumber} completed!`);
      setCompleted(true);

      // Navigate to next step or completion
      setTimeout(() => {
        if (currentStepNumber < 4) {
          navigate(`/onboarding/step/${currentStepNumber + 1}`);
        } else {
          navigate("/courses");
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
              Step {step.step_number} of 4
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
            {/* Step 1: Google Doc */}
            {step.step_number === 1 && (
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

                {step.google_doc_url && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => window.open(step.google_doc_url, "_blank")}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open Google Doc Template
                  </Button>
                )}

                <div className="flex items-start space-x-2 p-4 border rounded-lg">
                  <Checkbox
                    id="step1-complete"
                    checked={completed}
                    onCheckedChange={(checked) => {
                      if (checked && !completed) {
                        markStepComplete();
                      }
                    }}
                    disabled={completed || saving}
                  />
                  <label
                    htmlFor="step1-complete"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    I have completed the ICP template
                  </label>
                </div>
              </div>
            )}

            {/* Step 2: Video */}
            {step.step_number === 2 && (
              <div className="space-y-4">
                <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                  {step.video_url ? (
                    <video
                      ref={videoRef}
                      controls
                      className="w-full h-full rounded-lg"
                      src={step.video_url}
                    >
                      Your browser does not support the video tag.
                    </video>
                  ) : (
                    <p className="text-muted-foreground">Video will be available soon</p>
                  )}
                </div>

                <div className="flex items-start space-x-2 p-4 border rounded-lg">
                  <Checkbox
                    id="step2-complete"
                    checked={completed}
                    onCheckedChange={(checked) => {
                      if (checked && !completed && (videoWatched || !step.video_url)) {
                        markStepComplete();
                      }
                    }}
                    disabled={completed || saving || (!videoWatched && !!step.video_url)}
                  />
                  <label
                    htmlFor="step2-complete"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {videoWatched || !step.video_url
                      ? "I have watched the video"
                      : "Watch at least 90% of the video to continue"}
                  </label>
                </div>
              </div>
            )}

            {/* Step 3: Form */}
            {step.step_number === 3 && (
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg mb-4">
                  <h3 className="font-semibold mb-2">Instructions:</h3>
                  <p className="text-sm">
                    Fill in your personal information below. This data will be used to customize
                    the appointment setting templates for your campaigns.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="fullName">Full Name *</Label>
                    <Input
                      id="fullName"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      placeholder="John Doe"
                      disabled={completed}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="john@example.com"
                      disabled={completed}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="company">Company</Label>
                    <Input
                      id="company"
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      placeholder="Company Name"
                      disabled={completed}
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+1 (555) 123-4567"
                      disabled={completed}
                    />
                  </div>
                </div>

                <Button
                  onClick={markStepComplete}
                  disabled={completed || saving}
                  className="w-full"
                >
                  {saving ? "Saving..." : completed ? "Completed" : "Submit & Continue"}
                  {!completed && <ArrowRight className="w-4 h-4 ml-2" />}
                </Button>
              </div>
            )}

            {/* Step 4: Completion */}
            {step.step_number === 4 && (
              <div className="space-y-6 text-center py-8">
                <div className="flex justify-center">
                  <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center">
                    <CheckCircle2 className="w-12 h-12 text-green-500" />
                  </div>
                </div>

                <div>
                  <h2 className="text-2xl font-bold mb-2">Congratulations!</h2>
                  <p className="text-muted-foreground">
                    You have successfully completed the onboarding process.
                    You now have full access to all platform resources.
                  </p>
                </div>

                <Button
                  onClick={() => {
                    markStepComplete();
                    navigate("/courses");
                  }}
                  size="lg"
                  disabled={saving}
                >
                  Access Resources
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        {currentStepNumber < 4 && completed && (
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
