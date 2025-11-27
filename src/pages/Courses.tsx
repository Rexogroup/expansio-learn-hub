import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Clock } from "lucide-react";

interface Course {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  created_at: string;
  updated_at: string;
}

export default function Courses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCourses();
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary">
      <Navbar />
      <div className="container mx-auto px-4 py-12">
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold mb-4 text-foreground">
            Available Courses
          </h1>
          <p className="text-xl text-muted-foreground">
            Explore our library of training resources
          </p>
        </div>

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
          <div className="max-w-screen-xl mx-auto px-4">
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
                              <img
                                src={course.thumbnail_url}
                                alt={course.title}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          </div>
                        )}

                        {/* Content */}
                        <div className="flex-1 flex flex-col justify-center min-w-0">
                          <h3 className="text-3xl font-semibold text-foreground whitespace-pre-line mb-2">{course.title}</h3>
                          <p className="text-muted-foreground text-lg mb-4 line-clamp-2">
                            {course.description || "No description available"}
                          </p>
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
      </div>
    </div>
  );
}
