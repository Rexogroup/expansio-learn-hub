import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow, format } from "date-fns";
import { Sparkles, Send, RefreshCw, User, Calendar, Mail, CheckCircle } from "lucide-react";

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
}

interface ReplyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reply: LeadReply;
  onSuccess: () => void;
}

const ReplyModal = ({ open, onOpenChange, reply, onSuccess }: ReplyModalProps) => {
  const { toast } = useToast();
  const [draftContent, setDraftContent] = useState(reply.ai_draft || '');
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);

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

  const isReplied = reply.status === 'replied';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Reply to Lead
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Lead Info */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{reply.lead_name || 'Unknown'}</span>
              <span className="text-muted-foreground">&lt;{reply.lead_email}&gt;</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>
                Received {formatDistanceToNow(new Date(reply.received_at), { addSuffix: true })}
                {' · '}
                {format(new Date(reply.received_at), 'PPp')}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {reply.campaign_name && (
                <Badge variant="secondary">{reply.campaign_name}</Badge>
              )}
              {getClassificationBadge(reply.reply_type)}
            </div>
          </div>

          {/* Original Message */}
          <div>
            <h4 className="text-sm font-medium mb-2">Original Message</h4>
            {reply.subject && (
              <p className="text-sm font-medium mb-1">Subject: {reply.subject}</p>
            )}
            <div className="bg-muted/30 rounded-lg p-4 text-sm whitespace-pre-wrap">
              {reply.body}
            </div>
          </div>

          <Separator />

          {/* Response Section */}
          {isReplied ? (
            <div>
              <div className="flex items-center gap-2 mb-2">
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
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium">Your Response</h4>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={generateDraft}
                  disabled={generating}
                >
                  <Sparkles className={`h-4 w-4 mr-2 ${generating ? 'animate-pulse' : ''}`} />
                  {generating ? 'Generating...' : draftContent ? 'Regenerate' : 'Generate with AI'}
                </Button>
              </div>
              
              <Textarea
                value={draftContent}
                onChange={(e) => setDraftContent(e.target.value)}
                placeholder="Write your response or click 'Generate with AI' to create a draft..."
                className="min-h-[150px] resize-none"
              />

              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
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
      </DialogContent>
    </Dialog>
  );
};

export default ReplyModal;
