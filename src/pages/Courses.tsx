import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, Clock, Phone, Video } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { BrandCard } from "@/components/BrandCard";

interface Course {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  created_at: string;
  updated_at: string;
}

interface CourseProgress {
  courseId: string;
  totalLessons: number;
  completedLessons: number;
  progressPercentage: number;
}

interface SalesCall {
  id: string;
  title: string;
  thumbnail_url: string | null;
  video_url: string | null;
  duration: number | null;
  call_sequence: number | null;
  call_label: string | null;
  brand_id: string | null;
}

interface Brand {
  id: string;
  name: string;
  logo_url: string | null;
  arr_value: string | null;
  order_index: number;
}

export default function Courses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [courseProgress, setCourseProgress] = useState<Map<string, CourseProgress>>(new Map());
  
  // Sales Vault state
  const [brands, setBrands] = useState<Brand[]>([]);
  const [calls, setCalls] = useState<SalesCall[]>([]);
  const [salesVaultLoading, setSalesVaultLoading] = useState(true);

  useEffect(() => {
    fetchCourses();
    fetchCourseProgress();
    fetchSalesVaultData();
  }, []);

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .eq("is_published", true)
        .order("order_index", { ascending: true });
      if (error) throw error;
      setCourses(data || []);
    } catch (error) {
      console.error("Error fetching courses:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSalesVaultData = async () => {
    try {
      const [brandsResponse, callsResponse] = await Promise.all([
        supabase.from("brands").select("*").order("order_index", { ascending: true }),
        supabase.from("sales_calls").select("id, title, thumbnail_url, video_url, duration, call_sequence, call_label, brand_id"),
      ]);

      if (brandsResponse.error) throw brandsResponse.error;
      if (callsResponse.error) throw callsResponse.error;

      setBrands(brandsResponse.data || []);
      setCalls(callsResponse.data || []);
    } catch (error) {
      console.error("Error fetching sales vault data:", error);
    } finally {
      setSalesVaultLoading(false);
    }
  };

  const fetchCourseProgress = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: lessonsData, error: lessonsError } = await supabase
        .from("lessons")
        .select(`
          id,
          section_id,
          sections!inner(
            course_id
          )
        `);
      if (lessonsError) throw lessonsError;

      const { data: progressData, error: progressError } = await supabase
        .from("lesson_progress")
        .select("lesson_id, completed")
        .eq("user_id", user.id)
        .eq("completed", true);
      if (progressError) throw progressError;

      const progressMap = new Map<string, CourseProgress>();
      const completedLessonIds = new Set(progressData?.map(p => p.lesson_id) || []);

      const courseGroups = new Map<string, string[]>();
      lessonsData?.forEach(lesson => {
        const courseId = (lesson.sections as any).course_id;
        if (!courseGroups.has(courseId)) {
          courseGroups.set(courseId, []);
        }
        courseGroups.get(courseId)?.push(lesson.id);
      });

      courseGroups.forEach((lessonIds, courseId) => {
        const totalLessons = lessonIds.length;
        const completedLessons = lessonIds.filter(id => completedLessonIds.has(id)).length;
        const progressPercentage = totalLessons > 0 ? Math.round(completedLessons / totalLessons * 100) : 0;
        progressMap.set(courseId, {
          courseId,
          totalLessons,
          completedLessons,
          progressPercentage
        });
      });
      setCourseProgress(progressMap);
    } catch (error) {
      console.error("Error fetching course progress:", error);
    }
  };

  const uncategorizedCalls = calls.filter(call => !call.brand_id);

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Expansio Accelerator</h1>
        <p className="text-muted-foreground">
          Master client acquisition with our comprehensive training resources
        </p>
      </div>

      <Tabs defaultValue="courses" className="space-y-6">
        <TabsList>
          <TabsTrigger value="courses" className="gap-2">
            <BookOpen className="h-4 w-4" />
            Courses
          </TabsTrigger>
          <TabsTrigger value="sales-vault" className="gap-2">
            <Video className="h-4 w-4" />
            Sales Vault
          </TabsTrigger>
        </TabsList>

        <TabsContent value="courses">
          {loading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading courses...</p>
            </div>
          ) : courses.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-xl text-muted-foreground">No courses available yet</p>
            </div>
          ) : (
            <div className="max-w-screen-xl mx-auto">
              <div className="relative">
                {/* Vertical connecting line */}
                <div className="absolute left-6 top-12 bottom-12 w-0.5 bg-gradient-to-b from-primary via-primary/50 to-primary hidden md:block" />
                
                {courses.map((course, index) => (
                  <div key={course.id} className="relative mb-8 last:mb-0">
                    {/* Step number badge */}
                    <div className="absolute left-0 top-6 md:top-1/2 md:-translate-y-1/2 z-10">
                      <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-lg">
                        <span className="text-primary-foreground font-bold text-lg">{index + 1}</span>
                      </div>
                    </div>

                    {/* Course card */}
                    <Link to={`/course/${course.id}`} className="block ml-16 md:ml-20">
                      <Card className="hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer border-border/50 bg-card backdrop-blur-sm">
                        <div className="flex flex-col md:flex-row gap-6 p-10">
                          {/* Thumbnail */}
                          {course.thumbnail_url && (
                            <div className="w-full md:w-80 flex-shrink-0">
                              <div className="aspect-video w-full overflow-hidden rounded-lg">
                                <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover" />
                              </div>
                            </div>
                          )}

                          {/* Content */}
                          <div className="flex-1 flex flex-col justify-center min-w-0">
                            <h3 className="text-3xl font-semibold text-foreground whitespace-pre-line mb-2">{course.title}</h3>
                            
                            {/* Progress Bar */}
                            {courseProgress.has(course.id) && (
                              <div className="mb-3">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-sm text-muted-foreground">
                                    {courseProgress.get(course.id)?.completedLessons} of {courseProgress.get(course.id)?.totalLessons} lessons completed
                                  </span>
                                  <span className="text-sm font-medium text-primary">
                                    {courseProgress.get(course.id)?.progressPercentage}%
                                  </span>
                                </div>
                                <Progress value={courseProgress.get(course.id)?.progressPercentage} className="h-2" />
                              </div>
                            )}

                            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                <span>Added {new Date(course.created_at).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>

                          {/* CTA Button */}
                          <div className="flex items-center justify-end md:justify-center">
                            <div className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors">
                              <span>Start</span>
                              <span>→</span>
                            </div>
                          </div>
                        </div>
                      </Card>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="sales-vault">
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-2">Sales Vault</h2>
            <p className="text-muted-foreground">
              Real Deals, Real Conversations, Real Results
            </p>
          </div>

          {salesVaultLoading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading sales vault...</p>
            </div>
          ) : brands.length === 0 && uncategorizedCalls.length === 0 ? (
            <div className="text-center py-12">
              <Phone className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-xl text-muted-foreground">No sales calls available yet</p>
            </div>
          ) : (
            <div className="space-y-8">
              {brands.map((brand) => {
                const brandCalls = calls.filter(call => call.brand_id === brand.id);
                if (brandCalls.length === 0) return null;
                
                return (
                  <BrandCard
                    key={brand.id}
                    name={brand.name}
                    logo_url={brand.logo_url}
                    arr_value={brand.arr_value}
                    calls={brandCalls}
                  />
                );
              })}

              {uncategorizedCalls.length > 0 && (
                <div className="mt-12 pt-8 border-t border-border/50">
                  <h2 className="text-2xl font-bold mb-6 text-muted-foreground">Uncategorized Calls</h2>
                  <BrandCard
                    name="Uncategorized"
                    logo_url={null}
                    arr_value={null}
                    calls={uncategorizedCalls}
                  />
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </main>
  );
}
