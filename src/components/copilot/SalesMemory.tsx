import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { 
  Phone, 
  Loader2, 
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  Target,
  Zap,
  CheckCircle2,
  XCircle,
  Star,
  BarChart3
} from 'lucide-react';

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

interface CallAnalysis {
  id: string;
  title: string;
  overall_score: number | null;
  close_confidence: number | null;
  objections_identified: number | null;
  created_at: string;
  deal_outcome?: string | null;
  deal_value?: number | null;
}

export function SalesMemory() {
  const [isLoading, setIsLoading] = useState(true);
  const [objectionClusters, setObjectionClusters] = useState<ObjectionCluster[]>([]);
  const [callAnalyses, setCallAnalyses] = useState<CallAnalysis[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [clustersResponse, callsResponse] = await Promise.all([
        supabase
          .from('objection_clusters')
          .select('*')
          .eq('user_id', user.id)
          .order('total_occurrences', { ascending: false }),
        supabase
          .from('call_analyses')
          .select('id, title, overall_score, close_confidence, objections_identified, created_at, deal_outcome, deal_value')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20)
      ]);

      if (clustersResponse.data) {
        setObjectionClusters(clustersResponse.data);
      }

      if (callsResponse.data) {
        setCallAnalyses(callsResponse.data);
      }
    } catch (error) {
      console.error('Error fetching sales data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const masteredObjections = objectionClusters.filter(o => (o.avg_handling_score || 0) >= 7);
  const needsWorkObjections = objectionClusters.filter(o => (o.avg_handling_score || 0) < 7);
  const closedDeals = callAnalyses.filter(c => c.deal_outcome === 'won');
  const lostDeals = callAnalyses.filter(c => c.deal_outcome === 'lost');
  const avgScore = callAnalyses.length > 0
    ? callAnalyses.reduce((sum, c) => sum + (c.overall_score || 0), 0) / callAnalyses.length
    : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Phone className="h-5 w-5 text-primary" />
            Sales Memory
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Patterns learned from your sales calls and objection handling
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Calls Analyzed</span>
            </div>
            <p className="text-2xl font-bold mt-2">{callAnalyses.length}</p>
            {avgScore > 0 && (
              <p className="text-xs text-muted-foreground">Avg score: {avgScore.toFixed(0)}/100</p>
            )}
          </CardContent>
        </Card>
        <Card className="bg-emerald-500/10 border-emerald-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span className="text-sm font-medium">Mastered</span>
            </div>
            <p className="text-2xl font-bold mt-2">{masteredObjections.length}</p>
            <p className="text-xs text-muted-foreground">Objections</p>
          </CardContent>
        </Card>
        <Card className="bg-amber-500/10 border-amber-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-medium">Needs Work</span>
            </div>
            <p className="text-2xl font-bold mt-2">{needsWorkObjections.length}</p>
            <p className="text-xs text-muted-foreground">Objections</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Total Objections</span>
            </div>
            <p className="text-2xl font-bold mt-2">{objectionClusters.length}</p>
            <p className="text-xs text-muted-foreground">Clusters</p>
          </CardContent>
        </Card>
      </div>

      {objectionClusters.length === 0 && callAnalyses.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Phone className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="font-semibold text-lg mb-2">No Sales Data Yet</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Analyze sales calls in the Sales Coach to identify objection patterns. 
              The AI learns from your calls to provide better closing strategies!
            </p>
            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Target className="h-4 w-4" />
              <span>Upload call transcripts to start learning</span>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Mastered Objections */}
          <Card className="border-emerald-500/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Star className="h-4 w-4 text-emerald-500" />
                Mastered Objections
              </CardTitle>
              <CardDescription>
                Objections you handle well (7+ avg score)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[350px] pr-4">
                <div className="space-y-3">
                  {masteredObjections.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No mastered objections yet. Keep practicing!
                    </p>
                  ) : (
                    masteredObjections.map(cluster => (
                      <ObjectionCard key={cluster.id} cluster={cluster} isMastered />
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Needs Work Objections */}
          <Card className="border-amber-500/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Needs Improvement
              </CardTitle>
              <CardDescription>
                Objections that need more practice
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[350px] pr-4">
                <div className="space-y-3">
                  {needsWorkObjections.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      All objections mastered! Great work!
                    </p>
                  ) : (
                    needsWorkObjections.map(cluster => (
                      <ObjectionCard key={cluster.id} cluster={cluster} isMastered={false} />
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Calls */}
      {callAnalyses.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Recent Call Analyses
            </CardTitle>
            <CardDescription>
              Your latest analyzed sales calls
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {callAnalyses.slice(0, 5).map(call => (
                <div key={call.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm truncate">{call.title}</h4>
                    <p className="text-xs text-muted-foreground">
                      {new Date(call.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {call.objections_identified && call.objections_identified > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {call.objections_identified} objections
                      </Badge>
                    )}
                    {call.overall_score && (
                      <Badge 
                        variant={call.overall_score >= 70 ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {call.overall_score}/100
                      </Badge>
                    )}
                    {call.deal_outcome && (
                      <Badge 
                        variant={call.deal_outcome === 'won' ? 'default' : 'destructive'}
                        className="text-xs"
                      >
                        {call.deal_outcome === 'won' ? 'Won' : 'Lost'}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Insights */}
      {(objectionClusters.length > 0 || callAnalyses.length > 0) && (
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              AI Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              {needsWorkObjections.length > 0 && (
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5" />
                  <p>
                    Focus on improving your handling of <strong>{needsWorkObjections[0]?.cluster_name}</strong> - 
                    it's your most common weak point with {needsWorkObjections[0]?.total_occurrences || 0} occurrences.
                  </p>
                </div>
              )}
              {masteredObjections.length > 0 && (
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5" />
                  <p>
                    You've mastered {masteredObjections.length} objection types. 
                    Your best response patterns are being used to train the Copilot.
                  </p>
                </div>
              )}
              {callAnalyses.length >= 3 && (
                <div className="flex items-start gap-2">
                  <Target className="h-4 w-4 text-primary mt-0.5" />
                  <p>
                    With {callAnalyses.length} calls analyzed, the Copilot can now identify 
                    winning structures for your specific offer.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ObjectionCard({ cluster, isMastered }: { cluster: ObjectionCluster; isMastered: boolean }) {
  const score = cluster.avg_handling_score || 0;
  const scoreColor = score >= 7 ? 'text-emerald-500' : score >= 5 ? 'text-amber-500' : 'text-red-500';

  return (
    <div className={`p-3 rounded-lg border ${isMastered ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-amber-500/30 bg-amber-500/5'}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm">{cluster.cluster_name}</h4>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="text-xs capitalize">
              {cluster.category}
            </Badge>
            {cluster.difficulty_level && (
              <Badge 
                variant={cluster.difficulty_level === 'easy' ? 'secondary' : cluster.difficulty_level === 'hard' ? 'destructive' : 'outline'}
                className="text-xs capitalize"
              >
                {cluster.difficulty_level}
              </Badge>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          <span className={`text-lg font-bold ${scoreColor}`}>{score.toFixed(1)}</span>
          <span className="text-xs text-muted-foreground">/10</span>
          <p className="text-xs text-muted-foreground">{cluster.total_occurrences || 0}x</p>
        </div>
      </div>
      <Progress value={score * 10} className="h-1.5 mb-2" />
      {cluster.summary && (
        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
          {cluster.summary}
        </p>
      )}
      {cluster.best_response && (
        <div className="text-xs bg-background/50 p-2 rounded border">
          <span className="font-medium text-primary">Best response:</span>
          <p className="mt-1 line-clamp-2">{cluster.best_response}</p>
        </div>
      )}
    </div>
  );
}
