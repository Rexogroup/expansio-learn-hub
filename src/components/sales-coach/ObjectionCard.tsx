import { AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { ObjectionAnalysis } from "@/pages/SalesCoach";
import { MessageSquare, Lightbulb, BookOpen } from "lucide-react";

interface ObjectionCardProps {
  objection: ObjectionAnalysis;
  index: number;
}

export const ObjectionCard = ({ objection, index }: ObjectionCardProps) => {
  const getScoreColor = (score: number) => {
    if (score >= 8) return "bg-green-100 text-green-800 border-green-200";
    if (score >= 6) return "bg-yellow-100 text-yellow-800 border-yellow-200";
    return "bg-red-100 text-red-800 border-red-200";
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'Price/Budget': 'bg-emerald-100 text-emerald-800',
      'Timing': 'bg-blue-100 text-blue-800',
      'Competition': 'bg-purple-100 text-purple-800',
      'Authority': 'bg-orange-100 text-orange-800',
      'Need': 'bg-pink-100 text-pink-800',
      'Trust': 'bg-cyan-100 text-cyan-800',
      'Stall': 'bg-amber-100 text-amber-800',
      'Other': 'bg-gray-100 text-gray-800',
    };
    return colors[category] || colors['Other'];
  };

  return (
    <AccordionItem value={`objection-${index}`} className="border rounded-lg px-4">
      <AccordionTrigger className="hover:no-underline">
        <div className="flex items-center gap-3 text-left">
          <Badge className={getCategoryColor(objection.category)}>
            {objection.category}
          </Badge>
          <span className="text-sm font-medium flex-1 line-clamp-1">
            "{objection.objection_text}"
          </span>
          <Badge variant="outline" className={getScoreColor(objection.score)}>
            {objection.score}/10
          </Badge>
        </div>
      </AccordionTrigger>
      <AccordionContent className="space-y-4 pt-2">
        {/* What prospect said */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <MessageSquare className="h-4 w-4" />
            Prospect's Objection
          </div>
          <p className="text-sm bg-muted/50 p-3 rounded-lg italic">
            "{objection.objection_text}"
          </p>
        </div>

        {/* What user said */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <MessageSquare className="h-4 w-4" />
            Your Response
          </div>
          <p className="text-sm bg-muted/50 p-3 rounded-lg">
            "{objection.user_response}"
          </p>
        </div>

        {/* Suggested response */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-green-600">
            <Lightbulb className="h-4 w-4" />
            Suggested Response
          </div>
          <p className="text-sm bg-green-50 dark:bg-green-950/30 p-3 rounded-lg border border-green-200 dark:border-green-800">
            "{objection.suggested_response}"
          </p>
        </div>

        {/* Coaching notes */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-blue-600">
            <BookOpen className="h-4 w-4" />
            Coaching Notes
          </div>
          <p className="text-sm text-muted-foreground bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
            {objection.coaching_notes}
          </p>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
};
