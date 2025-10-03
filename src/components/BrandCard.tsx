import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Play } from "lucide-react";
import { VideoThumbnail } from "./VideoThumbnail";

interface SalesCall {
  id: string;
  title: string;
  thumbnail_url: string | null;
  video_url: string | null;
  duration: number | null;
  call_sequence: number | null;
  call_label: string | null;
}

interface BrandCardProps {
  name: string;
  logo_url: string | null;
  arr_value: string | null;
  calls: SalesCall[];
}

export function BrandCard({ name, logo_url, arr_value, calls }: BrandCardProps) {
  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "N/A";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const sortedCalls = [...calls].sort((a, b) => (a.call_sequence || 0) - (b.call_sequence || 0));

  return (
    <Card className="overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-4 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {logo_url && (
              <img
                src={logo_url}
                alt={name}
                className="w-24 h-24 object-contain rounded-lg"
              />
            )}
            {arr_value && (
              <Badge 
                variant="secondary" 
                className="px-4 py-1.5 text-base font-semibold rounded-full bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all"
              >
                ARR: {arr_value}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-6">
        {calls.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No calls available for this brand</p>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-2">
            {sortedCalls.map((call) => (
              <Link
                key={call.id}
                to={`/sales-call/${call.id}`}
                className="flex-shrink-0 group"
              >
                <div className="w-96 space-y-2">
                  <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
                    <VideoThumbnail
                      videoUrl={call.video_url || ""}
                      fallbackThumbnail={call.thumbnail_url}
                      alt={call.title}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Play className="w-12 h-12 text-white" />
                    </div>
                    {call.call_sequence && (
                      <div className="absolute top-2 left-2">
                        <Badge variant="secondary" className="text-xs">
                          Call {call.call_sequence}
                        </Badge>
                      </div>
                    )}
                  </div>
                  
                  <div>
                    {call.call_label && (
                      <p className="font-semibold text-sm truncate">{call.call_label}</p>
                    )}
                    <p className="text-xs text-muted-foreground truncate">{call.title}</p>
                    {call.duration && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <Clock className="w-3 h-3" />
                        <span>{formatDuration(call.duration)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
