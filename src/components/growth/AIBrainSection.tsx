import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Brain, Mail, MessageSquare, Phone, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { LearningStageDisplay } from "@/components/ai-brain/LearningStageDisplay";
import { QuickStatsBar } from "@/components/ai-brain/QuickStatsBar";
import { CategorySection } from "@/components/ai-brain/CategorySection";
import { SimpleScriptCard } from "@/components/ai-brain/SimpleScriptCard";
import { SimpleReplyCard } from "@/components/ai-brain/SimpleReplyCard";
import { SimpleObjectionCard } from "@/components/ai-brain/SimpleObjectionCard";
import { UnifiedEmptyState } from "@/components/ai-brain/UnifiedEmptyState";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JsonValue = any;

interface ScriptAsset {
  id: string;
  title: string;
  content: JsonValue;
  performance_data?: JsonValue;
  status?: string | null;
}

interface ReplyAsset {
  id: string;
  title: string;
  content: JsonValue;
  status?: string | null;
}

interface ObjectionCluster {
  id: string;
  cluster_name: string;
  category: string;
  total_occurrences: number | null;
  avg_handling_score: number | null;
  best_response: string | null;
  difficulty_level: string | null;
  summary: string | null;
  rebuttal_framework: string | null;
}

// Helper functions to safely access nested properties
const getContentString = (content: JsonValue, ...keys: string[]): string | undefined => {
  if (!content || typeof content !== 'object') return undefined;
  for (const key of keys) {
    if (content[key] && typeof content[key] === 'string') return content[key];
  }
  return undefined;
};

const getPerformanceNumber = (perfData: JsonValue, ...keys: string[]): number | undefined => {
  if (!perfData || typeof perfData !== 'object') return undefined;
  for (const key of keys) {
    if (typeof perfData[key] === 'number') return perfData[key];
  }
  return undefined;
};

export const AIBrainSection = () => {
  const [loading, setLoading] = useState(false);
  const [scripts, setScripts] = useState<ScriptAsset[]>([]);
  const [replyAssets, setReplyAssets] = useState<ReplyAsset[]>([]);
  const [objectionClusters, setObjectionClusters] = useState<ObjectionCluster[]>([]);
  const [callCount, setCallCount] = useState(0);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [assetsResponse, clustersResponse, callsResponse] = await Promise.all([
        supabase
          .from("user_assets")
          .select("*")
          .eq("user_id", user.id)
          .in("asset_type", ["winning_script", "losing_script", "winning_reply", "losing_reply"]),
        supabase
          .from("objection_clusters")
          .select("*")
          .eq("user_id", user.id)
          .order("total_occurrences", { ascending: false }),
        supabase
          .from("call_analyses")
          .select("id")
          .eq("user_id", user.id)
      ]);

      if (assetsResponse.data) {
        const scriptAssets = assetsResponse.data.filter(a => 
          a.asset_type === "winning_script" || a.asset_type === "losing_script"
        );
        const replyAssetData = assetsResponse.data.filter(a => 
          a.asset_type === "winning_reply" || a.asset_type === "losing_reply"
        );
        
        setScripts(scriptAssets.map(a => ({
          ...a,
          content: typeof a.content === 'string' ? JSON.parse(a.content) : a.content,
          status: a.asset_type === "winning_script" ? "winning" : "losing"
        })));
        
        setReplyAssets(replyAssetData.map(a => ({
          ...a,
          content: typeof a.content === 'string' ? JSON.parse(a.content) : a.content,
          status: a.asset_type === "winning_reply" ? "winning" : "losing"
        })));
      }

      if (clustersResponse.data) {
        setObjectionClusters(clustersResponse.data);
      }

      if (callsResponse.data) {
        setCallCount(callsResponse.data.length);
      }
    } catch (error) {
      console.error("Error fetching AI brain data:", error);
      toast.error("Failed to load AI Brain data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Calculate stats
  const winningScripts = scripts.filter(s => s.status === "winning");
  const losingScripts = scripts.filter(s => s.status === "losing");
  const winningReplies = replyAssets.filter(r => r.status === "winning");
  const losingReplies = replyAssets.filter(r => r.status === "losing");
  const masteredObjections = objectionClusters.filter(o => (o.avg_handling_score || 0) >= 7);
  const needsWorkObjections = objectionClusters.filter(o => (o.avg_handling_score || 0) < 7);

  const totalPatterns = scripts.length + replyAssets.length + objectionClusters.length;
  const hasAnyData = totalPatterns > 0 || callCount > 0;

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-full p-2 bg-primary/10">
              <Brain className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">AI Brain</CardTitle>
              <p className="text-sm text-muted-foreground">
                Your personal outbound intelligence engine
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchData()}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {!hasAnyData ? (
          <UnifiedEmptyState 
            hasScripts={scripts.length > 0}
            hasReplies={replyAssets.length > 0}
            hasCalls={callCount > 0}
          />
        ) : (
          <>
            {/* Learning Stage Display */}
            <LearningStageDisplay
              scriptsCount={scripts.length}
              repliesCount={replyAssets.length}
              objectionsCount={objectionClusters.length}
              callCount={callCount}
            />

            {/* Quick Stats */}
            <QuickStatsBar
              winningScripts={winningScripts.length}
              losingScripts={losingScripts.length}
              winningReplies={winningReplies.length}
              losingReplies={losingReplies.length}
              masteredObjections={masteredObjections.length}
              needsWorkObjections={needsWorkObjections.length}
              totalCalls={callCount}
            />

            {/* Three Column Layout */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Outreach Column */}
              <div className="p-4 rounded-lg border border-border/50 bg-card">
                <CategorySection
                  title="Outreach"
                  icon={Mail}
                  winCount={winningScripts.length}
                  loseCount={losingScripts.length}
                  emptyState={
                    <p className="text-xs text-muted-foreground text-center py-4">
                      Send 1,000+ emails to unlock script analysis
                    </p>
                  }
                >
                  {[...winningScripts, ...losingScripts].slice(0, 3).map(script => (
                    <SimpleScriptCard
                      key={script.id}
                      title={script.title}
                      campaign={getContentString(script.content, 'campaign_name')}
                      interestedRate={getPerformanceNumber(script.performance_data, 'interested_rate', 'interest_rate')}
                      emailsPerLead={getPerformanceNumber(script.performance_data, 'emails_per_lead', 'epl')}
                      content={getContentString(script.content, 'body_content', 'email_body', 'subject_line', 'subject')}
                      isWinning={script.status === "winning"}
                      recommendation={getContentString(script.content, 'recommendation')}
                    />
                  ))}
                </CategorySection>
              </div>

              {/* Booking Column */}
              <div className="p-4 rounded-lg border border-border/50 bg-card">
                <CategorySection
                  title="Booking"
                  icon={MessageSquare}
                  winCount={winningReplies.length}
                  loseCount={losingReplies.length}
                  winLabel="Booked"
                  loseLabel="Failed"
                  emptyState={
                    <p className="text-xs text-muted-foreground text-center py-4">
                      Mark outcomes in Master Inbox to learn patterns
                    </p>
                  }
                >
                  {[...winningReplies, ...losingReplies].slice(0, 3).map(reply => (
                    <SimpleReplyCard
                      key={reply.id}
                      title={reply.title}
                      content={getContentString(reply.content, 'message_content', 'sent_message', 'message')}
                      isWinning={reply.status === "winning"}
                      replyType={getContentString(reply.content, 'reply_type')}
                    />
                  ))}
                </CategorySection>
              </div>

              {/* Sales Column */}
              <div className="p-4 rounded-lg border border-border/50 bg-card">
                <CategorySection
                  title="Sales"
                  icon={Phone}
                  winCount={masteredObjections.length}
                  loseCount={needsWorkObjections.length}
                  winLabel="Mastered"
                  loseLabel="Need Work"
                  emptyState={
                    <p className="text-xs text-muted-foreground text-center py-4">
                      Analyze sales calls to identify objections
                    </p>
                  }
                >
                  {[...masteredObjections, ...needsWorkObjections].slice(0, 3).map(cluster => (
                    <SimpleObjectionCard
                      key={cluster.id}
                      clusterName={cluster.cluster_name}
                      category={cluster.category}
                      avgScore={cluster.avg_handling_score || 0}
                      occurrences={cluster.total_occurrences || 0}
                      bestResponse={cluster.best_response || cluster.rebuttal_framework || undefined}
                      difficultyLevel={cluster.difficulty_level || undefined}
                    />
                  ))}
                </CategorySection>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
