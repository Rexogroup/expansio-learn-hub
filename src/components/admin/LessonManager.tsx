import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { PdfImporter } from "./PdfImporter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Eye, BookOpen } from "lucide-react";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { sanitizeHtml } from "@/lib/sanitize";
import { optionalUrlSchema } from "@/lib/validation";

interface Lesson {
  id: string;
  section_id: string;
  title: string;
  content: string | null;
  video_url: string | null;
  order_index: number;
}

interface Section {
  id: string;
  title: string;
  course_id: string;
}

interface Course {
  id: string;
  title: string;
}

export const LessonManager = () => {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [filterCourseId, setFilterCourseId] = useState<string>("");
  const [filterSectionId, setFilterSectionId] = useState<string>("");
  const [previewLesson, setPreviewLesson] = useState<Lesson | null>(null);
  const [formData, setFormData] = useState({
    section_id: "",
    title: "",
    content: "",
    video_url: "",
    order_index: 0,
  });

  useEffect(() => {
    fetchCourses();
    fetchSections();
    fetchLessons();
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
      .order("title");

    if (!error) setSections(data || []);
  };

  const fetchLessons = async () => {
    const { data, error } = await supabase
      .from("lessons")
      .select("*")
      .order("section_id")
      .order("order_index");

    if (error) {
      toast.error("Failed to fetch lessons");
      return;
    }

    setLessons(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate video URL if provided
    if (formData.video_url) {
      const urlValidation = optionalUrlSchema.safeParse(formData.video_url);
      if (!urlValidation.success) {
        toast.error(urlValidation.error.errors[0].message);
        return;
      }
    }

    try {
      if (editingLesson) {
        const { error } = await supabase
          .from("lessons")
          .update(formData)
          .eq("id", editingLesson.id);

        if (error) throw error;
        toast.success("Lesson updated");
      } else {
        const { error } = await supabase.from("lessons").insert(formData);

        if (error) throw error;
        toast.success("Lesson created");
      }

      setIsDialogOpen(false);
      resetForm();
      fetchLessons();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this lesson?")) return;

    const { error } = await supabase.from("lessons").delete().eq("id", id);

    if (error) {
      toast.error("Failed to delete lesson");
      return;
    }

    toast.success("Lesson deleted");
    fetchLessons();
  };

  const resetForm = () => {
    setFormData({
      section_id: "",
      title: "",
      content: "",
      video_url: "",
      order_index: 0,
    });
    setEditingLesson(null);
    setSelectedCourseId("");
  };

  const openEditDialog = (lesson: Lesson) => {
    setEditingLesson(lesson);
    const section = sections.find((s) => s.id === lesson.section_id);
    setSelectedCourseId(section?.course_id || "");
    setFormData({
      section_id: lesson.section_id,
      title: lesson.title,
      content: lesson.content || "",
      video_url: lesson.video_url || "",
      order_index: lesson.order_index,
    });
    setIsDialogOpen(true);
  };

  const getSectionName = (sectionId: string) => {
    return sections.find((s) => s.id === sectionId)?.title || "Unknown";
  };

  const getCourseName = (sectionId: string) => {
    const section = sections.find((s) => s.id === sectionId);
    if (!section) return "Unknown";
    return courses.find((c) => c.id === section.course_id)?.title || "Unknown";
  };

  const filteredSections = selectedCourseId
    ? sections.filter((s) => s.course_id === selectedCourseId)
    : [];

  const filterSectionsForFilter = filterCourseId
    ? sections.filter((s) => s.course_id === filterCourseId)
    : [];

  const filteredLessons = lessons.filter((lesson) => {
    if (filterCourseId) {
      const section = sections.find((s) => s.id === lesson.section_id);
      if (section?.course_id !== filterCourseId) return false;
    }
    if (filterSectionId && lesson.section_id !== filterSectionId) return false;
    return true;
  });

  const clearFilters = () => {
    setFilterCourseId("");
    setFilterSectionId("");
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Lessons</h2>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Lesson
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[95vw] h-[95vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>{editingLesson ? "Edit Lesson" : "Create Lesson"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="flex h-full gap-6 overflow-hidden">
              {/* Left Sidebar - Form Controls */}
              <div className="w-80 flex-shrink-0 flex flex-col overflow-hidden border-r pr-6">
                <div className="flex-1 overflow-y-auto space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="course">Course</Label>
                    <Select
                      value={selectedCourseId}
                      onValueChange={(value) => {
                        setSelectedCourseId(value);
                        setFormData({ ...formData, section_id: "" });
                      }}
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
                    <Label htmlFor="section">Section</Label>
                    <Select
                      value={formData.section_id}
                      onValueChange={(value) => setFormData({ ...formData, section_id: value })}
                      required
                      disabled={!selectedCourseId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a section" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredSections.map((section) => (
                          <SelectItem key={section.id} value={section.id}>
                            {section.title}
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
                    <Label htmlFor="video">Video Embed URL</Label>
                    <Input
                      id="video"
                      value={formData.video_url}
                      onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                      placeholder="https://www.loom.com/embed/..."
                    />
                    <p className="text-xs text-muted-foreground">
                      Loom, YouTube, Vimeo embed URLs supported
                    </p>
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
                </div>
                
                {/* Sticky Bottom Buttons */}
                <div className="flex flex-col gap-2 pt-4 border-t mt-4">
                  <Button type="submit" className="w-full">
                    {editingLesson ? "Update Lesson" : "Create Lesson"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false);
                      resetForm();
                    }}
                    className="w-full"
                  >
                    Cancel
                  </Button>
                </div>
              </div>

              {/* Right Main Area - Editor */}
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <Label className="text-lg font-semibold">Lesson Content</Label>
                  <PdfImporter 
                    onContentImported={(html) => setFormData({ ...formData, content: html })}
                  />
                </div>
                
                <div className="flex-1 overflow-y-auto border rounded-lg p-4 bg-background/50">
                  <RichTextEditor
                    content={formData.content}
                    onChange={(content) => setFormData({ ...formData, content })}
                    placeholder="Start writing your lesson content or import from PDF..."
                  />
                </div>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="bg-muted/50 border-border/50">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 space-y-2">
              <Label htmlFor="filter-course">Filter by Course</Label>
              <Select
                value={filterCourseId}
                onValueChange={(value) => {
                  setFilterCourseId(value);
                  setFilterSectionId("");
                }}
              >
                <SelectTrigger id="filter-course">
                  <SelectValue placeholder="All Courses" />
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
            <div className="flex-1 space-y-2">
              <Label htmlFor="filter-section">Filter by Section</Label>
              <Select
                value={filterSectionId}
                onValueChange={setFilterSectionId}
                disabled={!filterCourseId}
              >
                <SelectTrigger id="filter-section">
                  <SelectValue placeholder="All Sections" />
                </SelectTrigger>
                <SelectContent>
                  {filterSectionsForFilter.map((section) => (
                    <SelectItem key={section.id} value={section.id}>
                      {section.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={clearFilters}
                disabled={!filterCourseId && !filterSectionId}
              >
                Clear Filters
              </Button>
            </div>
          </div>
          <div className="mt-4 text-sm text-muted-foreground">
            Showing {filteredLessons.length} of {lessons.length} lessons
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredLessons.map((lesson) => (
          <Card key={lesson.id} className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="text-xs text-muted-foreground mb-1">
                    {getCourseName(lesson.section_id)} / {getSectionName(lesson.section_id)}
                  </div>
                  <div className="text-base">{lesson.title}</div>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setPreviewLesson(lesson)}
                    title="Preview lesson"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => openEditDialog(lesson)}
                    title="Edit lesson"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleDelete(lesson.id)}
                    title="Delete lesson"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {lesson.content && (
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {lesson.content.replace(/<[^>]*>/g, '')}
                </p>
              )}
              {lesson.video_url && (
                <span className="text-xs inline-block px-2 py-1 bg-primary/10 text-primary rounded">
                  Has Video
                </span>
              )}
              <div className="text-xs text-muted-foreground">Order: {lesson.order_index}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!previewLesson} onOpenChange={() => setPreviewLesson(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Preview: {previewLesson?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {previewLesson?.video_url && (
              <Card>
                <CardContent className="pt-6">
                  <AspectRatio ratio={16 / 9}>
                    <iframe
                      src={previewLesson.video_url}
                      className="w-full h-full rounded-lg"
                      allowFullScreen
                    />
                  </AspectRatio>
                </CardContent>
              </Card>
            )}
            {previewLesson?.content && (
              <Card>
                <CardHeader>
                  <CardTitle>Lesson Content</CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    className="prose prose-sm sm:prose lg:prose-lg xl:prose-xl max-w-none dark:prose-invert"
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(previewLesson.content) }}
                  />
                </CardContent>
              </Card>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
