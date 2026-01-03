import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Brain, ChevronDown, ChevronUp, Mail, Phone, FileText, RefreshCw } from "lucide-react";
import { toast } from "sonner";
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

export const AIBrainSection = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [scripts, setScripts] = useState<ScriptAsset[]>([]);
  const [replyAssets, setReplyAssets] = useState<ReplyAsset[]>([]);
  const [objectionClusters, setObjectionClusters] = useState<ObjectionCluster[]>([]);
  const [callsCount, setCallsCount] = useState(0);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const [scriptsRes, repliesRes, clustersRes, callsRes] = await Promise.all([
        supabase
          .from("user_assets")
          .select("*")
          .eq("user_id", session.user.id)
          .in("asset_type", ["winning_script", "losing_script"])
          .order("created_at", { ascending: false }),
        supabase
          .from("user_assets")
          .select("*")
          .eq("user_id", session.user.id)
          .in("asset_type", ["winning_reply", "losing_reply"])
          .order("created_at", { ascending: false }),
        supabase
          .from("objection_clusters")
          .select("*")
          .eq("user_id", session.user.id)
          .order("total_occurrences", { ascending: false }),
        supabase
          .from("call_analyses")
          .select("id", { count: "exact", head: true })
          .eq("user_id", session.user.id),
      ]);

      if (scriptsRes.data) setScripts(scriptsRes.data);
      if (repliesRes.data) setReplyAssets(repliesRes.data);
      if (clustersRes.data) setObjectionClusters(clustersRes.data);
      setCallsCount(callsRes.count || 0);
    } catch (error) {
      console.error("Error fetching AI brain data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isExpanded && scripts.length === 0 && replyAssets.length === 0 && objectionClusters.length === 0) {
      fetchData();
    }
  }, [isExpanded]);

  const handleAnalyzeScripts = async () => {
    try {
      toast.info("Analyzing scripts...");
      const { error } = await supabase.functions.invoke("classify-scripts");
      if (error) throw error;
      toast.success("Script analysis complete");
      fetchData();
    } catch (error) {
      console.error("Error analyzing scripts:", error);
      toast.error("Failed to analyze scripts");
    }
  };

  const winningScripts = scripts.filter((s) => s.asset_type === "winning_script");
  const losingScripts = scripts.filter((s) => s.asset_type === "losing_script");
  const winningReplies = replyAssets.filter((r) => r.asset_type === "winning_reply");
  const losingReplies = replyAssets.filter((r) => r.asset_type === "losing_reply");

  const totalLearnings = scripts.length + replyAssets.length + objectionClusters.length;

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

  return (
    <Card className="border-border/50">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-full p-2 bg-purple-500/10">
                <Brain className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <CardTitle className="text-lg">AI Brain</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {totalLearnings > 0 
                    ? `${totalLearnings} patterns learned`
                    : "What the Copilot knows about your business"
                  }
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isExpanded && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    fetchData();
                  }}
                  disabled={loading}
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                </Button>
              )}
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm">
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="pt-0">
            {/* Summary Stats */}
            <div className="grid grid-cols-4 gap-3 mb-4">
              <div className="text-center p-2 rounded-lg bg-muted/50">
                <p className="text-xl font-bold">{scripts.length}</p>
                <p className="text-xs text-muted-foreground">Scripts</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-muted/50">
                <p className="text-xl font-bold">{replyAssets.length}</p>
                <p className="text-xs text-muted-foreground">Replies</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-muted/50">
                <p className="text-xl font-bold">{objectionClusters.length}</p>
                <p className="text-xs text-muted-foreground">Objections</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-muted/50">
                <p className="text-xl font-bold">{callsCount}</p>
                <p className="text-xs text-muted-foreground">Calls</p>
              </div>
            </div>

            <Tabs defaultValue="scripts" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="scripts" className="text-xs">
                  <FileText className="h-3 w-3 mr-1" />
                  Outreach
                </TabsTrigger>
                <TabsTrigger value="replies" className="text-xs">
                  <Mail className="h-3 w-3 mr-1" />
                  Booking
                </TabsTrigger>
                <TabsTrigger value="objections" className="text-xs">
                  <Phone className="h-3 w-3 mr-1" />
                  Sales
                </TabsTrigger>
              </TabsList>

              <TabsContent value="scripts" className="mt-4">
                {scripts.length === 0 ? (
                  <EmptyLearningState
                    icon={FileText}
                    title="No Scripts Captured Yet"
                    description="The AI needs 1,000+ emails per variant to classify winning patterns."
                    actionLabel="Analyze Scripts Now"
                    onAction={handleAnalyzeScripts}
                  />
                ) : (
                  <ScrollArea className="h-[300px] pr-2">
                    <div className="space-y-3">
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
                            ]}
                            content={content.email_body || content.subject || "No content"}
                            reasoning="High interest rate - scale this offer."
                            copyable
                          />
                        );
                      })}
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
                            ]}
                            content={content.email_body || content.subject || "No content"}
                            reasoning="Underperforming - consider revising."
                          />
                        );
                      })}
                    </div>
                  </ScrollArea>
                )}
              </TabsContent>

              <TabsContent value="replies" className="mt-4">
                {replyAssets.length === 0 ? (
                  <EmptyLearningState
                    icon={Mail}
                    title="No Reply Patterns Yet"
                    description="Mark outcomes in Master Inbox to capture patterns."
                    actionLabel="Go to Inbox"
                    actionPath="/inbox"
                  />
                ) : (
                  <ScrollArea className="h-[300px] pr-2">
                    <div className="space-y-3">
                      {winningReplies.map((reply) => {
                        const content = parseReplyContent(reply.content);
                        return (
                          <LearningCard
                            key={reply.id}
                            type="winning"
                            title={reply.title || "Reply Template"}
                            content={content.sent_message || content.message || "No content"}
                            reasoning="Booked a meeting."
                            copyable
                          />
                        );
                      })}
                      {losingReplies.map((reply) => {
                        const content = parseReplyContent(reply.content);
                        return (
                          <LearningCard
                            key={reply.id}
                            type="losing"
                            title={reply.title || "Reply Template"}
                            content={content.sent_message || content.message || "No content"}
                            reasoning="Did not convert."
                          />
                        );
                      })}
                    </div>
                  </ScrollArea>
                )}
              </TabsContent>

              <TabsContent value="objections" className="mt-4">
                {objectionClusters.length === 0 ? (
                  <EmptyLearningState
                    icon={Phone}
                    title="No Objections Clustered Yet"
                    description="Upload sales calls to build your playbook."
                    actionLabel="Go to Sales Coach"
                    actionPath="/sales-coach"
                  />
                ) : (
                  <ScrollArea className="h-[300px] pr-2">
                    <div className="space-y-3">
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
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};
