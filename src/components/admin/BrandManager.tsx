import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Trash2, Plus, Upload } from "lucide-react";

interface Brand {
  id: string;
  name: string;
  logo_url: string | null;
  arr_value: string | null;
  order_index: number;
  created_at: string;
}

export function BrandManager() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    arr_value: "",
    order_index: 0,
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchBrands();
  }, []);

  const fetchBrands = async () => {
    try {
      const { data, error } = await supabase
        .from("brands")
        .select("*")
        .order("order_index", { ascending: true });

      if (error) throw error;
      setBrands(data || []);
    } catch (error) {
      console.error("Error fetching brands:", error);
      toast({
        title: "Error",
        description: "Failed to fetch brands",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (brandId?: string): Promise<string | null> => {
    if (!logoFile) return null;

    setUploading(true);
    try {
      const fileExt = logoFile.name.split(".").pop();
      const fileName = `${brandId || Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("brand-logos")
        .upload(filePath, logoFile, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("brand-logos")
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error("Error uploading logo:", error);
      toast({
        title: "Error",
        description: "Failed to upload logo",
        variant: "destructive",
      });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      let logoUrl = null;
      if (logoFile) {
        logoUrl = await handleLogoUpload(editingId || undefined);
        if (!logoUrl && logoFile) {
          setUploading(false);
          return;
        }
      }

      if (editingId) {
        const updateData: any = {
          name: formData.name,
          arr_value: formData.arr_value,
          order_index: formData.order_index,
        };
        if (logoUrl) updateData.logo_url = logoUrl;

        const { error } = await supabase
          .from("brands")
          .update(updateData)
          .eq("id", editingId);

        if (error) throw error;
        toast({ title: "Success", description: "Brand updated successfully" });
      } else {
        const { error } = await supabase.from("brands").insert({
          name: formData.name,
          arr_value: formData.arr_value,
          order_index: formData.order_index,
          logo_url: logoUrl,
          created_by: user.id,
        });

        if (error) throw error;
        toast({ title: "Success", description: "Brand created successfully" });
      }

      resetForm();
      fetchBrands();
    } catch (error) {
      console.error("Error saving brand:", error);
      toast({
        title: "Error",
        description: "Failed to save brand",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (brand: Brand) => {
    setEditingId(brand.id);
    setFormData({
      name: brand.name,
      arr_value: brand.arr_value || "",
      order_index: brand.order_index,
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this brand?")) return;

    try {
      const { error } = await supabase.from("brands").delete().eq("id", id);
      if (error) throw error;
      
      toast({ title: "Success", description: "Brand deleted successfully" });
      fetchBrands();
    } catch (error) {
      console.error("Error deleting brand:", error);
      toast({
        title: "Error",
        description: "Failed to delete brand",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({ name: "", arr_value: "", order_index: 0 });
    setLogoFile(null);
  };

  if (loading) {
    return <div className="p-4">Loading brands...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{editingId ? "Edit Brand" : "Add New Brand"}</CardTitle>
          <CardDescription>
            Create and manage client brands for organizing sales calls
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Brand Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Lifesum, Lingopie"
                required
              />
            </div>

            <div>
              <Label htmlFor="logo">Brand Logo</Label>
              <Input
                id="logo"
                type="file"
                accept="image/*"
                onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
              />
            </div>

            <div>
              <Label htmlFor="arr">ARR Value</Label>
              <Input
                id="arr"
                value={formData.arr_value}
                onChange={(e) => setFormData({ ...formData, arr_value: e.target.value })}
                placeholder="e.g., 25M, 20M"
              />
            </div>

            <div>
              <Label htmlFor="order">Order Index</Label>
              <Input
                id="order"
                type="number"
                value={formData.order_index}
                onChange={(e) => setFormData({ ...formData, order_index: parseInt(e.target.value) })}
              />
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={uploading}>
                {uploading ? "Saving..." : editingId ? "Update Brand" : "Add Brand"}
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

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Existing Brands</h3>
        {brands.length === 0 ? (
          <p className="text-muted-foreground">No brands yet. Create your first brand above.</p>
        ) : (
          <div className="grid gap-4">
            {brands.map((brand) => (
              <Card key={brand.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-4">
                    {brand.logo_url && (
                      <img
                        src={brand.logo_url}
                        alt={brand.name}
                        className="w-12 h-12 object-contain rounded"
                      />
                    )}
                    <div>
                      <p className="font-semibold">{brand.name}</p>
                      {brand.arr_value && (
                        <p className="text-sm text-muted-foreground">ARR: {brand.arr_value}</p>
                      )}
                      <p className="text-xs text-muted-foreground">Order: {brand.order_index}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(brand)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(brand.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
