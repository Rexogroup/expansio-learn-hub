import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { BookOpen, Search, TrendingUp, MessageSquare, Lightbulb, Trash2, Layers, Target, AlertTriangle, CheckCircle2 } from "lucide-react";

interface ObjectionAsset {
  id: string;
  title: string;
  content: {
    objection_category: string;
    objection_text: string;
    suggested_response: string;
    coaching_notes: string;
    score: number;
    frequency: number;
    last_seen: string;
  };
  created_at: string;
  updated_at: string;
}

interface ObjectionCluster {
  id: string;
  category: string;
  cluster_name: string;
  representative_objection: string;
  variations: string[];
  best_response: string | null;
  best_response_score: number | null;
  total_occurrences: number;
  avg_handling_score: number | null;
  source_asset_ids: string[];
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

export const ObjectionPlaybook = () => {
  const [objections, setObjections] = useState<ObjectionAsset[]>([]);
  const [clusters, setClusters] = useState<ObjectionCluster[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'clusters' | 'raw'>('clusters');
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [objResult, clusterResult] = await Promise.all([
        supabase
          .from('user_assets')
          .select('*')
          .eq('user_id', user.id)
          .eq('asset_type', 'objection')
          .order('updated_at', { ascending: false }),
        supabase
          .from('objection_clusters')
          .select('*')
          .eq('user_id', user.id)
          .order('total_occurrences', { ascending: false })
      ]);

      if (objResult.error) throw objResult.error;
      if (clusterResult.error) throw clusterResult.error;

      setObjections((objResult.data || []).map(item => ({
        ...item,
        content: item.content as ObjectionAsset['content']
      })));

      setClusters((clusterResult.data || []).map(item => ({
        ...item,
        variations: item.variations || [],
        source_asset_ids: item.source_asset_ids || []
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

  const handleDeleteObjection = async (id: string) => {
    try {
      const { error } = await supabase
        .from('user_assets')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setObjections(prev => prev.filter(obj => obj.id !== id));
      toast({
        title: "Objection removed",
        description: "Removed from your playbook",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not delete objection",
        variant: "destructive",
      });
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
        description: "Cluster deleted from your playbook",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not delete cluster",
        variant: "destructive",
      });
    }
  };

  // Group raw objections by category
  const groupedObjections = objections.reduce((acc, obj) => {
    const category = obj.content?.objection_category || 'Other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(obj);
    return acc;
  }, {} as Record<string, ObjectionAsset[]>);

  // Filter raw objections
  const filteredGroups = Object.entries(groupedObjections)
    .filter(([category]) => !selectedCategory || category === selectedCategory)
    .map(([category, items]) => ({
      category,
      items: items.filter(item => 
        !searchQuery || 
        item.content?.objection_text?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.content?.suggested_response?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }))
    .filter(group => group.items.length > 0);

  // Filter clusters
  const filteredClusters = clusters
    .filter(c => !selectedCategory || c.category === selectedCategory)
    .filter(c => 
      !searchQuery ||
      c.cluster_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.representative_objection.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.variations?.some(v => v.toLowerCase().includes(searchQuery.toLowerCase()))
    );

  // Stats
  const categories = [...new Set([...Object.keys(groupedObjections), ...clusters.map(c => c.category)])];
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
            <Skeleton key={i} className="h-20 w-full" />
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
                <p className="text-sm text-muted-foreground">Clusters</p>
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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Objection Playbook
              </CardTitle>
              <CardDescription>
                Your AI-clustered objection patterns and best responses
              </CardDescription>
            </div>
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'clusters' | 'raw')}>
              <TabsList>
                <TabsTrigger value="clusters" className="gap-1">
                  <Layers className="h-4 w-4" />
                  Clusters
                </TabsTrigger>
                <TabsTrigger value="raw" className="gap-1">
                  <MessageSquare className="h-4 w-4" />
                  Raw
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
              All
            </Badge>
            {categories.map(cat => (
              <Badge
                key={cat}
                variant={selectedCategory === cat ? "default" : "outline"}
                className={`cursor-pointer ${selectedCategory === cat ? '' : CATEGORY_COLORS[cat] || CATEGORY_COLORS['Other']}`}
                onClick={() => setSelectedCategory(cat === selectedCategory ? null : cat)}
              >
                {cat}
              </Badge>
            ))}
          </div>

          {/* Clusters View */}
          {viewMode === 'clusters' && (
            <>
              {clusters.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Layers className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No objection clusters yet</p>
                  <p className="text-sm">Analyze sales calls to start building AI-clustered patterns</p>
                </div>
              ) : filteredClusters.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No clusters match your search</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredClusters.map((cluster) => {
                    const avgScore = cluster.avg_handling_score || 0;
                    const isMastered = avgScore >= 7;
                    const isStruggling = avgScore > 0 && avgScore < 6;

                    return (
                      <Card key={cluster.id} className={`border ${isMastered ? 'border-green-200 dark:border-green-800' : isStruggling ? 'border-amber-200 dark:border-amber-800' : ''}`}>
                        <CardContent className="pt-4 space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge className={CATEGORY_COLORS[cluster.category] || CATEGORY_COLORS['Other']}>
                                {cluster.category}
                              </Badge>
                              <span className="font-semibold">{cluster.cluster_name}</span>
                              {isMastered && (
                                <Badge variant="outline" className="text-green-600 border-green-300">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Mastered
                                </Badge>
                              )}
                              {isStruggling && (
                                <Badge variant="outline" className="text-amber-600 border-amber-300">
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  Needs Work
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {cluster.total_occurrences}x seen
                              </Badge>
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

                          {/* Score bar */}
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-muted-foreground w-20">Avg Score:</span>
                            <Progress 
                              value={avgScore * 10} 
                              className={`flex-1 h-2 ${isMastered ? '[&>div]:bg-green-500' : isStruggling ? '[&>div]:bg-amber-500' : ''}`}
                            />
                            <span className={`text-sm font-medium ${isMastered ? 'text-green-600' : isStruggling ? 'text-amber-600' : ''}`}>
                              {avgScore.toFixed(1)}/10
                            </span>
                          </div>

                          {/* Representative objection */}
                          <div className="flex items-start gap-2">
                            <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5" />
                            <p className="text-sm">"{cluster.representative_objection}"</p>
                          </div>

                          {/* Variations */}
                          {cluster.variations && cluster.variations.length > 0 && (
                            <div className="pl-6 space-y-1">
                              <p className="text-xs text-muted-foreground">Also heard as:</p>
                              {cluster.variations.slice(0, 2).map((v, i) => (
                                <p key={i} className="text-xs text-muted-foreground italic">• "{v}"</p>
                              ))}
                              {cluster.variations.length > 2 && (
                                <p className="text-xs text-muted-foreground">+{cluster.variations.length - 2} more</p>
                              )}
                            </div>
                          )}

                          {/* Best response */}
                          {cluster.best_response && (
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 text-sm font-medium text-green-600">
                                <Lightbulb className="h-4 w-4" />
                                Best Response ({cluster.best_response_score}/10)
                              </div>
                              <p className="text-sm bg-green-50 dark:bg-green-950/30 p-3 rounded-lg border border-green-200 dark:border-green-800">
                                "{cluster.best_response}"
                              </p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* Raw Objections View */}
          {viewMode === 'raw' && (
            <>
              {objections.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No objections in your playbook yet</p>
                  <p className="text-sm">Analyze a call transcript to start building your playbook</p>
                </div>
              ) : filteredGroups.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No objections match your search</p>
                </div>
              ) : (
                <Accordion type="multiple" className="space-y-2">
                  {filteredGroups.map(({ category, items }) => (
                    <AccordionItem key={category} value={category} className="border rounded-lg px-4">
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-3">
                          <Badge className={CATEGORY_COLORS[category] || CATEGORY_COLORS['Other']}>
                            {category}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {items.length} objection{items.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-4 pt-2">
                        {items.map((obj) => (
                          <div key={obj.id} className="border rounded-lg p-4 space-y-3">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-2">
                                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium text-sm">
                                  "{obj.content?.objection_text}"
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  <TrendingUp className="h-3 w-3 mr-1" />
                                  {obj.content?.frequency || 1}x
                                </Badge>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                  onClick={() => handleDeleteObjection(obj.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-sm font-medium text-green-600">
                                <Lightbulb className="h-4 w-4" />
                                Best Response
                              </div>
                              <p className="text-sm bg-green-50 dark:bg-green-950/30 p-3 rounded-lg border border-green-200 dark:border-green-800">
                                "{obj.content?.suggested_response}"
                              </p>
                            </div>

                            {obj.content?.coaching_notes && (
                              <p className="text-xs text-muted-foreground">
                                💡 {obj.content.coaching_notes}
                              </p>
                            )}
                          </div>
                        ))}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
