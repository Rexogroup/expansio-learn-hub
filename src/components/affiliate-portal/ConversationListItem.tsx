import { Badge } from "@/components/ui/badge";
import { Briefcase } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Conversation {
  id: string;
  updated_at: string;
  lastMessage?: {
    content: string;
    created_at: string;
    sender_id: string;
  };
  otherParticipant?: {
    id: string;
    full_name: string | null;
    email: string;
    agency?: {
      agency_name: string;
      logo_url: string | null;
    };
  };
  unreadCount: number;
}

interface ConversationListItemProps {
  conversation: Conversation;
  isSelected: boolean;
  currentUserId: string;
  onClick: () => void;
}

export const ConversationListItem = ({
  conversation,
  isSelected,
  currentUserId,
  onClick,
}: ConversationListItemProps) => {
  const { otherParticipant, lastMessage, unreadCount } = conversation;
  const agency = otherParticipant?.agency;

  const displayName = agency?.agency_name || otherParticipant?.full_name || otherParticipant?.email || "Unknown";
  const isOwnMessage = lastMessage?.sender_id === currentUserId;

  return (
    <div
      className={`flex items-center gap-3 p-4 cursor-pointer transition-colors hover:bg-muted/50 ${
        isSelected ? "bg-muted" : ""
      }`}
      onClick={onClick}
    >
      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
        {agency?.logo_url ? (
          <img src={agency.logo_url} alt={displayName} className="w-full h-full object-cover" />
        ) : (
          <Briefcase className="w-5 h-5 text-muted-foreground" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <h4 className={`font-medium truncate ${unreadCount > 0 ? "font-semibold" : ""}`}>
            {displayName}
          </h4>
          {lastMessage && (
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {formatDistanceToNow(new Date(lastMessage.created_at), { addSuffix: false })}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className={`text-sm truncate ${unreadCount > 0 ? "text-foreground" : "text-muted-foreground"}`}>
            {lastMessage ? (
              <>
                {isOwnMessage && <span className="text-muted-foreground">You: </span>}
                {lastMessage.content}
              </>
            ) : (
              "No messages yet"
            )}
          </p>
          {unreadCount > 0 && (
            <Badge variant="default" className="h-5 w-5 p-0 flex items-center justify-center text-xs rounded-full">
              {unreadCount}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
};
