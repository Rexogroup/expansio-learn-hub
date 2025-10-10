import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Plus, Calendar } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface TaskListProps {
  projectId: string;
}

const statusColors = {
  pending: "bg-gray-500",
  in_progress: "bg-blue-500",
  completed: "bg-green-500",
  blocked: "bg-red-500",
};

export function TaskList({ projectId }: TaskListProps) {
  const queryClient = useQueryClient();

  const { data: tasks } = useQuery({
    queryKey: ["project-tasks", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_tasks" as any)
        .select("*, assigned_to_profile:profiles!project_tasks_assigned_to_fkey(full_name)")
        .eq("project_id", projectId)
        .order("order_index");

      if (error) throw error;
      return data as any[];
    },
  });

  const toggleTaskMutation = useMutation({
    mutationFn: async ({ taskId, completed }: { taskId: string; completed: boolean }) => {
      const { error } = await supabase
        .from("project_tasks" as any)
        .update({
          status: completed ? "completed" : "pending",
          completed_at: completed ? new Date().toISOString() : null,
        })
        .eq("id", taskId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-tasks", projectId] });
      queryClient.invalidateQueries({ queryKey: ["client-projects"] });
      toast.success("Task updated");
    },
  });

  const isOverdue = (dueDate: string | null, status: string) => {
    if (!dueDate || status === "completed") return false;
    return new Date(dueDate) < new Date();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">Tasks</h3>
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add Task
        </Button>
      </div>

      <div className="space-y-2">
        {tasks?.map((task) => (
          <div
            key={task.id}
            className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50"
          >
            <Checkbox
              checked={task.status === "completed"}
              onCheckedChange={(checked) =>
                toggleTaskMutation.mutate({
                  taskId: task.id,
                  completed: !!checked,
                })
              }
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span
                  className={
                    task.status === "completed"
                      ? "line-through text-muted-foreground"
                      : ""
                  }
                >
                  {task.title}
                </span>
                <Badge className={statusColors[task.status as keyof typeof statusColors]}>
                  {task.status.replace("_", " ")}
                </Badge>
                {task.task_type !== "custom" && (
                  <Badge variant="outline">{task.task_type.replace("_", " ")}</Badge>
                )}
              </div>
              {task.description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {task.description}
                </p>
              )}
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                {task.assigned_to_profile && (
                  <span>Assigned to: {task.assigned_to_profile.full_name}</span>
                )}
                {task.due_date && (
                  <span
                    className={
                      isOverdue(task.due_date, task.status)
                        ? "text-red-500 font-medium"
                        : ""
                    }
                  >
                    <Calendar className="inline h-3 w-3 mr-1" />
                    {format(new Date(task.due_date), "MMM d, yyyy")}
                    {isOverdue(task.due_date, task.status) && " (Overdue)"}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
        {!tasks || tasks.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No tasks yet. Click "Add Task" to create one.
          </p>
        ) : null}
      </div>
    </div>
  );
}
