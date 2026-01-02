import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { 
  BookOpen, Search, TrendingUp, Lightbulb, Trash2, Layers, 
  AlertTriangle, CheckCircle2, ChevronDown, Copy, Zap, MessageSquare
} from "lucide-react";

interface ObjectionCluster {
  id: string;
  category: string;
  cluster_name: string;
  representative_objection: string;
  summary: string | null;
  variations: string[];
  best_response: string | null;
  best_response_score: number | null;
  total_occurrences: number;
  avg_handling_score: number | null;
  rebuttal_framework: string | null;
  difficulty_level: string | null;
  updated_at: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  'Price/Budget': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  'Timing': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  'Competition': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  'Authority': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  'Need': 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
  'Trust': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
  'Stall': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  'Other': 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
};

const DIFFICULTY_COLORS: Record<string, string> = {
  'easy': 'text-green-600 bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800',
  'moderate': 'text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800',
  'hard': 'text-red-600 bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800',
};

export const ObjectionPlaybook = () => {
  const [clusters, setClusters] = useState<ObjectionCluster[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'quick'>('cards');
  const [expandedClusters, setExpandedClusters] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('objection_clusters')
        .select('*')
        .eq('user_id', user.id)
        .order('total_occurrences', { ascending: false });

      if (error) throw error;

      setClusters((data || []).map(item => ({
        ...item,
        variations: item.variations || [],
      })));
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error loading playbook",
        description: "Could not load your objection playbook",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCluster = async (id: string) => {
    try {
      const { error } = await supabase
        .from('objection_clusters')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setClusters(prev => prev.filter(c => c.id !== id));
      toast({
        title: "Cluster removed",
        description: "Removed from your playbook",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not delete cluster",
        variant: "destructive",
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!", description: "Response copied to clipboard" });
  };

  const toggleExpanded = (id: string) => {
    setExpandedClusters(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Filter clusters
  const filteredClusters = clusters
    .filter(c => !selectedCategory || c.category === selectedCategory)
    .filter(c => 
      !searchQuery ||
      c.cluster_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.summary?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.representative_objection.toLowerCase().includes(searchQuery.toLowerCase())
    )
    // Sort: struggling first, then by occurrences
    .sort((a, b) => {
      const aScore = a.avg_handling_score || 5;
      const bScore = b.avg_handling_score || 5;
      // Struggling (score < 6) comes first
      if (aScore < 6 && bScore >= 6) return -1;
      if (bScore < 6 && aScore >= 6) return 1;
      // Then by occurrences
      return b.total_occurrences - a.total_occurrences;
    });

  // Group by category for quick reference
  const groupedByCategory = filteredClusters.reduce((acc, cluster) => {
    if (!acc[cluster.category]) acc[cluster.category] = [];
    acc[cluster.category].push(cluster);
    return acc;
  }, {} as Record<string, ObjectionCluster[]>);

  // Stats
  const categories = [...new Set(clusters.map(c => c.category))];
  const totalOccurrences = clusters.reduce((sum, c) => sum + c.total_occurrences, 0);
  const masteredClusters = clusters.filter(c => (c.avg_handling_score || 0) >= 7);
  const strugglingClusters = clusters.filter(c => (c.avg_handling_score || 0) > 0 && (c.avg_handling_score || 0) < 6);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />
              <div>
                <div className="text-2xl font-bold">{clusters.length}</div>
                <p className="text-sm text-muted-foreground">Patterns</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="text-2xl font-bold">{totalOccurrences}</div>
                <p className="text-sm text-muted-foreground">Times Seen</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <div>
                <div className="text-2xl font-bold">{masteredClusters.length}</div>
                <p className="text-sm text-muted-foreground">Mastered</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <div>
                <div className="text-2xl font-bold">{strugglingClusters.length}</div>
                <p className="text-sm text-muted-foreground">Needs Work</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Playbook */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Objection Playbook
              </CardTitle>
              <CardDescription>
                AI-clustered objection patterns with proven responses
              </CardDescription>
            </div>
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'cards' | 'quick')}>
              <TabsList>
                <TabsTrigger value="cards" className="gap-1">
                  <Layers className="h-4 w-4" />
                  Full View
                </TabsTrigger>
                <TabsTrigger value="quick" className="gap-1">
                  <Zap className="h-4 w-4" />
                  Quick Ref
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Filter */}
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search objections..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Category filters */}
          <div className="flex flex-wrap gap-2">
            <Badge
              variant={selectedCategory === null ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setSelectedCategory(null)}
            >
              All ({clusters.length})
            </Badge>
            {categories.map(cat => {
              const count = clusters.filter(c => c.category === cat).length;
              return (
                <Badge
                  key={cat}
                  variant={selectedCategory === cat ? "default" : "outline"}
                  className={`cursor-pointer ${selectedCategory === cat ? '' : CATEGORY_COLORS[cat] || CATEGORY_COLORS['Other']}`}
                  onClick={() => setSelectedCategory(cat === selectedCategory ? null : cat)}
                >
                  {cat} ({count})
                </Badge>
              );
            })}
          </div>

          {/* Empty State */}
          {clusters.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Layers className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">No objection patterns yet</p>
              <p className="text-sm">Analyze sales calls to start building your playbook</p>
            </div>
          ) : filteredClusters.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No patterns match your search</p>
            </div>
          ) : viewMode === 'cards' ? (
            /* Full Card View */
            <div className="space-y-3">
              {filteredClusters.map((cluster) => {
                const avgScore = cluster.avg_handling_score || 0;
                const isMastered = avgScore >= 7;
                const isStruggling = avgScore > 0 && avgScore < 6;
                const isExpanded = expandedClusters.has(cluster.id);
                const difficulty = cluster.difficulty_level || 'moderate';

                return (
                  <Collapsible key={cluster.id} open={isExpanded} onOpenChange={() => toggleExpanded(cluster.id)}>
                    <Card className={`transition-all ${isStruggling ? 'border-amber-300 dark:border-amber-700' : ''}`}>
                      <CardContent className="pt-4 pb-3">
                        {/* Header Row */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <Badge className={CATEGORY_COLORS[cluster.category] || CATEGORY_COLORS['Other']} variant="secondary">
                                {cluster.category}
                              </Badge>
                              <h3 className="font-semibold text-base">{cluster.cluster_name}</h3>
                            </div>
                            
                            {/* Summary */}
                            {cluster.summary && (
                              <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                                {cluster.summary}
                              </p>
                            )}

                            {/* Meta badges */}
                            <div className="flex items-center gap-2 flex-wrap text-xs">
                              <Badge variant="outline" className="font-normal">
                                {cluster.total_occurrences}x seen
                              </Badge>
                              <Badge variant="outline" className={`font-normal border ${DIFFICULTY_COLORS[difficulty]}`}>
                                {difficulty}
                              </Badge>
                              {isMastered && (
                                <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50 dark:bg-green-950/30">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Mastered
                                </Badge>
                              )}
                              {isStruggling && (
                                <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/30">
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  Practice
                                </Badge>
                              )}
                              <span className="text-muted-foreground">
                                Score: <span className={isMastered ? 'text-green-600 font-medium' : isStruggling ? 'text-amber-600 font-medium' : ''}>
                                  {avgScore.toFixed(1)}/10
                                </span>
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            <CollapsibleTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                              </Button>
                            </CollapsibleTrigger>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => handleDeleteCluster(cluster.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Best Response (always visible if available) */}
                        {cluster.best_response && (
                          <div className="mt-3 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-1 text-green-700 dark:text-green-400 text-sm font-medium">
                                <Lightbulb className="h-4 w-4" />
                                Best Response
                              </div>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-7 w-7 text-green-700 hover:text-green-800"
                                onClick={() => copyToClipboard(cluster.best_response!)}
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                            <p className="text-sm text-green-800 dark:text-green-300">
                              "{cluster.best_response}"
                            </p>
                          </div>
                        )}

                        {/* Expanded Details */}
                        <CollapsibleContent className="mt-3 space-y-3">
                          {/* Rebuttal Framework */}
                          {cluster.rebuttal_framework && (
                            <div className="p-2 bg-muted/50 rounded text-sm">
                              <span className="font-medium">Framework:</span>{' '}
                              <span className="text-muted-foreground">{cluster.rebuttal_framework}</span>
                            </div>
                          )}

                          {/* Example objection */}
                          <div className="text-sm">
                            <div className="flex items-center gap-1 text-muted-foreground mb-1">
                              <MessageSquare className="h-3.5 w-3.5" />
                              Example:
                            </div>
                            <p className="italic text-muted-foreground pl-4">
                              "{cluster.representative_objection}"
                            </p>
                          </div>

                          {/* Variations */}
                          {cluster.variations && cluster.variations.length > 0 && (
                            <div className="text-sm">
                              <p className="text-muted-foreground mb-1">Also heard as:</p>
                              <ul className="pl-4 space-y-1">
                                {cluster.variations.slice(0, 3).map((v, i) => (
                                  <li key={i} className="text-xs text-muted-foreground italic">• "{v}"</li>
                                ))}
                                {cluster.variations.length > 3 && (
                                  <li className="text-xs text-muted-foreground">
                                    +{cluster.variations.length - 3} more variations
                                  </li>
                                )}
                              </ul>
                            </div>
                          )}
                        </CollapsibleContent>
                      </CardContent>
                    </Card>
                  </Collapsible>
                );
              })}
            </div>
          ) : (
            /* Quick Reference View */
            <div className="space-y-6">
              {Object.entries(groupedByCategory).map(([category, categoryCluster]) => (
                <div key={category}>
                  <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2">
                    <Badge className={CATEGORY_COLORS[category] || CATEGORY_COLORS['Other']} variant="secondary">
                      {category}
                    </Badge>
                  </h3>
                  <div className="space-y-2">
                    {categoryCluster.map(cluster => (
                      <div 
                        key={cluster.id} 
                        className="flex items-start justify-between gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{cluster.cluster_name}</p>
                          {cluster.best_response && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              → {cluster.best_response}
                            </p>
                          )}
                        </div>
                        {cluster.best_response && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 shrink-0"
                            onClick={() => copyToClipboard(cluster.best_response!)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
