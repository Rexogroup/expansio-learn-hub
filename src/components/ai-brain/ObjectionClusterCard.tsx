import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, MessageCircle, Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface ObjectionClusterCardProps {
  clusterName: string;
  category?: string;
  occurrences: number;
  avgScore: number;
  summary?: string;
  bestResponse?: string;
  rebuttalFramework?: string;
  difficulty?: string;
}

export const ObjectionClusterCard = ({
  clusterName,
  category,
  occurrences,
  avgScore,
  summary,
  bestResponse,
  rebuttalFramework,
  difficulty,
}: ObjectionClusterCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const getScoreColor = (score: number) => {
    if (score >= 7) return { text: "text-emerald-500", bg: "bg-emerald-500", label: "Mastered" };
    if (score >= 5) return { text: "text-amber-500", bg: "bg-amber-500", label: "Improving" };
    return { text: "text-red-500", bg: "bg-red-500", label: "Needs Work" };
  };

  const scoreInfo = getScoreColor(avgScore);

  const handleCopyRebuttal = async () => {
    const textToCopy = bestResponse || rebuttalFramework || "";
    if (textToCopy) {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      toast.success("Copied rebuttal to clipboard");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getDifficultyBadge = (diff: string) => {
    switch (diff) {
      case "easy":
        return <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500">Easy</Badge>;
      case "moderate":
        return <Badge variant="secondary" className="bg-amber-500/10 text-amber-500">Moderate</Badge>;
      case "hard":
        return <Badge variant="secondary" className="bg-red-500/10 text-red-500">Hard</Badge>;
      default:
        return null;
    }
  };

  return (
    <Card className="border-border/50">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-3">
              <div className="rounded-full p-1.5 bg-muted">
                <MessageCircle className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <CardTitle className="text-base font-medium">{clusterName}</CardTitle>
                <div className="flex items-center gap-2 flex-wrap">
                  {category && (
                    <Badge variant="outline" className="text-xs">
                      {category}
                    </Badge>
                  )}
                  {difficulty && getDifficultyBadge(difficulty)}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className={`${scoreInfo.text} text-xs`}>
                {scoreInfo.label}
              </Badge>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>

          <div className="flex items-center gap-6 mt-3 pt-2 border-t border-border/50">
            <div className="text-sm">
              <span className="text-muted-foreground">Occurrences: </span>
              <span className="font-medium">{occurrences}</span>
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">Avg Score: </span>
              <span className={`font-medium ${scoreInfo.text}`}>{avgScore.toFixed(1)}/10</span>
            </div>
            <div className="flex-1">
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full ${scoreInfo.bg} transition-all`}
                  style={{ width: `${(avgScore / 10) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="pt-2 space-y-4">
            {summary && (
              <div className="text-sm">
                <p className="font-medium mb-1">Summary</p>
                <p className="text-muted-foreground">{summary}</p>
              </div>
            )}

            {(bestResponse || rebuttalFramework) && (
              <div className="relative">
                <p className="text-sm font-medium mb-2">
                  {bestResponse ? "Best Response" : "Rebuttal Framework"}
                </p>
                <div className="bg-muted/50 rounded-lg p-4 text-sm whitespace-pre-wrap">
                  {bestResponse || rebuttalFramework}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute top-8 right-2"
                  onClick={handleCopyRebuttal}
                >
                  {copied ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};
