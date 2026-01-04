import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  MessageSquare, 
  Loader2, 
  RefreshCw,
  TrendingUp,
  TrendingDown,
  CalendarCheck,
  CalendarX,
  Target,
  Zap,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JsonValue = any;

interface ReplyAsset {
  id: string;
  title: string;
  content: JsonValue;
  performance_data?: JsonValue;
  status?: string | null;
  created_at?: string;
}

const getContentString = (content: JsonValue, ...keys: string[]): string | undefined => {
  if (!content || typeof content !== 'object') return undefined;
  for (const key of keys) {
    if (content[key] && typeof content[key] === 'string') return content[key];
  }
  return undefined;
};

export function AppointmentMemory() {
  const [isLoading, setIsLoading] = useState(true);
  const [replies, setReplies] = useState<ReplyAsset[]>([]);

  useEffect(() => {
    fetchReplies();
  }, []);

  const fetchReplies = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_assets')
        .select('*')
        .eq('user_id', user.id)
        .in('asset_type', ['winning_reply', 'losing_reply'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        setReplies(data.map(a => ({
          ...a,
          content: typeof a.content === 'string' ? JSON.parse(a.content) : a.content,
          status: a.asset_type === 'winning_reply' ? 'winning' : 'losing'
        })));
      }
    } catch (error) {
      console.error('Error fetching replies:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const winningReplies = replies.filter(r => r.status === 'winning');
  const losingReplies = replies.filter(r => r.status === 'losing');
  const bookingRate = replies.length > 0 
    ? Math.round((winningReplies.length / replies.length) * 100) 
    : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Appointment Setting Memory
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Patterns learned from your reply messages that book or lose meetings
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchReplies}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-emerald-500/10 border-emerald-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CalendarCheck className="h-4 w-4 text-emerald-500" />
              <span className="text-sm font-medium">Meetings Booked</span>
            </div>
            <p className="text-2xl font-bold mt-2">{winningReplies.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-red-500/10 border-red-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CalendarX className="h-4 w-4 text-red-500" />
              <span className="text-sm font-medium">Lost Opportunities</span>
            </div>
            <p className="text-2xl font-bold mt-2">{losingReplies.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Booking Rate</span>
            </div>
            <p className="text-2xl font-bold mt-2">{bookingRate}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-medium">Total Tracked</span>
            </div>
            <p className="text-2xl font-bold mt-2">{replies.length}</p>
          </CardContent>
        </Card>
      </div>

      {replies.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="font-semibold text-lg mb-2">No Reply Patterns Yet</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Appointment patterns are captured when you mark lead outcomes in the Master Inbox. 
              Send replies and track their results to build your knowledge base!
            </p>
            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Target className="h-4 w-4" />
              <span>Mark "Meeting Booked" or "Negative" outcomes to capture patterns</span>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Winning Replies - What Books Meetings */}
          <Card className="border-emerald-500/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-500" />
                Booking Patterns
              </CardTitle>
              <CardDescription>
                Messages that successfully converted to meetings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-3">
                  {winningReplies.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No winning patterns yet. Keep booking meetings!
                    </p>
                  ) : (
                    winningReplies.map(reply => (
                      <ReplyCard key={reply.id} reply={reply} isWinning />
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Losing Replies - What to Avoid */}
          <Card className="border-red-500/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-red-500" />
                Avoid These Patterns
              </CardTitle>
              <CardDescription>
                Messages that failed to convert - learn what not to do
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-3">
                  {losingReplies.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No losing patterns captured yet.
                    </p>
                  ) : (
                    losingReplies.map(reply => (
                      <ReplyCard key={reply.id} reply={reply} isWinning={false} />
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      )}

      {/* AI Insights */}
      {replies.length > 0 && (
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              AI Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              {bookingRate >= 20 && (
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5" />
                  <p>
                    Your <strong>{bookingRate}% booking rate</strong> is on target! 
                    Keep using your winning patterns.
                  </p>
                </div>
              )}
              {bookingRate < 20 && bookingRate > 0 && (
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5" />
                  <p>
                    Your booking rate is at <strong>{bookingRate}%</strong>. 
                    Target is 20-30%. Review your winning patterns and apply them consistently.
                  </p>
                </div>
              )}
              {winningReplies.length > 2 && (
                <div className="flex items-start gap-2">
                  <Target className="h-4 w-4 text-primary mt-0.5" />
                  <p>
                    With {winningReplies.length} successful booking patterns, 
                    the Copilot can now suggest personalized reply templates.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ReplyCard({ reply, isWinning }: { reply: ReplyAsset; isWinning: boolean }) {
  const content = getContentString(reply.content, 'message_content', 'sent_message', 'message');
  const replyType = getContentString(reply.content, 'reply_type');
  const leadName = getContentString(reply.content, 'lead_name');

  return (
    <div className={`p-3 rounded-lg border ${isWinning ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm truncate">{reply.title}</h4>
          {leadName && (
            <p className="text-xs text-muted-foreground">Lead: {leadName}</p>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          {replyType && (
            <Badge variant="outline" className="text-xs capitalize">
              {replyType.replace('_', ' ')}
            </Badge>
          )}
          <Badge variant={isWinning ? 'default' : 'destructive'} className="text-xs">
            {isWinning ? 'Booked' : 'Lost'}
          </Badge>
        </div>
      </div>
      {content && (
        <p className="text-xs text-muted-foreground line-clamp-3">
          {content}
        </p>
      )}
    </div>
  );
}
