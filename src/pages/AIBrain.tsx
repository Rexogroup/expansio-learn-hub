import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, Mail, Phone, FileText } from "lucide-react";
import { toast } from "sonner";
import { BrainSummary } from "@/components/ai-brain/BrainSummary";
import { LearningCard } from "@/components/ai-brain/LearningCard";
import { ObjectionClusterCard } from "@/components/ai-brain/ObjectionClusterCard";
import { EmptyLearningState } from "@/components/ai-brain/EmptyLearningState";

interface ScriptAsset {
  id: string;
  title: string;
  content: any;
  asset_type: string;
  performance_data: any;
  created_at: string;
}

interface ReplyAsset {
  id: string;
  title: string;
  content: any;
  asset_type: string;
  created_at: string;
}

interface ObjectionCluster {
  id: string;
  cluster_name: string;
  category: string | null;
  total_occurrences: number;
  avg_handling_score: number;
  summary: string | null;
  best_response: string | null;
  rebuttal_framework: string | null;
  difficulty_level: string | null;
}

interface CallAnalysis {
  id: string;
  title: string | null;
  overall_score: number | null;
  created_at: string;
}

const AIBrain = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [scripts, setScripts] = useState<ScriptAsset[]>([]);
  const [replyAssets, setReplyAssets] = useState<ReplyAsset[]>([]);
  const [objectionClusters, setObjectionClusters] = useState<ObjectionCluster[]>([]);
  const [callAnalyses, setCallAnalyses] = useState<CallAnalysis[]>([]);

  useEffect(() => {
    checkAuthAndFetchData();
  }, []);

  const checkAuthAndFetchData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    await fetchAllData(session.user.id);
  };

  const fetchAllData = async (userId: string) => {
    setLoading(true);
    try {
      const [scriptsRes, repliesRes, clustersRes, callsRes] = await Promise.all([
        supabase
          .from("user_assets")
          .select("*")
          .eq("user_id", userId)
          .in("asset_type", ["winning_script", "losing_script"])
          .order("created_at", { ascending: false }),
        supabase
          .from("user_assets")
          .select("*")
          .eq("user_id", userId)
          .in("asset_type", ["winning_reply", "losing_reply"])
          .order("created_at", { ascending: false }),
        supabase
          .from("objection_clusters")
          .select("*")
          .eq("user_id", userId)
          .order("total_occurrences", { ascending: false }),
        supabase
          .from("call_analyses")
          .select("id, title, overall_score, created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false }),
      ]);

      if (scriptsRes.data) setScripts(scriptsRes.data);
      if (repliesRes.data) setReplyAssets(repliesRes.data);
      if (clustersRes.data) setObjectionClusters(clustersRes.data);
      if (callsRes.data) setCallAnalyses(callsRes.data);
    } catch (error) {
      console.error("Error fetching AI brain data:", error);
      toast.error("Failed to load learning data");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await fetchAllData(session.user.id);
    }
    setRefreshing(false);
    toast.success("Learning data refreshed");
  };

  const handleAnalyzeScripts = async () => {
    try {
      toast.info("Analyzing scripts...");
      const { error } = await supabase.functions.invoke("classify-scripts");
      if (error) throw error;
      toast.success("Script analysis complete");
      handleRefresh();
    } catch (error) {
      console.error("Error analyzing scripts:", error);
      toast.error("Failed to analyze scripts");
    }
  };

  const winningScripts = scripts.filter((s) => s.asset_type === "winning_script");
  const losingScripts = scripts.filter((s) => s.asset_type === "losing_script");
  const winningReplies = replyAssets.filter((r) => r.asset_type === "winning_reply");
  const losingReplies = replyAssets.filter((r) => r.asset_type === "losing_reply");

  const parseScriptContent = (content: any) => {
    if (typeof content === "string") {
      try {
        return JSON.parse(content);
      } catch {
        return { email_body: content };
      }
    }
    return content || {};
  };

  const parseReplyContent = (content: any) => {
    if (typeof content === "string") {
      try {
        return JSON.parse(content);
      } catch {
        return { message: content };
      }
    }
    return content || {};
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8 pt-24">
          <div className="space-y-6">
            <Skeleton className="h-10 w-64" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
            <Skeleton className="h-96" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 pt-24">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Your AI Brain</h1>
            <p className="text-muted-foreground mt-1">
              The Copilot learns from every interaction. Here's what it knows about your business.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        <BrainSummary
          scriptsCount={scripts.length}
          replyPatternsCount={replyAssets.length}
          objectionsCount={objectionClusters.length}
          leadsAnalyzed={callAnalyses.length}
        />

        <Tabs defaultValue="scripts" className="mt-8">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="scripts" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Outreach
            </TabsTrigger>
            <TabsTrigger value="replies" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Booking
            </TabsTrigger>
            <TabsTrigger value="objections" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Sales
            </TabsTrigger>
          </TabsList>

          <TabsContent value="scripts" className="mt-6">
            {scripts.length === 0 ? (
              <EmptyLearningState
                icon={FileText}
                title="No Scripts Captured Yet"
                description="The AI needs 1,000+ emails per variant to classify winning and losing patterns. Connect your campaigns and let the data flow in."
                actionLabel="Analyze Scripts Now"
                onAction={handleAnalyzeScripts}
              />
            ) : (
              <div className="space-y-8">
                {winningScripts.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4 text-emerald-500">
                      Winning Patterns ({winningScripts.length})
                    </h3>
                    <ScrollArea className="h-[400px] pr-4">
                      <div className="space-y-4">
                        {winningScripts.map((script) => {
                          const content = parseScriptContent(script.content);
                          const perf = script.performance_data || {};
                          return (
                            <LearningCard
                              key={script.id}
                              type="winning"
                              title={script.title || "Untitled Script"}
                              subtitle={content.campaign_name}
                              metrics={[
                                { label: "IR%", value: `${perf.interest_rate?.toFixed(1) || 0}%` },
                                { label: "EPL", value: `$${perf.epl?.toFixed(2) || 0}` },
                                { label: "Sent", value: perf.emails_sent?.toLocaleString() || "0" },
                              ]}
                              content={content.email_body || content.subject || "No content"}
                              reasoning="This script outperformed benchmarks with high interest rates. The offer resonates with your ICP."
                              copyable
                            />
                          );
                        })}
                      </div>
                    </ScrollArea>
                  </div>
                )}

                {losingScripts.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4 text-amber-500">
                      Patterns to Avoid ({losingScripts.length})
                    </h3>
                    <ScrollArea className="h-[400px] pr-4">
                      <div className="space-y-4">
                        {losingScripts.map((script) => {
                          const content = parseScriptContent(script.content);
                          const perf = script.performance_data || {};
                          return (
                            <LearningCard
                              key={script.id}
                              type="losing"
                              title={script.title || "Untitled Script"}
                              subtitle={content.campaign_name}
                              metrics={[
                                { label: "IR%", value: `${perf.interest_rate?.toFixed(1) || 0}%` },
                                { label: "EPL", value: `$${perf.epl?.toFixed(2) || 0}` },
                                { label: "Sent", value: perf.emails_sent?.toLocaleString() || "0" },
                              ]}
                              content={content.email_body || content.subject || "No content"}
                              reasoning="This script underperformed benchmarks. Consider revising the offer or angle."
                            />
                          );
                        })}
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="replies" className="mt-6">
            {replyAssets.length === 0 ? (
              <EmptyLearningState
                icon={Mail}
                title="No Reply Patterns Yet"
                description="Patterns are captured when you mark outcomes in the Master Inbox. The more you classify, the smarter the Copilot becomes."
                actionLabel="Go to Master Inbox"
                actionPath="/inbox"
              />
            ) : (
              <div className="space-y-8">
                {winningReplies.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4 text-emerald-500">
                      Replies That Booked Meetings ({winningReplies.length})
                    </h3>
                    <ScrollArea className="h-[400px] pr-4">
                      <div className="space-y-4">
                        {winningReplies.map((reply) => {
                          const content = parseReplyContent(reply.content);
                          return (
                            <LearningCard
                              key={reply.id}
                              type="winning"
                              title={reply.title || "Reply Template"}
                              content={content.sent_message || content.message || "No content"}
                              reasoning="This response successfully converted a reply into a booked meeting."
                              copyable
                            />
                          );
                        })}
                      </div>
                    </ScrollArea>
                  </div>
                )}

                {losingReplies.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4 text-amber-500">
                      Replies That Didn't Convert ({losingReplies.length})
                    </h3>
                    <ScrollArea className="h-[400px] pr-4">
                      <div className="space-y-4">
                        {losingReplies.map((reply) => {
                          const content = parseReplyContent(reply.content);
                          return (
                            <LearningCard
                              key={reply.id}
                              type="losing"
                              title={reply.title || "Reply Template"}
                              content={content.sent_message || content.message || "No content"}
                              reasoning="This response did not result in a meeting. Consider a different approach."
                            />
                          );
                        })}
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="objections" className="mt-6">
            {objectionClusters.length === 0 ? (
              <EmptyLearningState
                icon={Phone}
                title="No Objections Clustered Yet"
                description="Objections are captured from Sales Coach analysis. Upload a sales call to start building your playbook."
                actionLabel="Go to Sales Coach"
                actionPath="/sales-coach"
              />
            ) : (
              <ScrollArea className="h-[600px] pr-4">
                <div className="space-y-4">
                  {objectionClusters.map((cluster) => (
                    <ObjectionClusterCard
                      key={cluster.id}
                      clusterName={cluster.cluster_name}
                      category={cluster.category || undefined}
                      occurrences={cluster.total_occurrences}
                      avgScore={cluster.avg_handling_score}
                      summary={cluster.summary || undefined}
                      bestResponse={cluster.best_response || undefined}
                      rebuttalFramework={cluster.rebuttal_framework || undefined}
                      difficulty={cluster.difficulty_level || undefined}
                    />
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AIBrain;
