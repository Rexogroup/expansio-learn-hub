import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { Mail, User, Sparkles, XCircle, CheckCircle } from "lucide-react";

interface LeadReply {
  id: string;
  lead_email: string;
  lead_name: string | null;
  campaign_name: string | null;
  subject: string | null;
  body: string;
  received_at: string;
  status: 'pending' | 'replied' | 'dismissed';
  reply_type: string | null;
  ai_draft: string | null;
}

interface ReplyCardProps {
  reply: LeadReply;
  onClick: () => void;
  onDismiss: () => void;
}

const getReplyTypeBadge = (type: string | null) => {
  switch (type) {
    case 'interested':
      return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Interested</Badge>;
    case 'question':
      return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">Question</Badge>;
    case 'objection':
      return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20">Objection</Badge>;
    case 'referral':
      return <Badge className="bg-purple-500/10 text-purple-500 border-purple-500/20">Referral</Badge>;
    default:
      return null;
  }
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'replied':
      return (
        <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
          <CheckCircle className="h-3 w-3 mr-1" />
          Replied
        </Badge>
      );
    case 'dismissed':
      return (
        <Badge variant="outline" className="bg-muted text-muted-foreground">
          <XCircle className="h-3 w-3 mr-1" />
          Dismissed
        </Badge>
      );
    default:
      return null;
  }
};

const ReplyCard = ({ reply, onClick, onDismiss }: ReplyCardProps) => {
  const truncatedBody = reply.body.length > 150 
    ? reply.body.substring(0, 150) + '...' 
    : reply.body;

  return (
    <Card 
      className={`cursor-pointer transition-all hover:border-primary/50 ${
        reply.status === 'pending' ? 'border-l-4 border-l-amber-500' : ''
      }`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium truncate">
                {reply.lead_name || reply.lead_email}
              </span>
              {reply.lead_name && (
                <span className="text-sm text-muted-foreground truncate">
                  &lt;{reply.lead_email}&gt;
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-2 mb-2">
              {reply.campaign_name && (
                <Badge variant="secondary" className="text-xs">
                  {reply.campaign_name}
                </Badge>
              )}
              {getReplyTypeBadge(reply.reply_type)}
              {getStatusBadge(reply.status)}
              {reply.ai_draft && (
                <Badge variant="outline" className="text-xs bg-primary/5">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Draft Ready
                </Badge>
              )}
            </div>
            
            {reply.subject && (
              <p className="text-sm font-medium mb-1">{reply.subject}</p>
            )}
            
            <p className="text-sm text-muted-foreground line-clamp-2">
              {truncatedBody}
            </p>
          </div>
          
          <div className="flex flex-col items-end gap-2">
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {formatDistanceToNow(new Date(reply.received_at), { addSuffix: true })}
            </span>
            
            {reply.status === 'pending' && (
              <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onDismiss}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Dismiss
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReplyCard;
