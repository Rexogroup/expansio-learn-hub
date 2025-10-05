import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { BookOpen } from "lucide-react";
import { sanitizeHtml } from "@/lib/sanitize";

interface Lesson {
  id: string;
  title: string;
  content: string | null;
  video_url: string | null;
  order_index: number;
  completed?: boolean;
}

interface Section {
  id: string;
  title: string;
  description: string | null;
  order_index: number;
  lessons: Lesson[];
}

interface Course {
  id: string;
  title: string;
  description: string | null;
}

export default function CourseView() {
  const { id } = useParams();
  const [course, setCourse] = useState<Course | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id || null);
    });

    fetchCourseData();
  }, [id]);

  const fetchCourseData = async () => {
    try {
      const { data: courseData, error: courseError } = await supabase
        .from("courses")
        .select("*")
        .eq("id", id)
        .single();

      if (courseError) throw courseError;
      setCourse(courseData);

      const { data: sectionsData, error: sectionsError } = await supabase
        .from("sections")
        .select("*, lessons(*)")
        .eq("course_id", id)
        .order("order_index");

      if (sectionsError) throw sectionsError;

      const { data: session } = await supabase.auth.getSession();
      if (session?.session?.user) {
        const { data: progressData } = await supabase
          .from("lesson_progress")
          .select("lesson_id, completed")
          .eq("user_id", session.session.user.id);

        const progressMap = new Map(
          progressData?.map((p) => [p.lesson_id, p.completed]) || []
        );

        const sectionsWithProgress = sectionsData.map((section) => ({
          ...section,
          lessons: section.lessons
            .sort((a: Lesson, b: Lesson) => a.order_index - b.order_index)
            .map((lesson: Lesson) => ({
              ...lesson,
              completed: progressMap.get(lesson.id) || false,
            })),
        }));

        setSections(sectionsWithProgress);
        
        if (sectionsWithProgress.length > 0 && sectionsWithProgress[0].lessons.length > 0) {
          setSelectedLesson(sectionsWithProgress[0].lessons[0]);
        }
      } else {
        setSections(sectionsData.map((section) => ({
          ...section,
          lessons: section.lessons.sort((a: Lesson, b: Lesson) => a.order_index - b.order_index),
        })));
        
        if (sectionsData.length > 0 && sectionsData[0].lessons.length > 0) {
          setSelectedLesson(sectionsData[0].lessons[0]);
        }
      }
    } catch (error) {
      console.error("Error fetching course:", error);
      toast.error("Failed to load course");
    } finally {
      setLoading(false);
    }
  };

  const toggleLessonComplete = async (lessonId: string, completed: boolean) => {
    // Always fetch the current session to ensure we have the latest user ID
    const { data: { session } } = await supabase.auth.getSession();
    const currentUserId = session?.user?.id;
    
    if (!currentUserId) {
      toast.error("Please log in to track your progress");
      return;
    }

    try {
      if (completed) {
        await supabase
          .from("lesson_progress")
          .upsert({
            user_id: currentUserId,
            lesson_id: lessonId,
            completed: true,
            completed_at: new Date().toISOString(),
          });
      } else {
        await supabase
          .from("lesson_progress")
          .delete()
          .eq("user_id", currentUserId)
          .eq("lesson_id", lessonId);
      }

      setSections((prev) =>
        prev.map((section) => ({
          ...section,
          lessons: section.lessons.map((lesson) =>
            lesson.id === lessonId ? { ...lesson, completed } : lesson
          ),
        }))
      );
    } catch (error) {
      console.error("Error updating progress:", error);
      toast.error("Failed to update progress");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary">
        <Navbar />
        <div className="container mx-auto px-4 py-12 text-center">
          <p className="text-muted-foreground">Loading course...</p>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary">
        <Navbar />
        <div className="container mx-auto px-4 py-12 text-center">
          <p className="text-muted-foreground">Course not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            {course.title}
          </h1>
          <p className="text-muted-foreground">{course.description}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {selectedLesson ? (
              <Card className="shadow-lg border-border/50 bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-primary" />
                    {selectedLesson.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedLesson.video_url && (
                    <div className="aspect-video rounded-lg overflow-hidden bg-muted">
                      <iframe
                        src={selectedLesson.video_url}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  )}
                  {selectedLesson.content && (
                    <div className="prose prose-sm sm:prose lg:prose-lg xl:prose-xl max-w-none dark:prose-invert [&_*]:dark:!text-white [&_h1]:dark:!text-blue-300 [&_h2]:dark:!text-blue-300 [&_h3]:dark:!text-blue-300 [&_h4]:dark:!text-blue-300 [&_p]:dark:!text-white [&_li]:dark:!text-white [&_span]:dark:!text-white [&_div]:dark:!text-white [&_strong]:dark:!text-white [&_em]:dark:!text-white [&_a]:dark:!text-blue-400">
                      <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(selectedLesson.content) }} />
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card className="shadow-lg border-border/50 bg-card/50 backdrop-blur-sm">
                <CardContent className="py-12 text-center">
                  <BookOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">Select a lesson to begin</p>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="sticky top-8 self-start max-h-[calc(100vh-8rem)] overflow-y-auto">
            <Card className="shadow-lg border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Course Content</CardTitle>
                <CardDescription>Click on a lesson to view</CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {sections.map((section) => (
                    <AccordionItem key={section.id} value={section.id}>
                      <AccordionTrigger className="text-left">
                        {section.title}
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-2">
                          {section.lessons.map((lesson) => (
                            <div
                              key={lesson.id}
                              className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                                selectedLesson?.id === lesson.id
                                  ? "bg-primary/10 border border-primary/20"
                                  : "hover:bg-muted"
                              }`}
                              onClick={() => setSelectedLesson(lesson)}
                            >
                              {userId && (
                                <Checkbox
                                  checked={lesson.completed}
                                  onCheckedChange={(checked) =>
                                    toggleLessonComplete(lesson.id, checked as boolean)
                                  }
                                  onClick={(e) => e.stopPropagation()}
                                />
                              )}
                              <span className="text-sm flex-1">{lesson.title}</span>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
