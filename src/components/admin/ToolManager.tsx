import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Pencil, Trash2, Upload } from "lucide-react";

interface Tool {
  id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  price: string | null;
  thumbnail_url: string | null;
  affiliate_link: string;
  is_published: boolean;
  order_index: number;
  features: string[] | null;
}

interface ToolCategory {
  id: string;
  name: string;
}

export const ToolManager = () => {
  const [editingTool, setEditingTool] = useState<Tool | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    category_id: "",
    affiliate_link: "",
    is_published: false,
    order_index: 0,
    features: [] as string[],
  });
  const [featureInput, setFeatureInput] = useState("");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: categories } = useQuery({
    queryKey: ["tool-categories-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tool_categories")
        .select("id, name")
        .order("order_index", { ascending: true });
      if (error) throw error;
      return data as ToolCategory[];
    },
  });

  const { data: tools, isLoading } = useQuery({
    queryKey: ["tools-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tools")
        .select("*")
        .order("order_index", { ascending: true });
      if (error) throw error;
      return data as Tool[];
    },
  });

  const uploadThumbnail = async (file: File): Promise<string> => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage
      .from("tool-thumbnails")
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from("tool-thumbnails")
      .getPublicUrl(fileName);

    return data.publicUrl;
  };

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: userData } = await supabase.auth.getUser();
      let thumbnail_url = null;

      if (thumbnailFile) {
        thumbnail_url = await uploadThumbnail(thumbnailFile);
      }

      const { error } = await supabase.from("tools").insert({
        ...data,
        thumbnail_url,
        category_id: data.category_id || null,
        features: data.features.length > 0 ? data.features : null,
        created_by: userData.user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tools-admin"] });
      toast({ title: "Tool created successfully" });
      resetForm();
    },
    onError: () => {
      toast({ title: "Failed to create tool", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      let thumbnail_url = editingTool?.thumbnail_url;

      if (thumbnailFile) {
        thumbnail_url = await uploadThumbnail(thumbnailFile);
      }

      const { error } = await supabase
        .from("tools")
        .update({
          ...data,
          thumbnail_url,
          category_id: data.category_id || null,
          features: data.features.length > 0 ? data.features : null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tools-admin"] });
      toast({ title: "Tool updated successfully" });
      resetForm();
    },
    onError: () => {
      toast({ title: "Failed to update tool", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tools").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tools-admin"] });
      toast({ title: "Tool deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete tool", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      price: "",
      category_id: "",
      affiliate_link: "",
      is_published: false,
      order_index: 0,
      features: [],
    });
    setFeatureInput("");
    setThumbnailFile(null);
    setEditingTool(null);
    setIsCreating(false);
  };

  const handleEdit = (tool: Tool) => {
    setEditingTool(tool);
    setFormData({
      name: tool.name,
      description: tool.description || "",
      price: tool.price || "",
      category_id: tool.category_id || "",
      affiliate_link: tool.affiliate_link,
      is_published: tool.is_published,
      order_index: tool.order_index,
      features: Array.isArray(tool.features) ? tool.features : [],
    });
    setIsCreating(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTool) {
      updateMutation.mutate({ id: editingTool.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const addFeature = () => {
    if (featureInput.trim()) {
      setFormData({
        ...formData,
        features: [...formData.features, featureInput.trim()],
      });
      setFeatureInput("");
    }
  };

  const removeFeature = (index: number) => {
    setFormData({
      ...formData,
      features: formData.features.filter((_, i) => i !== index),
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Tools</h2>
        <Button onClick={() => setIsCreating(true)} disabled={isCreating}>
          <Plus className="h-4 w-4 mr-2" />
          Add Tool
        </Button>
      </div>

      {isCreating && (
        <Card>
          <CardHeader>
            <CardTitle>{editingTool ? "Edit Tool" : "Create Tool"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={4}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="price">Price (e.g., "$29/mo" or "Free")</Label>
                  <Input
                    id="price"
                    value={formData.price}
                    onChange={(e) =>
                      setFormData({ ...formData, price: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={formData.category_id}
                    onValueChange={(value) =>
                      setFormData({ ...formData, category_id: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories?.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="affiliate_link">Affiliate Link *</Label>
                <Input
                  id="affiliate_link"
                  type="url"
                  value={formData.affiliate_link}
                  onChange={(e) =>
                    setFormData({ ...formData, affiliate_link: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="thumbnail">Thumbnail Image</Label>
                <Input
                  id="thumbnail"
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    setThumbnailFile(e.target.files?.[0] || null)
                  }
                />
                {editingTool?.thumbnail_url && !thumbnailFile && (
                  <img
                    src={editingTool.thumbnail_url}
                    alt="Current thumbnail"
                    className="mt-2 h-32 rounded object-cover"
                  />
                )}
              </div>
              <div>
                <Label>Features</Label>
                <div className="flex gap-2 mb-2">
                  <Input
                    value={featureInput}
                    onChange={(e) => setFeatureInput(e.target.value)}
                    placeholder="Add a feature"
                    onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addFeature())}
                  />
                  <Button type="button" onClick={addFeature}>
                    Add
                  </Button>
                </div>
                <div className="space-y-2">
                  {formData.features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className="flex-1 text-sm">{feature}</span>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        onClick={() => removeFeature(index)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="order_index">Order Index</Label>
                  <Input
                    id="order_index"
                    type="number"
                    value={formData.order_index}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        order_index: parseInt(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_published"
                    checked={formData.is_published}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, is_published: checked })
                    }
                  />
                  <Label htmlFor="is_published">Published</Label>
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit">
                  {editingTool ? "Update" : "Create"}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {tools?.map((tool) => (
          <Card key={tool.id}>
            <CardContent className="flex items-start justify-between p-4">
              <div className="flex gap-4">
                {tool.thumbnail_url && (
                  <img
                    src={tool.thumbnail_url}
                    alt={tool.name}
                    className="w-24 h-24 rounded object-cover"
                  />
                )}
                <div>
                  <h3 className="font-semibold">{tool.name}</h3>
                  {tool.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {tool.description}
                    </p>
                  )}
                  <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                    {tool.price && <span>Price: {tool.price}</span>}
                    <span>Order: {tool.order_index}</span>
                    <span>{tool.is_published ? "Published" : "Draft"}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleEdit(tool)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => deleteMutation.mutate(tool.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
