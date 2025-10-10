import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ActivityLogProps {
  projectId: string;
}

export function ActivityLog({ projectId }: ActivityLogProps) {
  const { data: activities } = useQuery({
    queryKey: ["project-activity", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_activity_log" as any)
        .select("*, user:profiles!project_activity_log_user_id_fkey(full_name)")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as any[];
    },
  });

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Activity Log</h3>
      <ScrollArea className="h-[400px] pr-4">
        <div className="space-y-4">
          {activities?.map((activity: any) => (
            <div key={activity.id} className="flex gap-3">
              <div className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-primary" />
              <div className="flex-1">
                <p className="text-sm">
                  <span className="font-medium">{activity.user?.full_name || "Unknown"}</span>
                  {" "}
                  {activity.description}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {format(new Date(activity.created_at), "MMM d, yyyy 'at' h:mm a")}
                </p>
              </div>
            </div>
          ))}
          {!activities || activities.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No activity yet
            </p>
          ) : null}
        </div>
      </ScrollArea>
    </div>
  );
}
