import { Brain, Mail, Phone, Target } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface BrainSummaryProps {
  scriptsCount: number;
  replyPatternsCount: number;
  objectionsCount: number;
  leadsAnalyzed: number;
}

export const BrainSummary = ({
  scriptsCount,
  replyPatternsCount,
  objectionsCount,
  leadsAnalyzed,
}: BrainSummaryProps) => {
  const summaryItems = [
    {
      icon: Brain,
      value: scriptsCount,
      label: "Scripts Captured",
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    {
      icon: Mail,
      value: replyPatternsCount,
      label: "Reply Patterns",
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      icon: Phone,
      value: objectionsCount,
      label: "Objections Clustered",
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
    },
    {
      icon: Target,
      value: leadsAnalyzed,
      label: "Calls Analyzed",
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {summaryItems.map((item) => (
        <Card key={item.label} className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className={`rounded-full p-2 ${item.bgColor}`}>
              <item.icon className={`h-5 w-5 ${item.color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold">{item.value}</p>
              <p className="text-xs text-muted-foreground">{item.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
