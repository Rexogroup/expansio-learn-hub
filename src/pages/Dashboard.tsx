import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Video, MessageSquare, Star, TrendingUp, CheckCircle, Play, FileText } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface DashboardMetrics {
  courses: {
    total: number;
    completed: number;
    totalLessons: number;
    completedLessons: number;
  };
  salesVault: {
    totalCalls: number;
    watchedCalls: number;
    totalBrands: number;
  };
  scriptBuilder: {
    conversations: number;
    savedLeadMagnets: number;
    generatedScripts: number;
  };
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthAndFetchMetrics();
  }, []);

  const checkAuthAndFetchMetrics = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }
    await fetchMetrics(user.id);
  };

  const fetchMetrics = async (userId: string) => {
    try {
      // Fetch courses metrics
      const { data: courses } = await supabase
        .from("courses")
        .select("id")
        .eq("is_published", true);

      const { data: lessons } = await supabase
        .from("lessons")
        .select("id");

      const { data: lessonProgress } = await supabase
        .from("lesson_progress")
        .select("id, completed")
        .eq("user_id", userId);

      const completedLessons = lessonProgress?.filter(lp => lp.completed).length || 0;

      // Fetch sales vault metrics
      const { data: salesCalls } = await supabase
        .from("sales_calls")
        .select("id");

      const { data: watchProgress } = await supabase
        .from("sales_call_progress")
        .select("id, watched")
        .eq("user_id", userId);

      const watchedCalls = watchProgress?.filter(wp => wp.watched).length || 0;

      const { data: brands } = await supabase
        .from("brands")
        .select("id");

      // Fetch script builder metrics
      const { data: conversations } = await supabase
        .from("script_conversations")
        .select("id")
        .eq("user_id", userId);

      const { data: savedMagnets } = await supabase
        .from("saved_lead_magnets")
        .select("id")
        .eq("user_id", userId);

      const { data: scripts } = await supabase
        .from("generated_scripts")
        .select("id")
        .eq("user_id", userId);

      setMetrics({
        courses: {
          total: courses?.length || 0,
          completed: 0, // Could calculate based on all lessons completed per course
          totalLessons: lessons?.length || 0,
          completedLessons,
        },
        salesVault: {
          totalCalls: salesCalls?.length || 0,
          watchedCalls,
          totalBrands: brands?.length || 0,
        },
        scriptBuilder: {
          conversations: conversations?.length || 0,
          savedLeadMagnets: savedMagnets?.length || 0,
          generatedScripts: scripts?.length || 0,
        },
      });
    } catch (error) {
      console.error("Error fetching metrics:", error);
    } finally {
      setLoading(false);
    }
  };

  const MetricCard = ({ 
    title, 
    value, 
    subtitle, 
    icon: Icon, 
    onClick 
  }: { 
    title: string; 
    value: number | string; 
    subtitle?: string; 
    icon: React.ElementType;
    onClick?: () => void;
  }) => (
    <Card 
      className={`transition-all duration-200 ${onClick ? 'cursor-pointer hover:shadow-lg hover:scale-[1.02]' : ''}`}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-5 w-5 text-primary" />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value}</div>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  );

  const ProgressCard = ({ 
    title, 
    current, 
    total, 
    icon: Icon,
    onClick 
  }: { 
    title: string; 
    current: number; 
    total: number; 
    icon: React.ElementType;
    onClick?: () => void;
  }) => {
    const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
    
    return (
      <Card 
        className={`transition-all duration-200 ${onClick ? 'cursor-pointer hover:shadow-lg hover:scale-[1.02]' : ''}`}
        onClick={onClick}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
          <Icon className="h-5 w-5 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{percentage}%</div>
          <div className="mt-2 h-2 w-full rounded-full bg-muted">
            <div 
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${percentage}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">{current} of {total} completed</p>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <Skeleton className="h-10 w-48 mb-2" />
            <Skeleton className="h-5 w-96" />
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Your learning progress and activity overview
          </p>
        </div>

        {/* Courses Section */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Courses
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <MetricCard
              title="Total Courses"
              value={metrics?.courses.total || 0}
              subtitle="Available to learn"
              icon={BookOpen}
              onClick={() => navigate("/courses")}
            />
            <ProgressCard
              title="Lessons Progress"
              current={metrics?.courses.completedLessons || 0}
              total={metrics?.courses.totalLessons || 0}
              icon={CheckCircle}
              onClick={() => navigate("/courses")}
            />
            <MetricCard
              title="Total Lessons"
              value={metrics?.courses.totalLessons || 0}
              subtitle="Across all courses"
              icon={FileText}
              onClick={() => navigate("/courses")}
            />
          </div>
        </div>

        {/* Sales Vault Section */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Video className="h-5 w-5 text-primary" />
            Sales Vault
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <MetricCard
              title="Total Calls"
              value={metrics?.salesVault.totalCalls || 0}
              subtitle="Sales call recordings"
              icon={Video}
              onClick={() => navigate("/sales-vault")}
            />
            <ProgressCard
              title="Watch Progress"
              current={metrics?.salesVault.watchedCalls || 0}
              total={metrics?.salesVault.totalCalls || 0}
              icon={Play}
              onClick={() => navigate("/sales-vault")}
            />
            <MetricCard
              title="Brands"
              value={metrics?.salesVault.totalBrands || 0}
              subtitle="Client categories"
              icon={TrendingUp}
              onClick={() => navigate("/sales-vault")}
            />
          </div>
        </div>

        {/* Script Builder Section */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Script Builder
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <MetricCard
              title="Conversations"
              value={metrics?.scriptBuilder.conversations || 0}
              subtitle="Chat sessions"
              icon={MessageSquare}
              onClick={() => navigate("/script-builder")}
            />
            <MetricCard
              title="Saved Lead Magnets"
              value={metrics?.scriptBuilder.savedLeadMagnets || 0}
              subtitle="In your favorites"
              icon={Star}
              onClick={() => navigate("/script-builder")}
            />
            <MetricCard
              title="Generated Scripts"
              value={metrics?.scriptBuilder.generatedScripts || 0}
              subtitle="AI-created content"
              icon={FileText}
              onClick={() => navigate("/script-builder")}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
