import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Edit, Trash2 } from "lucide-react";

interface Section {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  order_index: number;
}

interface Course {
  id: string;
  title: string;
}

export const SectionManager = () => {
  const [sections, setSections] = useState<Section[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [formData, setFormData] = useState({
    course_id: "",
    title: "",
    description: "",
    order_index: 0,
  });

  useEffect(() => {
    fetchCourses();
    fetchSections();
  }, []);

  const fetchCourses = async () => {
    const { data, error } = await supabase
      .from("courses")
      .select("id, title")
      .order("title");

    if (!error) setCourses(data || []);
  };

  const fetchSections = async () => {
    const { data, error } = await supabase
      .from("sections")
      .select("*")
      .order("course_id")
      .order("order_index");

    if (error) {
      toast.error("Failed to fetch sections");
      return;
    }

    setSections(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingSection) {
        const { error } = await supabase
          .from("sections")
          .update(formData)
          .eq("id", editingSection.id);

        if (error) throw error;
        toast.success("Section updated");
      } else {
        const { error } = await supabase.from("sections").insert(formData);

        if (error) throw error;
        toast.success("Section created");
      }

      setIsDialogOpen(false);
      resetForm();
      fetchSections();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this section?")) return;

    const { error } = await supabase.from("sections").delete().eq("id", id);

    if (error) {
      toast.error("Failed to delete section");
      return;
    }

    toast.success("Section deleted");
    fetchSections();
  };

  const resetForm = () => {
    setFormData({
      course_id: "",
      title: "",
      description: "",
      order_index: 0,
    });
    setEditingSection(null);
  };

  const openEditDialog = (section: Section) => {
    setEditingSection(section);
    setFormData({
      course_id: section.course_id,
      title: section.title,
      description: section.description || "",
      order_index: section.order_index,
    });
    setIsDialogOpen(true);
  };

  const getCourseName = (courseId: string) => {
    return courses.find((c) => c.id === courseId)?.title || "Unknown";
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Sections</h2>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Section
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingSection ? "Edit Section" : "Create Section"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="course">Course</Label>
                <Select
                  value={formData.course_id}
                  onValueChange={(value) => setFormData({ ...formData, course_id: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a course" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map((course) => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
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
                <Label htmlFor="order">Order</Label>
                <Input
                  id="order"
                  type="number"
                  value={formData.order_index}
                  onChange={(e) => setFormData({ ...formData, order_index: parseInt(e.target.value) })}
                  required
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  {editingSection ? "Update" : "Create"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sections.map((section) => (
          <Card key={section.id} className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="text-sm text-muted-foreground mb-1">
                    {getCourseName(section.course_id)}
                  </div>
                  <div>{section.title}</div>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => openEditDialog(section)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleDelete(section.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                {section.description || "No description"}
              </p>
              <span className="text-xs text-muted-foreground">Order: {section.order_index}</span>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
