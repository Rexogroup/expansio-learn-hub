import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Pencil, Trash2, Plus, Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface OnboardingStep {
  id: string;
  step_number: number;
  title: string;
  description: string;
  video_url?: string;
  google_doc_url?: string;
  template_url?: string;
  step_type?: string;
  order_index: number;
}

const STEP_TYPES = [
  { value: 'document', label: 'Document/Template' },
  { value: 'video', label: 'Video' },
  { value: 'intake_form', label: 'Business Intake Form' },
];

interface UserProgress {
  id: string;
  user_id: string;
  step_number: number;
  completed: boolean;
  completed_at?: string;
  user_email?: string;
  user_name?: string;
}

export default function OnboardingManager() {
  const [steps, setSteps] = useState<OnboardingStep[]>([]);
  const [userProgress, setUserProgress] = useState<UserProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingStep, setEditingStep] = useState<OnboardingStep | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showProgress, setShowProgress] = useState(false);

  useEffect(() => {
    fetchSteps();
  }, []);

  const fetchSteps = async () => {
    try {
      const { data, error } = await supabase
        .from("onboarding_steps")
        .select("*")
        .order("order_index", { ascending: true });

      if (error) throw error;
      setSteps(data || []);
    } catch (error: any) {
      console.error("Error fetching steps:", error);
      toast.error("Failed to load onboarding steps");
    } finally {
      setLoading(false);
    }
  };

  const fetchUserProgress = async () => {
    try {
      const { data: progressData, error: progressError } = await supabase
        .from("user_onboarding_progress")
        .select("*")
        .order("created_at", { ascending: false });

      if (progressError) throw progressError;

      // Fetch profiles separately
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, email, full_name");

      if (profilesError) throw profilesError;

      // Merge the data
      const mergedData = progressData?.map(progress => {
        const profile = profilesData?.find(p => p.id === progress.user_id);
        return {
          ...progress,
          user_email: profile?.email,
          user_name: profile?.full_name
        };
      });

      setUserProgress(mergedData || []);
      setShowProgress(true);
    } catch (error: any) {
      console.error("Error fetching user progress:", error);
      toast.error("Failed to load user progress");
    }
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    try {
      const stepData = {
        step_number: parseInt(formData.get("step_number") as string),
        title: formData.get("title") as string,
        description: formData.get("description") as string,
        step_type: formData.get("step_type") as string || 'document',
        video_url: formData.get("video_url") as string || null,
        google_doc_url: formData.get("google_doc_url") as string || null,
        template_url: formData.get("template_url") as string || null,
        order_index: parseInt(formData.get("order_index") as string),
      };

      if (editingStep) {
        const { error } = await supabase
          .from("onboarding_steps")
          .update(stepData)
          .eq("id", editingStep.id);

        if (error) throw error;
        toast.success("Step updated successfully");
      } else {
        const { error } = await supabase
          .from("onboarding_steps")
          .insert([stepData]);

        if (error) throw error;
        toast.success("Step created successfully");
      }

      setIsDialogOpen(false);
      setEditingStep(null);
      fetchSteps();
    } catch (error: any) {
      console.error("Error saving step:", error);
      toast.error("Failed to save step");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this step?")) return;

    try {
      const { error } = await supabase
        .from("onboarding_steps")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Step deleted successfully");
      fetchSteps();
    } catch (error: any) {
      console.error("Error deleting step:", error);
      toast.error("Failed to delete step");
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Onboarding Steps</CardTitle>
              <CardDescription>Manage the onboarding process steps</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={fetchUserProgress}
              >
                <Users className="w-4 h-4 mr-2" />
                View User Progress
              </Button>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => setEditingStep(null)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Step
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editingStep ? "Edit Step" : "Add New Step"}
                    </DialogTitle>
                    <DialogDescription>
                      Configure the onboarding step details
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSave} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="step_number">Step Number</Label>
                        <Input
                          id="step_number"
                          name="step_number"
                          type="number"
                          defaultValue={editingStep?.step_number}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="order_index">Order Index</Label>
                        <Input
                          id="order_index"
                          name="order_index"
                          type="number"
                          defaultValue={editingStep?.order_index}
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="title">Title</Label>
                      <Input
                        id="title"
                        name="title"
                        defaultValue={editingStep?.title}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        name="description"
                        defaultValue={editingStep?.description}
                        rows={3}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="step_type">Step Type</Label>
                      <Select name="step_type" defaultValue={editingStep?.step_type || 'document'}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select step type" />
                        </SelectTrigger>
                        <SelectContent>
                          {STEP_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground mt-1">
                        "Business Intake Form" will display an in-platform form instead of external links
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="video_url">Video URL (optional)</Label>
                      <Input
                        id="video_url"
                        name="video_url"
                        defaultValue={editingStep?.video_url}
                      />
                    </div>

                    <div>
                      <Label htmlFor="google_doc_url">Google Doc URL (optional)</Label>
                      <Input
                        id="google_doc_url"
                        name="google_doc_url"
                        defaultValue={editingStep?.google_doc_url}
                      />
                    </div>

                    <div>
                      <Label htmlFor="template_url">Template URL (optional)</Label>
                      <Input
                        id="template_url"
                        name="template_url"
                        defaultValue={editingStep?.template_url}
                      />
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsDialogOpen(false);
                          setEditingStep(null);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button type="submit">
                        {editingStep ? "Update" : "Create"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Step</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {steps.map((step) => (
                <TableRow key={step.id}>
                  <TableCell className="font-medium">{step.step_number}</TableCell>
                  <TableCell>{step.title}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      step.step_type === 'intake_form' 
                        ? 'bg-primary/10 text-primary' 
                        : step.step_type === 'video' 
                        ? 'bg-blue-500/10 text-blue-500'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {STEP_TYPES.find(t => t.value === step.step_type)?.label || 'Document'}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-md truncate">{step.description}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingStep(step);
                          setIsDialogOpen(true);
                        }}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(step.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {showProgress && (
        <Card>
          <CardHeader>
            <CardTitle>User Progress</CardTitle>
            <CardDescription>Track user onboarding completion</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Step</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Completed At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userProgress.map((progress) => (
                  <TableRow key={progress.id}>
                    <TableCell>{progress.user_name || "Unknown"}</TableCell>
                    <TableCell>{progress.user_email || "Unknown"}</TableCell>
                    <TableCell>Step {progress.step_number}</TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          progress.completed
                            ? "bg-green-500/10 text-green-500"
                            : "bg-yellow-500/10 text-yellow-500"
                        }`}
                      >
                        {progress.completed ? "Completed" : "In Progress"}
                      </span>
                    </TableCell>
                    <TableCell>
                      {progress.completed_at
                        ? new Date(progress.completed_at).toLocaleDateString()
                        : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
