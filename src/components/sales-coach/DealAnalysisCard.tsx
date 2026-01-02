import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { DealAnalysis } from "@/pages/SalesCoach";
import { Target, CheckCircle2, XCircle, FileText, Lightbulb, Quote } from "lucide-react";

interface DealAnalysisCardProps {
  data: DealAnalysis;
}

export const DealAnalysisCard = ({ data }: DealAnalysisCardProps) => {
  const getConfidenceColor = (percent: number) => {
    if (percent >= 70) return "text-green-500";
    if (percent >= 40) return "text-yellow-500";
    return "text-red-500";
  };

  const getConfidenceLabel = (percent: number) => {
    if (percent >= 80) return "Very Likely";
    if (percent >= 60) return "Likely";
    if (percent >= 40) return "Possible";
    if (percent >= 20) return "Unlikely";
    return "Very Unlikely";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Deal Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Close Confidence */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium">Close Confidence</h4>
            <span className={`text-2xl font-bold ${getConfidenceColor(data.close_confidence_percent)}`}>
              {data.close_confidence_percent}%
            </span>
          </div>
          <Progress value={data.close_confidence_percent} className="h-3" />
          <p className="text-xs text-muted-foreground mt-1">
            {getConfidenceLabel(data.close_confidence_percent)}
          </p>
        </div>

        {/* Verbal Agreement */}
        <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
          {data.verbal_agreement ? (
            <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
          ) : (
            <XCircle className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
          )}
          <div>
            <p className="font-medium">
              Verbal Agreement: {data.verbal_agreement ? 'Yes' : 'No'}
            </p>
            {data.verbal_agreement && data.verbal_agreement_quote && (
              <div className="flex items-start gap-2 mt-2 text-sm text-muted-foreground">
                <Quote className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <p className="italic">"{data.verbal_agreement_quote}"</p>
              </div>
            )}
          </div>
        </div>

        {/* Lead's Actual Needs */}
        {data.lead_needs && data.lead_needs.length > 0 && (
          <div>
            <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
              <Lightbulb className="h-4 w-4 text-muted-foreground" />
              Lead's Actual Needs
            </h4>
            <ul className="space-y-1">
              {data.lead_needs.map((need, idx) => (
                <li key={idx} className="text-sm flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  {need}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Convincing Factors */}
        {data.convincing_factors && data.convincing_factors.length > 0 && (
          <div>
            <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              What Convinced Them
            </h4>
            <div className="flex flex-wrap gap-2">
              {data.convincing_factors.map((factor, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs">
                  {factor}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Proposal Key Points */}
        {data.proposal_key_points && data.proposal_key_points.length > 0 && (
          <div>
            <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Proposal Must Include
            </h4>
            <ol className="space-y-2">
              {data.proposal_key_points.map((point, idx) => (
                <li key={idx} className="flex items-start gap-3 p-2 bg-muted/30 rounded">
                  <Badge variant="outline" className="mt-0.5 flex-shrink-0">
                    {idx + 1}
                  </Badge>
                  <span className="text-sm">{point}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
