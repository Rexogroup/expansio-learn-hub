import { Sparkles } from "lucide-react";

interface HeadlineInsightProps {
  scripts: Array<{ performance_data?: { interested_rate?: number } | null }>;
  objectionClusters: Array<{ avg_handling_score?: number | null }>;
  replyAssets: Array<{ status?: string | null }>;
}

export const HeadlineInsight = ({ scripts, objectionClusters, replyAssets }: HeadlineInsightProps) => {
  const generateInsight = (): string => {
    // Find best performing script
    const winningScripts = scripts.filter(s => s.performance_data?.interested_rate);
    if (winningScripts.length > 0) {
      const bestScript = winningScripts.reduce((best, current) => {
        const currentIR = current.performance_data?.interested_rate || 0;
        const bestIR = best.performance_data?.interested_rate || 0;
        return currentIR > bestIR ? current : best;
      });
      const ir = bestScript.performance_data?.interested_rate;
      if (ir && ir >= 10) {
        return `Your best script has ${ir.toFixed(1)}% IR – ${(ir / 5).toFixed(1)}x above industry average`;
      }
    }

    // Check mastered objections
    const masteredObjections = objectionClusters.filter(o => (o.avg_handling_score || 0) >= 7);
    if (masteredObjections.length > 0) {
      return `You've mastered ${masteredObjections.length} objection${masteredObjections.length > 1 ? 's' : ''} – your sales readiness is improving`;
    }

    // Check winning replies
    const winningReplies = replyAssets.filter(r => r.status === 'winning');
    if (winningReplies.length > 0) {
      return `${winningReplies.length} reply template${winningReplies.length > 1 ? 's' : ''} consistently book meetings`;
    }

    // Fallback
    return "Start building your personal outbound intelligence engine";
  };

  return (
    <div className="flex items-start gap-3 p-4 rounded-lg bg-gradient-to-r from-primary/5 to-purple-500/5 border border-primary/10">
      <div className="rounded-full p-2 bg-primary/10 shrink-0">
        <Sparkles className="h-4 w-4 text-primary" />
      </div>
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-1">Top Insight</p>
        <p className="text-sm font-medium">{generateInsight()}</p>
      </div>
    </div>
  );
};
