import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase, Clock, CheckCircle2, AlertCircle } from "lucide-react";

export function ProjectStats() {
  const { data: stats } = useQuery({
    queryKey: ["project-stats"],
    queryFn: async () => {
      const { data: projects } = await supabase
        .from("client_projects")
        .select("status");

      const { data: tasks } = await supabase
        .from("project_tasks")
        .select("status, due_date");

      const total = projects?.length || 0;
      const active = projects?.filter(p => 
        p.status === 'onboarding' || p.status === 'in_progress'
      ).length || 0;

      const now = new Date();
      const overdue = tasks?.filter(t => 
        t.status !== 'completed' && 
        t.due_date && 
        new Date(t.due_date) < now
      ).length || 0;

      const completedThisMonth = projects?.filter(p => {
        if (p.status !== 'completed') return false;
        return true;
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
      title: "Completed This Month",
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
