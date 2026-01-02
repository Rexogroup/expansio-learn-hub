import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { BookOpen, Search, TrendingUp, MessageSquare, Lightbulb, Trash2 } from "lucide-react";

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

const CATEGORY_COLORS: Record<string, string> = {
  'Price/Budget': 'bg-emerald-100 text-emerald-800',
  'Timing': 'bg-blue-100 text-blue-800',
  'Competition': 'bg-purple-100 text-purple-800',
  'Authority': 'bg-orange-100 text-orange-800',
  'Need': 'bg-pink-100 text-pink-800',
  'Trust': 'bg-cyan-100 text-cyan-800',
  'Stall': 'bg-amber-100 text-amber-800',
  'Other': 'bg-gray-100 text-gray-800',
};

export const ObjectionPlaybook = () => {
  const [objections, setObjections] = useState<ObjectionAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchObjections();
  }, []);

  const fetchObjections = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_assets')
        .select('*')
        .eq('user_id', user.id)
        .eq('asset_type', 'objection')
        .order('updated_at', { ascending: false });

      if (error) throw error;

      setObjections((data || []).map(item => ({
        ...item,
        content: item.content as ObjectionAsset['content']
      })));
    } catch (error) {
      console.error('Error fetching objections:', error);
      toast({
        title: "Error loading playbook",
        description: "Could not load your objection playbook",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
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

  // Group by category
  const groupedObjections = objections.reduce((acc, obj) => {
    const category = obj.content?.objection_category || 'Other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(obj);
    return acc;
  }, {} as Record<string, ObjectionAsset[]>);

  // Filter
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

  const categories = Object.keys(groupedObjections);
  const totalFrequency = objections.reduce((sum, obj) => sum + (obj.content?.frequency || 1), 0);

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
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{objections.length}</div>
            <p className="text-sm text-muted-foreground">Unique Objections</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{categories.length}</div>
            <p className="text-sm text-muted-foreground">Categories</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{totalFrequency}</div>
            <p className="text-sm text-muted-foreground">Times Encountered</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Playbook */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Objection Playbook
          </CardTitle>
          <CardDescription>
            Your personal collection of objections and best responses
          </CardDescription>
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
              All ({objections.length})
            </Badge>
            {categories.map(cat => (
              <Badge
                key={cat}
                variant={selectedCategory === cat ? "default" : "outline"}
                className={`cursor-pointer ${selectedCategory === cat ? '' : CATEGORY_COLORS[cat] || CATEGORY_COLORS['Other']}`}
                onClick={() => setSelectedCategory(cat === selectedCategory ? null : cat)}
              >
                {cat} ({groupedObjections[cat].length})
              </Badge>
            ))}
          </div>

          {/* Objections List */}
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
                              onClick={() => handleDelete(obj.id)}
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
        </CardContent>
      </Card>
    </div>
  );
};
