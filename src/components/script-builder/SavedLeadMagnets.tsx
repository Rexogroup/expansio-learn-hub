import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Copy, Download, Trash2, Star, Edit2, Search, Filter } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import ReactMarkdown from "react-markdown";

interface SavedLeadMagnet {
  id: string;
  title: string;
  content: string;
  category: string;
  created_at: string;
}

const CATEGORIES = [
  { value: "all", label: "All Categories" },
  { value: "general", label: "General" },
  { value: "seo", label: "SEO" },
  { value: "ads", label: "Ads & Creatives" },
  { value: "cro", label: "CRO" },
  { value: "content", label: "Content Marketing" },
  { value: "email", label: "Email Marketing" },
  { value: "social", label: "Social Media" },
  { value: "web", label: "Web Development" },
  { value: "ai", label: "AI Services" },
  { value: "other", label: "Other" },
];

const SavedLeadMagnets = () => {
  const [leadMagnets, setLeadMagnets] = useState<SavedLeadMagnet[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [editingItem, setEditingItem] = useState<SavedLeadMagnet | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editCategory, setEditCategory] = useState("");

  useEffect(() => {
    loadLeadMagnets();
  }, []);

  const loadLeadMagnets = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("saved_lead_magnets")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setLeadMagnets(data || []);
    } catch (error: any) {
      console.error("Error loading lead magnets:", error);
      toast.error("Failed to load saved lead magnets");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (content: string) => {
    await navigator.clipboard.writeText(content);
    toast.success("Copied to clipboard");
  };

  const handleDownload = (item: SavedLeadMagnet) => {
    const blob = new Blob([item.content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${item.title}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Lead magnet downloaded");
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("saved_lead_magnets")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Lead magnet removed from favorites");
      loadLeadMagnets();
    } catch (error: any) {
      console.error("Error deleting lead magnet:", error);
      toast.error("Failed to delete lead magnet");
    }
  };

  const handleEdit = (item: SavedLeadMagnet) => {
    setEditingItem(item);
    setEditTitle(item.title);
    setEditCategory(item.category);
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;

    try {
      const { error } = await supabase
        .from("saved_lead_magnets")
        .update({ title: editTitle, category: editCategory })
        .eq("id", editingItem.id);

      if (error) throw error;

      toast.success("Lead magnet updated");
      setEditingItem(null);
      loadLeadMagnets();
    } catch (error: any) {
      console.error("Error updating lead magnet:", error);
      toast.error("Failed to update lead magnet");
    }
  };

  const filteredLeadMagnets = leadMagnets.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      categoryFilter === "all" || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const getCategoryLabel = (value: string) => {
    return CATEGORIES.find((c) => c.value === value)?.label || value;
  };

  if (loading) {
    return <div className="text-center py-8">Loading saved lead magnets...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <h2 className="text-2xl font-semibold flex items-center gap-2">
          <Star className="h-6 w-6 text-yellow-500" />
          Favorite Lead Magnets
        </h2>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search lead magnets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-full sm:w-64"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {leadMagnets.length === 0 ? (
        <Card className="p-12 text-center">
          <Star className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No favorite lead magnets yet</h3>
          <p className="text-muted-foreground">
            Save your best lead magnets from conversations using the star button
          </p>
        </Card>
      ) : filteredLeadMagnets.length === 0 ? (
        <Card className="p-12 text-center">
          <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No results found</h3>
          <p className="text-muted-foreground">
            Try adjusting your search or filter criteria
          </p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredLeadMagnets.map((item) => (
            <Card key={item.id} className="p-6">
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <Star className="h-5 w-5 text-yellow-500 flex-shrink-0" />
                      <h3 className="text-lg font-semibold truncate">{item.title}</h3>
                      <Badge variant="secondary" className="flex-shrink-0">
                        {getCategoryLabel(item.category)}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Saved{" "}
                      {formatDistanceToNow(new Date(item.created_at), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(item)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="bg-muted/50 p-4 rounded-lg max-h-64 overflow-y-auto">
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <ReactMarkdown>{item.content}</ReactMarkdown>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopy(item.content)}
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    Copy
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(item)}
                  >
                    <Download className="h-3 w-3 mr-1" />
                    Download
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(item.id)}
                    className="text-destructive"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Remove
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Lead Magnet</DialogTitle>
            <DialogDescription>
              Update the title and category of your saved lead magnet.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-category">Category</Label>
              <Select value={editCategory} onValueChange={setEditCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.filter((c) => c.value !== "all").map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingItem(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SavedLeadMagnets;
