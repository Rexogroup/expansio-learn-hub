import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow, format } from "date-fns";
import { 
  Sparkles, Send, RefreshCw, User, Calendar, Mail, CheckCircle, 
  CalendarCheck, ThumbsDown, Clock, ChevronDown, ChevronUp, XCircle, ArrowLeft
} from "lucide-react";

interface LeadReply {
  id: string;
  external_reply_id: string;
  lead_email: string;
  lead_name: string | null;
  campaign_name: string | null;
  subject: string | null;
  body: string;
  received_at: string;
  status: 'pending' | 'replied' | 'dismissed';
  reply_type: string | null;
  ai_draft: string | null;
  sent_response: string | null;
  responded_at: string | null;
  outcome?: 'meeting_booked' | 'positive_response' | 'no_response' | 'negative' | 'pending' | null;
  outcome_at?: string | null;
}

interface ThreadViewProps {
  reply: LeadReply;
  onSuccess: () => void;
  onDismiss: () => void;
  onBack?: () => void;
  isMobile?: boolean;
}

// Parse email thread to separate latest message from quoted history
function parseEmailThread(body: string): { latestMessage: string; quotedMessages: string[] } {
  const lines = body.split('\n');
  const latestLines: string[] = [];
  const quotedLines: string[] = [];
  let inQuotedSection = false;

  for (const line of lines) {
    // Detect quoted lines (starting with >) or "On ... wrote:" pattern
    if (line.trim().startsWith('>') || /^On .+ wrote:$/i.test(line.trim())) {
      inQuotedSection = true;
    }
    
    if (inQuotedSection) {
      quotedLines.push(line.replace(/^>\s?/, ''));
    } else {
      latestLines.push(line);
    }
  }

  return {
    latestMessage: latestLines.join('\n').trim(),
    quotedMessages: quotedLines.length > 0 ? [quotedLines.join('\n').trim()] : [],
  };
}

const ThreadView = ({ reply, onSuccess, onDismiss, onBack, isMobile }: ThreadViewProps) => {
  const { toast } = useToast();
  const [draftContent, setDraftContent] = useState(reply.ai_draft || '');
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [markingOutcome, setMarkingOutcome] = useState(false);
  const [showQuoted, setShowQuoted] = useState(false);

  // Reset draft when reply changes
  useEffect(() => {
    setDraftContent(reply.ai_draft || '');
    setShowQuoted(false);
  }, [reply.id, reply.ai_draft]);

  const { latestMessage, quotedMessages } = parseEmailThread(reply.body);

  const generateDraft = async () => {
    setGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase.functions.invoke('generate-reply-draft', {
        body: { reply_id: reply.id },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      setDraftContent(data.draft);
      toast({
        title: "Draft Generated",
        description: `Classified as: ${data.classification}`,
      });
    } catch (error) {
      console.error('Error generating draft:', error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate AI draft",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const sendReply = async () => {
    if (!draftContent.trim()) {
      toast({
        title: "Empty Response",
        description: "Please write or generate a response first",
        variant: "destructive",
      });
      return;
    }

    setSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase.functions.invoke('send-reply', {
        body: { 
          reply_id: reply.id,
          response_content: draftContent,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      toast({
        title: "Reply Sent",
        description: `Response sent to ${reply.lead_email}`,
      });
      onSuccess();
    } catch (error) {
      console.error('Error sending reply:', error);
      toast({
        title: "Send Failed",
        description: "Failed to send reply",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const markOutcome = async (outcome: 'meeting_booked' | 'positive_response' | 'no_response' | 'negative') => {
    setMarkingOutcome(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase.functions.invoke('classify-replies', {
        body: { 
          reply_id: reply.id,
          outcome,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      toast({
        title: "Outcome Recorded",
        description: data.message,
      });
      onSuccess();
    } catch (error) {
      console.error('Error marking outcome:', error);
      toast({
        title: "Error",
        description: "Failed to record outcome",
        variant: "destructive",
      });
    } finally {
      setMarkingOutcome(false);
    }
  };

  const getClassificationBadge = (type: string | null) => {
    const colors: Record<string, string> = {
      interested: 'bg-green-500/10 text-green-500',
      question: 'bg-blue-500/10 text-blue-500',
      objection: 'bg-amber-500/10 text-amber-500',
      referral: 'bg-purple-500/10 text-purple-500',
      not_interested: 'bg-red-500/10 text-red-500',
    };
    return type ? (
      <Badge className={colors[type] || 'bg-muted'}>
        {type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ')}
      </Badge>
    ) : null;
  };

  const getOutcomeBadge = (outcome: string | null | undefined) => {
    if (!outcome) return null;
    const config: Record<string, { color: string; label: string }> = {
      meeting_booked: { color: 'bg-green-500/10 text-green-500 border-green-500/20', label: 'Meeting Booked' },
      positive_response: { color: 'bg-blue-500/10 text-blue-500 border-blue-500/20', label: 'Positive Response' },
      no_response: { color: 'bg-muted text-muted-foreground', label: 'No Response' },
      negative: { color: 'bg-red-500/10 text-red-500 border-red-500/20', label: 'Negative' },
      pending: { color: 'bg-amber-500/10 text-amber-500 border-amber-500/20', label: 'Pending' },
    };
    const { color, label } = config[outcome] || { color: 'bg-muted', label: outcome };
    return <Badge variant="outline" className={color}>{label}</Badge>;
  };

  const isReplied = reply.status === 'replied';
  const isDismissed = reply.status === 'dismissed';
  const hasOutcome = !!reply.outcome && reply.outcome !== 'pending';

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 border-b p-4 bg-muted/30">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            {isMobile && onBack && (
              <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0 -ml-2">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold">{reply.lead_name || 'Unknown'}</span>
                <span className="text-sm text-muted-foreground truncate">
                  &lt;{reply.lead_email}&gt;
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
                <Calendar className="h-3.5 w-3.5" />
                <span>
                  {formatDistanceToNow(new Date(reply.received_at), { addSuffix: true })}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {reply.campaign_name && (
                  <Badge variant="secondary" className="text-xs">{reply.campaign_name}</Badge>
                )}
                {getClassificationBadge(reply.reply_type)}
                {isReplied && (
                  <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 text-xs">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Replied
                  </Badge>
                )}
                {isDismissed && (
                  <Badge variant="outline" className="bg-muted text-muted-foreground text-xs">
                    <XCircle className="h-3 w-3 mr-1" />
                    Dismissed
                  </Badge>
                )}
                {getOutcomeBadge(reply.outcome)}
              </div>
            </div>
          </div>
          
          {reply.status === 'pending' && (
            <Button variant="ghost" size="sm" onClick={onDismiss} className="text-muted-foreground">
              Dismiss
            </Button>
          )}
        </div>
      </div>

      {/* Thread Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Response Section - Now at the top */}
          {isReplied ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <h4 className="text-sm font-medium">Response Sent</h4>
                {reply.responded_at && (
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(reply.responded_at), 'PPp')}
                  </span>
                )}
              </div>
              <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-4 text-sm whitespace-pre-wrap">
                {reply.sent_response}
              </div>

              {/* Outcome Tracking */}
              {!hasOutcome && (
                <div className="bg-muted/50 rounded-lg p-4">
                  <h4 className="text-sm font-medium mb-2">What was the outcome?</h4>
                  <p className="text-xs text-muted-foreground mb-3">
                    Track outcomes to improve AI recommendations
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="bg-green-500/10 border-green-500/30 hover:bg-green-500/20"
                      onClick={() => markOutcome('meeting_booked')}
                      disabled={markingOutcome}
                    >
                      <CalendarCheck className="h-4 w-4 mr-1" />
                      Meeting Booked
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20"
                      onClick={() => markOutcome('positive_response')}
                      disabled={markingOutcome}
                    >
                      <ThumbsDown className="h-4 w-4 mr-1 rotate-180" />
                      Positive
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => markOutcome('no_response')}
                      disabled={markingOutcome}
                    >
                      <Clock className="h-4 w-4 mr-1" />
                      No Response
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="bg-red-500/10 border-red-500/30 hover:bg-red-500/20"
                      onClick={() => markOutcome('negative')}
                      disabled={markingOutcome}
                    >
                      <ThumbsDown className="h-4 w-4 mr-1" />
                      Negative
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <h4 className="text-sm font-medium">Appointment Copilot Draft</h4>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={generateDraft}
                  disabled={generating}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${generating ? 'animate-spin' : ''}`} />
                </Button>
              </div>
              
              <Textarea
                value={draftContent}
                onChange={(e) => setDraftContent(e.target.value)}
                placeholder="Write your response or click 'Generate with AI' to create a draft..."
                className="min-h-[150px] resize-none"
              />
            </div>
          )}

          <Separator />

          {/* Subject */}
          {reply.subject && (
            <div>
              <span className="text-sm text-muted-foreground">Subject:</span>
              <p className="font-medium">{reply.subject}</p>
            </div>
          )}

          {/* Latest Message - Now below response */}
          <div className="bg-muted/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
              <Mail className="h-4 w-4" />
              <span>{format(new Date(reply.received_at), 'PPp')}</span>
            </div>
            <div className="text-sm whitespace-pre-wrap leading-relaxed">
              {latestMessage || reply.body}
            </div>
          </div>

          {/* Quoted Messages */}
          {quotedMessages.length > 0 && (
            <Collapsible open={showQuoted} onOpenChange={setShowQuoted}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="text-muted-foreground w-full justify-start">
                  {showQuoted ? (
                    <ChevronUp className="h-4 w-4 mr-2" />
                  ) : (
                    <ChevronDown className="h-4 w-4 mr-2" />
                  )}
                  {showQuoted ? 'Hide' : 'Show'} previous messages ({quotedMessages.length})
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                {quotedMessages.map((msg, idx) => (
                  <div key={idx} className="border-l-2 border-muted pl-4 py-2 text-sm text-muted-foreground whitespace-pre-wrap">
                    {msg}
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      </ScrollArea>

      {/* Action Bar */}
      {!isReplied && !isDismissed && (
        <div className="flex-shrink-0 border-t p-4 bg-background">
          <div className="flex justify-end gap-2">
            <Button onClick={sendReply} disabled={sending || !draftContent.trim()}>
              {sending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              {sending ? 'Sending...' : 'Send Reply'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ThreadView;
