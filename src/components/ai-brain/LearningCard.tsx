import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, Trophy, AlertTriangle, Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface LearningCardProps {
  type: "winning" | "losing";
  title: string;
  subtitle?: string;
  metrics?: { label: string; value: string }[];
  content: string;
  reasoning?: string;
  copyable?: boolean;
}

export const LearningCard = ({
  type,
  title,
  subtitle,
  metrics,
  content,
  reasoning,
  copyable = false,
}: LearningCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const isWinning = type === "winning";
  const Icon = isWinning ? Trophy : AlertTriangle;
  const badgeText = isWinning ? "SCALE THIS" : "AVOID";
  const badgeVariant = isWinning ? "default" : "destructive";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className={`border-l-4 ${isWinning ? "border-l-emerald-500" : "border-l-amber-500"}`}>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-3">
              <div className={`rounded-full p-1.5 ${isWinning ? "bg-emerald-500/10" : "bg-amber-500/10"}`}>
                <Icon className={`h-4 w-4 ${isWinning ? "text-emerald-500" : "text-amber-500"}`} />
              </div>
              <div className="space-y-1">
                <CardTitle className="text-base font-medium">{title}</CardTitle>
                {subtitle && (
                  <p className="text-sm text-muted-foreground">{subtitle}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={badgeVariant} className="text-xs">
                {badgeText}
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

          {metrics && metrics.length > 0 && (
            <div className="flex flex-wrap gap-4 mt-3 pt-2 border-t border-border/50">
              {metrics.map((metric) => (
                <div key={metric.label} className="text-sm">
                  <span className="text-muted-foreground">{metric.label}: </span>
                  <span className="font-medium">{metric.value}</span>
                </div>
              ))}
            </div>
          )}
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="pt-2 space-y-4">
            <div className="relative">
              <div className="bg-muted/50 rounded-lg p-4 text-sm whitespace-pre-wrap max-h-64 overflow-y-auto">
                {content}
              </div>
              {copyable && (
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={handleCopy}
                >
                  {copied ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>
              )}
            </div>

            {reasoning && (
              <div className={`rounded-lg p-3 text-sm ${isWinning ? "bg-emerald-500/10" : "bg-amber-500/10"}`}>
                <p className="font-medium mb-1">
                  {isWinning ? "Why it works:" : "Why it failed:"}
                </p>
                <p className="text-muted-foreground">{reasoning}</p>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};
