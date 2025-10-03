import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, Clock, Star } from "lucide-react";

interface SalesCall {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  duration: number | null;
  tags: string[] | null;
  industry: string | null;
  deal_size: string | null;
  is_featured: boolean;
  created_at: string;
}

export default function SalesVault() {
  const [calls, setCalls] = useState<SalesCall[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCalls();
  }, []);

  const fetchCalls = async () => {
    try {
      const { data, error } = await supabase
        .from("sales_calls")
        .select("*")
        .order("is_featured", { ascending: false })
        .order("order_index", { ascending: true });

      if (error) throw error;
      setCalls(data || []);
    } catch (error) {
      console.error("Error fetching sales calls:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "Duration unknown";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary">
      <Navbar />
      <div className="container mx-auto px-4 py-12">
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold mb-4 text-foreground">
            Sales Vault
          </h1>
          <p className="text-xl text-muted-foreground">
            Real sales calls from closed deals - learn from actual conversations
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading sales calls...</p>
          </div>
        ) : calls.length === 0 ? (
          <div className="text-center py-12">
            <Phone className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-xl text-muted-foreground">No sales calls available yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {calls.map((call) => (
              <Link key={call.id} to={`/sales-call/${call.id}`}>
                <Card className="h-full hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer border-border/50 bg-card/50 backdrop-blur-sm relative">
                  {call.is_featured && (
                    <div className="absolute top-3 right-3 z-10">
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Star className="w-3 h-3 fill-current" />
                        Featured
                      </Badge>
                    </div>
                  )}
                  {call.thumbnail_url && (
                    <div className="aspect-video w-full overflow-hidden rounded-t-lg">
                      <img
                        src={call.thumbnail_url}
                        alt={call.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <CardHeader>
                    <CardTitle className="flex items-start gap-2">
                      <Phone className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
                      <span>{call.title}</span>
                    </CardTitle>
                    <CardDescription className="line-clamp-2">
                      {call.description || "No description available"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {call.duration && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          <span>{formatDuration(call.duration)}</span>
                        </div>
                      )}
                      {(call.industry || call.deal_size) && (
                        <div className="flex flex-wrap gap-2">
                          {call.industry && (
                            <Badge variant="outline">{call.industry}</Badge>
                          )}
                          {call.deal_size && (
                            <Badge variant="outline">{call.deal_size}</Badge>
                          )}
                        </div>
                      )}
                      {call.tags && call.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {call.tags.slice(0, 3).map((tag, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {call.tags.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{call.tags.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
