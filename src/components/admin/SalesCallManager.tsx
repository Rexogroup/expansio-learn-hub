import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Trash2, Upload, Plus, Loader2 } from "lucide-react";

interface SalesCall {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  duration: number | null;
  tags: string[] | null;
  industry: string | null;
  deal_size: string | null;
  notes: string | null;
  is_featured: boolean;
  order_index: number;
  brand_id: string | null;
  call_sequence: number | null;
  call_label: string | null;
}

export function SalesCallManager() {
  const [calls, setCalls] = useState<SalesCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [brands, setBrands] = useState<{ id: string; name: string }[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadingFile, setUploadingFile] = useState<'video' | 'thumbnail' | null>(null);
  const [uploadedBytes, setUploadedBytes] = useState<number>(0);
  const [totalBytes, setTotalBytes] = useState<number>(0);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    video_url: "",
    thumbnail_url: "",
    duration: "",
    tags: "",
    industry: "",
    deal_size: "",
    notes: "",
    is_featured: false,
    order_index: 0,
    brand_id: "",
    call_sequence: "",
    call_label: "",
  });

  useEffect(() => {
    fetchCalls();
    fetchBrands();
  }, []);

  const fetchBrands = async () => {
    try {
      const { data, error } = await supabase
        .from("brands")
        .select("id, name")
        .order("name");

      if (error) throw error;
      setBrands(data || []);
    } catch (error) {
      console.error("Error fetching brands:", error);
    }
  };

  const fetchCalls = async () => {
    try {
      const { data, error } = await supabase
        .from("sales_calls")
        .select("*")
        .order("order_index");

      if (error) throw error;
      setCalls(data || []);
    } catch (error) {
      console.error("Error fetching sales calls:", error);
      toast.error("Failed to load sales calls");
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleFileUpload = async (file: File, type: "video" | "thumbnail") => {
    setUploading(true);
    setUploadingFile(type);
    setUploadProgress(0);
    setUploadedBytes(0);
    setTotalBytes(file.size);

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.user) throw new Error("Not authenticated");

      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      // Get the storage URL and auth token
      const { data: { session: authSession } } = await supabase.auth.getSession();
      const token = authSession?.access_token;
      
      const projectUrl = import.meta.env.VITE_SUPABASE_URL;
      const uploadUrl = `${projectUrl}/storage/v1/object/sales-calls/${filePath}`;

      // Create XMLHttpRequest for progress tracking
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const progress = Math.round((e.loaded / e.total) * 100);
            setUploadProgress(progress);
            setUploadedBytes(e.loaded);
            setTotalBytes(e.total);
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('Upload failed'));
        });

        xhr.open('POST', uploadUrl);
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.setRequestHeader('apikey', import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);
        xhr.setRequestHeader('x-upsert', 'false');

        const formData = new FormData();
        formData.append('cacheControl', '3600');
        formData.append('', file);

        xhr.send(formData);
      });

      const { data: { publicUrl } } = supabase.storage
        .from("sales-calls")
        .getPublicUrl(filePath);

      setFormData((prev) => ({
        ...prev,
        [type === "video" ? "video_url" : "thumbnail_url"]: publicUrl,
      }));

      toast.success(`${type === "video" ? "Video" : "Thumbnail"} uploaded successfully`);
    } catch (error) {
      console.error("Error uploading file:", error);
      toast.error("Failed to upload file");
      setUploadProgress(0);
    } finally {
      setUploading(false);
      setUploadingFile(null);
      setTimeout(() => {
        setUploadProgress(0);
        setUploadedBytes(0);
        setTotalBytes(0);
      }, 2000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.video_url) {
      toast.error("Title and video are required");
      return;
    }

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.user) throw new Error("Not authenticated");

      const tagsArray = formData.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);

      const callData = {
        title: formData.title,
        description: formData.description || null,
        video_url: formData.video_url,
        thumbnail_url: formData.thumbnail_url || null,
        duration: formData.duration ? parseInt(formData.duration) : null,
        tags: tagsArray.length > 0 ? tagsArray : null,
        industry: formData.industry || null,
        deal_size: formData.deal_size || null,
        notes: formData.notes || null,
        is_featured: formData.is_featured,
        order_index: formData.order_index,
        brand_id: formData.brand_id || null,
        call_sequence: formData.call_sequence ? parseInt(formData.call_sequence) : null,
        call_label: formData.call_label || null,
        created_by: session.session.user.id,
      };

      if (editingId) {
        const { error } = await supabase
          .from("sales_calls")
          .update(callData)
          .eq("id", editingId);

        if (error) throw error;
        toast.success("Sales call updated successfully");
      } else {
        const { error } = await supabase.from("sales_calls").insert([callData]);

        if (error) throw error;
        toast.success("Sales call created successfully");
      }

      resetForm();
      fetchCalls();
    } catch (error) {
      console.error("Error saving sales call:", error);
      toast.error("Failed to save sales call");
    }
  };

  const handleEdit = (call: SalesCall) => {
    setEditingId(call.id);
    setFormData({
      title: call.title,
      description: call.description || "",
      video_url: call.video_url,
      thumbnail_url: call.thumbnail_url || "",
      duration: call.duration?.toString() || "",
      tags: call.tags?.join(", ") || "",
      industry: call.industry || "",
      deal_size: call.deal_size || "",
      notes: call.notes || "",
      is_featured: call.is_featured,
      order_index: call.order_index,
      brand_id: call.brand_id || "",
      call_sequence: call.call_sequence?.toString() || "",
      call_label: call.call_label || "",
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this sales call?")) return;

    try {
      const { error } = await supabase.from("sales_calls").delete().eq("id", id);

      if (error) throw error;
      toast.success("Sales call deleted successfully");
      fetchCalls();
    } catch (error) {
      console.error("Error deleting sales call:", error);
      toast.error("Failed to delete sales call");
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      title: "",
      description: "",
      video_url: "",
      thumbnail_url: "",
      duration: "",
      tags: "",
      industry: "",
      deal_size: "",
      notes: "",
      is_featured: false,
      order_index: 0,
      brand_id: "",
      call_sequence: "",
      call_label: "",
    });
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{editingId ? "Edit Sales Call" : "Add New Sales Call"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="brand">Brand *</Label>
                <select
                  id="brand"
                  value={formData.brand_id}
                  onChange={(e) => setFormData({ ...formData, brand_id: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  required
                >
                  <option value="">Select a brand</option>
                  {brands.map((brand) => (
                    <option key={brand.id} value={brand.id}>
                      {brand.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="call_sequence">Call Sequence</Label>
                <Input
                  id="call_sequence"
                  type="number"
                  value={formData.call_sequence}
                  onChange={(e) => setFormData({ ...formData, call_sequence: e.target.value })}
                  placeholder="e.g., 1, 2, 3"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="call_label">Call Label</Label>
                <Input
                  id="call_label"
                  value={formData.call_label}
                  onChange={(e) => setFormData({ ...formData, call_label: e.target.value })}
                  placeholder="e.g., Discovery Call, Demo"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="order_index">Order Index</Label>
                <Input
                  id="order_index"
                  type="number"
                  value={formData.order_index}
                  onChange={(e) =>
                    setFormData({ ...formData, order_index: parseInt(e.target.value) || 0 })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="industry">Industry</Label>
                <Input
                  id="industry"
                  value={formData.industry}
                  onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="deal_size">Deal Size</Label>
                <Input
                  id="deal_size"
                  value={formData.deal_size}
                  onChange={(e) => setFormData({ ...formData, deal_size: e.target.value })}
                  placeholder="e.g., $10k-$50k"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration">Duration (seconds)</Label>
                <Input
                  id="duration"
                  type="number"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tags">Tags (comma-separated)</Label>
                <Input
                  id="tags"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="objection handling, closing, discovery"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Commentary & Insights</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={4}
                placeholder="Share your insights about this call..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="video">Video File *</Label>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    id="video"
                    type="file"
                    accept="video/*,audio/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, "video");
                    }}
                    disabled={uploading}
                  />
                  {formData.video_url && !uploadingFile && (
                    <Button type="button" variant="outline" size="sm" disabled>
                      <Upload className="w-4 h-4 mr-2" />
                      Uploaded
                    </Button>
                  )}
                </div>
                {uploadingFile === 'video' && (
                  <div className="space-y-2 p-3 border rounded-lg bg-muted/50">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="font-medium">Uploading video...</span>
                      </div>
                      <span className="text-muted-foreground font-mono">{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} className="h-2" />
                    <div className="text-xs text-muted-foreground">
                      {formatBytes(uploadedBytes)} / {formatBytes(totalBytes)}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="thumbnail">Thumbnail (optional)</Label>
              <div className="space-y-2">
                <Input
                  id="thumbnail"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file, "thumbnail");
                  }}
                  disabled={uploading}
                />
                {uploadingFile === 'thumbnail' && (
                  <div className="space-y-2 p-3 border rounded-lg bg-muted/50">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="font-medium">Uploading thumbnail...</span>
                      </div>
                      <span className="text-muted-foreground font-mono">{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} className="h-2" />
                    <div className="text-xs text-muted-foreground">
                      {formatBytes(uploadedBytes)} / {formatBytes(totalBytes)}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="is_featured"
                checked={formData.is_featured}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_featured: checked })
                }
              />
              <Label htmlFor="is_featured">Featured Call</Label>
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={uploading}>
                {editingId ? "Update" : "Create"} Sales Call
              </Button>
              {editingId && (
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing Sales Calls</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {calls.map((call) => (
              <div
                key={call.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex-1">
                  <h3 className="font-semibold">{call.title}</h3>
                  <p className="text-sm text-muted-foreground">{call.description}</p>
                  <div className="flex gap-2 mt-2">
                    {call.is_featured && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                        Featured
                      </span>
                    )}
                    {call.industry && (
                      <span className="text-xs bg-muted px-2 py-1 rounded">
                        {call.industry}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(call)}>
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(call.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
