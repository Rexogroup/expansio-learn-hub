import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Phone, Tag, Briefcase, DollarSign, FileText, Star, ArrowLeft, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface KeyMoment {
  timestamp: string;
  description: string;
}

interface SalesCall {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  tags: string[] | null;
  industry: string | null;
  deal_size: string | null;
  notes: string | null;
  is_featured: boolean;
  key_moments: KeyMoment[] | null;
  brand_id: string | null;
  call_sequence: number | null;
  call_label: string | null;
}

interface NavigationCall {
  id: string;
  title: string;
  call_label: string | null;
  call_sequence: number | null;
}

export default function SalesCallView() {
  const { id } = useParams();
  const [call, setCall] = useState<SalesCall | null>(null);
  const [watched, setWatched] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [nextCall, setNextCall] = useState<NavigationCall | null>(null);
  const [previousCall, setPreviousCall] = useState<NavigationCall | null>(null);
  const [totalCalls, setTotalCalls] = useState<number>(0);
  const [brandName, setBrandName] = useState<string>("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id || null);
    });

    fetchCallData();
  }, [id]);

  const fetchCallData = async () => {
    try {
      const { data: callData, error: callError } = await supabase
        .from("sales_calls")
        .select("*")
        .eq("id", id)
        .single();

      if (callError) throw callError;
      
      // Parse key_moments from JSON
      const parsedCall: SalesCall = {
        ...callData,
        key_moments: Array.isArray(callData.key_moments) 
          ? (callData.key_moments as unknown as KeyMoment[])
          : null,
      };
      setCall(parsedCall);

      // Fetch navigation data if call has a brand_id and call_sequence
      if (callData.brand_id && callData.call_sequence !== null) {
        // Fetch next call
        const { data: nextCallData } = await supabase
          .from("sales_calls")
          .select("id, title, call_label, call_sequence")
          .eq("brand_id", callData.brand_id)
          .eq("call_sequence", callData.call_sequence + 1)
          .maybeSingle();
        
        setNextCall(nextCallData);

        // Fetch previous call
        const { data: prevCallData } = await supabase
          .from("sales_calls")
          .select("id, title, call_label, call_sequence")
          .eq("brand_id", callData.brand_id)
          .eq("call_sequence", callData.call_sequence - 1)
          .maybeSingle();
        
        setPreviousCall(prevCallData);

        // Get total calls count and brand name
        const { count } = await supabase
          .from("sales_calls")
          .select("*", { count: 'exact', head: true })
          .eq("brand_id", callData.brand_id);
        
        setTotalCalls(count || 0);

        // Fetch brand name
        const { data: brandData } = await supabase
          .from("brands")
          .select("name")
          .eq("id", callData.brand_id)
          .maybeSingle();
        
        setBrandName(brandData?.name || "");
      }

      const { data: session } = await supabase.auth.getSession();
      if (session?.session?.user) {
        const { data: progressData } = await supabase
          .from("sales_call_progress")
          .select("watched")
          .eq("user_id", session.session.user.id)
          .eq("call_id", id)
          .maybeSingle();

        setWatched(progressData?.watched || false);
      }
    } catch (error) {
      console.error("Error fetching sales call:", error);
      toast.error("Failed to load sales call");
    } finally {
      setLoading(false);
    }
  };

  const toggleWatched = async (checked: boolean) => {
    if (!userId || !id) return;

    try {
      await supabase
        .from("sales_call_progress")
        .upsert({
          user_id: userId,
          call_id: id,
          watched: checked,
          watched_at: checked ? new Date().toISOString() : null,
        });

      setWatched(checked);
      toast.success(checked ? "Marked as watched" : "Unmarked as watched");
    } catch (error) {
      console.error("Error updating progress:", error);
      toast.error("Failed to update progress");
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <p className="text-muted-foreground">Loading sales call...</p>
      </div>
    );
  }

  if (!call) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <p className="text-muted-foreground">Sales call not found</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="flex items-start justify-between mb-2">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent flex items-center gap-2">
              <Phone className="w-8 h-8 text-primary" />
              {call.title}
            </h1>
            {call.is_featured && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Star className="w-3 h-3 fill-current" />
                Featured
              </Badge>
            )}
          </div>
          {call.description && (
            <p className="text-muted-foreground">{call.description}</p>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="shadow-lg border-border/50 bg-card/50 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="aspect-video rounded-lg overflow-hidden bg-muted mb-4">
                  <video
                    src={call.video_url}
                    controls
                    className="w-full h-full"
                    controlsList="nodownload"
                  />
                </div>
                {userId && (
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={watched}
                      onCheckedChange={(checked) => toggleWatched(checked as boolean)}
                      id="watched"
                    />
                    <label
                      htmlFor="watched"
                      className="text-sm font-medium cursor-pointer"
                    >
                      Mark as watched
                    </label>
                  </div>
                )}
              </CardContent>
            </Card>

            {(previousCall || nextCall) && (
              <Card className="shadow-xl border-primary/10 bg-card backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {brandName && call.call_sequence !== null && (
                      <div className="flex items-center justify-between text-xs px-1">
                        <span className="text-muted-foreground/80 font-medium">
                          {brandName}
                        </span>
                        <span className="text-muted-foreground/60">
                          {call.call_sequence} of {totalCalls}
                        </span>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between gap-3">
                      {previousCall ? (
                        <Button
                          asChild
                          variant="ghost"
                          size="sm"
                          className="rounded-full px-4 h-9 border border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all"
                        >
                          <Link to={`/sales-call/${previousCall.id}`} className="flex items-center gap-2">
                            <ArrowLeft className="w-3.5 h-3.5" />
                            <span className="text-sm font-medium">
                              {previousCall.call_label || "Previous"}
                            </span>
                          </Link>
                        </Button>
                      ) : (
                        <div />
                      )}
                      
                      {nextCall ? (
                        <Button
                          asChild
                          size="sm"
                          className="rounded-full px-4 h-9 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all"
                        >
                          <Link to={`/sales-call/${nextCall.id}`} className="flex items-center gap-2">
                            <span className="text-sm font-medium">
                              {nextCall.call_label || "Next"}
                            </span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </Button>
                      ) : (
                        <div />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {call.notes && (
              <Card className="shadow-lg border-border/50 bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    Commentary & Insights
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <p className="text-foreground whitespace-pre-wrap">{call.notes}</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            <Card className="shadow-lg border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Call Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {call.industry && (
                  <div className="flex items-start gap-3">
                    <Briefcase className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Industry</p>
                      <p className="text-sm text-muted-foreground">{call.industry}</p>
                    </div>
                  </div>
                )}
                {call.deal_size && (
                  <div className="flex items-start gap-3">
                    <DollarSign className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Deal Size</p>
                      <p className="text-sm text-muted-foreground">{call.deal_size}</p>
                    </div>
                  </div>
                )}
                {call.tags && call.tags.length > 0 && (
                  <div className="flex items-start gap-3">
                    <Tag className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium mb-2">Tags</p>
                      <div className="flex flex-wrap gap-1">
                        {call.tags.map((tag, idx) => (
                          <Badge key={idx} variant="secondary">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {call.key_moments && call.key_moments.length > 0 && (
              <Card className="shadow-lg border-border/50 bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle>Key Moments</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {call.key_moments.map((moment, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                      >
                        <p className="text-sm font-medium text-primary mb-1">
                          {moment.timestamp}
                        </p>
                        <p className="text-sm text-foreground">{moment.description}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
    </div>
  );
}
