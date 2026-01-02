import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { GapSelling } from "@/pages/SalesCoach";
import { TrendingUp, ArrowRight, AlertTriangle, MessageSquare } from "lucide-react";

interface GapSellingCardProps {
  data: GapSelling;
}

export const GapSellingCard = ({ data }: GapSellingCardProps) => {
  const getScoreColor = (score: number) => {
    if (score >= 8) return "text-green-500";
    if (score >= 6) return "text-yellow-500";
    return "text-red-500";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          GAP Selling Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current vs Desired State */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-4 bg-muted/50 rounded-lg">
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Current State</h4>
            <p className="text-sm">{data.current_state || 'Not identified'}</p>
          </div>
          <div className="p-4 bg-primary/10 rounded-lg">
            <h4 className="text-sm font-medium text-primary mb-2">Desired State</h4>
            <p className="text-sm">{data.desired_state || 'Not identified'}</p>
          </div>
        </div>

        {/* Gap Articulation Score */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium">Gap Articulation Score</h4>
            <span className={`text-xl font-bold ${getScoreColor(data.gap_articulation_score)}`}>
              {data.gap_articulation_score}/10
            </span>
          </div>
          <Progress value={data.gap_articulation_score * 10} className="h-2" />
        </div>

        {/* Feedback */}
        {data.gap_feedback && (
          <div>
            <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              Coaching Feedback
            </h4>
            <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
              {data.gap_feedback}
            </p>
          </div>
        )}

        {/* Missed Opportunities */}
        {data.missed_opportunities && data.missed_opportunities.length > 0 && (
          <div>
            <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              Missed Opportunities
            </h4>
            <ul className="space-y-2">
              {data.missed_opportunities.map((opportunity, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <ArrowRight className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                  {opportunity}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
