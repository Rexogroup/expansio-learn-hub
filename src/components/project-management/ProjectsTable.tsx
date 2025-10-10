import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

interface ProjectsTableProps {
  onProjectClick: (projectId: string) => void;
}

const statusColors = {
  onboarding: "bg-blue-500",
  in_progress: "bg-yellow-500",
  on_hold: "bg-gray-500",
  completed: "bg-green-500",
  cancelled: "bg-red-500",
};

const priorityColors = {
  low: "bg-slate-500",
  medium: "bg-blue-500",
  high: "bg-orange-500",
  urgent: "bg-red-500",
};

export function ProjectsTable({ onProjectClick }: ProjectsTableProps) {
  const { data: projects, isLoading } = useQuery({
    queryKey: ["client-projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_projects" as any)
        .select(`
          *,
          assigned_to_profile:profiles(full_name),
          tasks:project_tasks(status)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as any[];
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  const calculateProgress = (tasks: any[]) => {
    if (!tasks || tasks.length === 0) return 0;
    const completed = tasks.filter(t => t.status === 'completed').length;
    return Math.round((completed / tasks.length) * 100);
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Client Name</TableHead>
            <TableHead>Company</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Assigned To</TableHead>
            <TableHead>Progress</TableHead>
            <TableHead>Target Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {projects?.map((project) => (
            <TableRow
              key={project.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => onProjectClick(project.id)}
            >
              <TableCell className="font-medium">{project.client_name}</TableCell>
              <TableCell>{project.company || "-"}</TableCell>
              <TableCell>
                <Badge className={statusColors[project.status as keyof typeof statusColors]}>
                  {project.status.replace("_", " ")}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge className={priorityColors[project.priority as keyof typeof priorityColors]}>
                  {project.priority}
                </Badge>
              </TableCell>
              <TableCell>
                {project.assigned_to_profile?.full_name || "Unassigned"}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${calculateProgress(project.tasks)}%` }}
                    />
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {calculateProgress(project.tasks)}%
                  </span>
                </div>
              </TableCell>
              <TableCell>
                {project.target_date
                  ? format(new Date(project.target_date), "MMM d, yyyy")
                  : "-"}
              </TableCell>
            </TableRow>
          ))}
          {!projects || projects.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground">
                No projects found
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
    </div>
  );
}
