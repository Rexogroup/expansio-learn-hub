import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase, Clock, CheckCircle2, AlertCircle } from "lucide-react";

export function ProjectStats() {
  const { data: stats } = useQuery({
    queryKey: ["project-stats"],
    queryFn: async () => {
      const { data: projects } = await supabase
        .from("client_projects" as any)
        .select("status, updated_at");

      const { data: tasks } = await supabase
        .from("project_tasks" as any)
        .select("status, due_date");

      const total = projects?.length || 0;
      const active = projects?.filter((p: any) => 
        ['onboarding', 'tech_setup', 'scriptwriting', 'list_building', 'waiting_warmup', 'campaign_live'].includes(p.status)
      ).length || 0;

      const now = new Date();
      const overdue = tasks?.filter((t: any) => 
        t.status !== 'completed' && 
        t.due_date && 
        new Date(t.due_date) < now
      ).length || 0;

      const completedThisMonth = projects?.filter((p: any) => {
        if (p.status !== 'scaling') return false;
        const updatedDate = p.updated_at ? new Date(p.updated_at) : null;
        if (!updatedDate) return false;
        const now = new Date();
        return updatedDate.getMonth() === now.getMonth() && 
               updatedDate.getFullYear() === now.getFullYear();
      }).length || 0;

      return { total, active, overdue, completedThisMonth };
    },
  });

  const statCards = [
    {
      title: "Total Projects",
      value: stats?.total || 0,
      icon: Briefcase,
      color: "text-blue-500",
    },
    {
      title: "Active Projects",
      value: stats?.active || 0,
      icon: Clock,
      color: "text-orange-500",
    },
    {
      title: "Overdue Tasks",
      value: stats?.overdue || 0,
      icon: AlertCircle,
      color: "text-red-500",
    },
    {
      title: "Scaled This Month",
      value: stats?.completedThisMonth || 0,
      icon: CheckCircle2,
      color: "text-green-500",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statCards.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <stat.icon className={`h-4 w-4 ${stat.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
