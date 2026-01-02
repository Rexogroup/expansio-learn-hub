import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Accordion } from "@/components/ui/accordion";
import { AnalysisResult } from "@/pages/SalesCoach";
import { ObjectionCard } from "./ObjectionCard";
import { CRMOverviewCard } from "./CRMOverviewCard";
import { DealAnalysisCard } from "./DealAnalysisCard";
import { GapSellingCard } from "./GapSellingCard";
import { 
  Trophy, 
  Target, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight,
  RotateCcw,
  TrendingUp
} from "lucide-react";

interface CallAnalysisResultProps {
  result: AnalysisResult;
  analysisId: string | null;
  onNewAnalysis: () => void;
}

export const CallAnalysisResult = ({ result, analysisId, onNewAnalysis }: CallAnalysisResultProps) => {
  const getScoreColor = (score: number) => {
    if (score >= 8) return "text-green-500";
    if (score >= 6) return "text-yellow-500";
    return "text-red-500";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 9) return "Excellent";
    if (score >= 8) return "Great";
    if (score >= 7) return "Good";
    if (score >= 6) return "Average";
    if (score >= 5) return "Below Average";
    return "Needs Work";
  };

  return (
    <div className="space-y-6">
      {/* Overall Score Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Call Analysis Complete
              </CardTitle>
              <CardDescription>{result.summary}</CardDescription>
            </div>
            <Button variant="outline" onClick={onNewAnalysis}>
              <RotateCcw className="mr-2 h-4 w-4" />
              New Analysis
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-8">
            <div className="text-center">
              <div className={`text-5xl font-bold ${getScoreColor(result.overall_score)}`}>
                {result.overall_score}/10
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {getScoreLabel(result.overall_score)}
              </p>
            </div>
            <div className="flex-1 min-w-[200px] space-y-2">
              <div className="flex justify-between text-sm">
                <span>Overall Performance</span>
                <span>{result.overall_score * 10}%</span>
              </div>
              <Progress value={result.overall_score * 10} className="h-3" />
            </div>
            <div className="text-center px-4 border-l">
              <div className="text-3xl font-bold text-foreground">
                {result.objections?.length || 0}
              </div>
              <p className="text-sm text-muted-foreground">Objections Found</p>
            </div>
            {result.deal_analysis?.close_confidence_percent !== undefined && (
              <div className="text-center px-4 border-l">
                <div className="text-3xl font-bold text-foreground">
                  {result.deal_analysis.close_confidence_percent}%
                </div>
                <p className="text-sm text-muted-foreground">Close Confidence</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* CRM Overview */}
      {result.crm_overview && (
        <CRMOverviewCard data={result.crm_overview} />
      )}

      {/* Deal Analysis & GAP Selling */}
      <div className="grid md:grid-cols-2 gap-6">
        {result.deal_analysis && (
          <DealAnalysisCard data={result.deal_analysis} />
        )}
        {result.gap_selling && (
          <GapSellingCard data={result.gap_selling} />
        )}
      </div>

      {/* Strengths and Improvements */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
              Strengths
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {result.strengths?.map((strength, index) => (
                <li key={index} className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{strength}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-600">
              <TrendingUp className="h-5 w-5" />
              Areas to Improve
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {result.improvements?.map((improvement, index) => (
                <li key={index} className="flex items-start gap-2">
                  <Target className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{improvement}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Objections Analysis */}
      {result.objections && result.objections.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Objection Analysis
            </CardTitle>
            <CardDescription>
              Detailed breakdown of each objection and how to improve
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="multiple" className="space-y-2">
              {result.objections.map((objection, index) => (
                <ObjectionCard 
                  key={index} 
                  objection={objection} 
                  index={index}
                />
              ))}
            </Accordion>
          </CardContent>
        </Card>
      )}

      {/* Action Items */}
      {result.action_items && result.action_items.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowRight className="h-5 w-5" />
              Action Items
            </CardTitle>
            <CardDescription>
              Specific steps to improve your next call
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {result.action_items.map((item, index) => (
                <li key={index} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <Badge variant="outline" className="mt-0.5">
                    {index + 1}
                  </Badge>
                  <span className="text-sm">{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
