import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { ChatWindow } from "./ChatWindow";
import { ConversationListItem } from "./ConversationListItem";
import { MessageSquare } from "lucide-react";

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

interface MessagesInboxProps {
  onUnreadChange: (count: number) => void;
}

export const MessagesInbox = ({ onUnreadChange }: MessagesInboxProps) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const selectedConversationId = searchParams.get("conversation");

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        await fetchConversations(user.id);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('inbox-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages'
        },
        () => fetchConversations(userId)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const fetchConversations = async (uid: string) => {
    // Get all conversations user participates in
    const { data: participations } = await supabase
      .from("conversation_participants")
      .select("conversation_id, last_read_at")
      .eq("user_id", uid);

    if (!participations?.length) {
      setLoading(false);
      return;
    }

    const conversationIds = participations.map(p => p.conversation_id);

    // Get conversations with latest message
    const { data: conversationsData } = await supabase
      .from("direct_conversations")
      .select("id, updated_at")
      .in("id", conversationIds)
      .order("updated_at", { ascending: false });

    if (!conversationsData?.length) {
      setLoading(false);
      return;
    }

    // Get last message for each conversation
    const enrichedConversations: Conversation[] = [];

    for (const conv of conversationsData) {
      const { data: messages } = await supabase
        .from("direct_messages")
        .select("content, created_at, sender_id")
        .eq("conversation_id", conv.id)
        .order("created_at", { ascending: false })
        .limit(1);

      const { data: otherParticipants } = await supabase
        .from("conversation_participants")
        .select("user_id")
        .eq("conversation_id", conv.id)
        .neq("user_id", uid);

      let otherParticipant: Conversation["otherParticipant"];

      if (otherParticipants?.[0]) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .eq("id", otherParticipants[0].user_id)
          .single();

        const { data: agency } = await supabase
          .from("agency_profiles")
          .select("agency_name, logo_url")
          .eq("user_id", otherParticipants[0].user_id)
          .maybeSingle();

        if (profile) {
          otherParticipant = {
            ...profile,
            agency: agency || undefined,
          };
        }
      }

      const participation = participations.find(p => p.conversation_id === conv.id);
      const lastReadAt = participation?.last_read_at || "1970-01-01";

      const { count: unreadCount } = await supabase
        .from("direct_messages")
        .select("*", { count: "exact", head: true })
        .eq("conversation_id", conv.id)
        .neq("sender_id", uid)
        .gt("created_at", lastReadAt);

      enrichedConversations.push({
        ...conv,
        lastMessage: messages?.[0],
        otherParticipant,
        unreadCount: unreadCount || 0,
      });
    }

    setConversations(enrichedConversations);
    
    // Calculate total unread
    const totalUnread = enrichedConversations.reduce((acc, c) => acc + c.unreadCount, 0);
    onUnreadChange(totalUnread);
    
    setLoading(false);
  };

  const handleSelectConversation = (conversationId: string) => {
    setSearchParams({ tab: "messages", conversation: conversationId });
  };

  const handleBackToList = () => {
    setSearchParams({ tab: "messages" });
  };

  const handleMessageSent = () => {
    if (userId) {
      fetchConversations(userId);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-20 bg-muted animate-pulse rounded-lg" />
        <div className="h-20 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  // Mobile: show either list or chat
  // Desktop: show both side by side
  return (
    <div className="flex gap-6 h-[600px]">
      {/* Conversation List */}
      <div className={`w-full lg:w-1/3 ${selectedConversationId ? "hidden lg:block" : ""}`}>
        <Card className="h-full">
          <CardContent className="p-0 h-full overflow-auto">
            {conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-6">
                <MessageSquare className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No conversations yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Start messaging agencies from the directory
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {conversations.map((conv) => (
                  <ConversationListItem
                    key={conv.id}
                    conversation={conv}
                    isSelected={conv.id === selectedConversationId}
                    currentUserId={userId!}
                    onClick={() => handleSelectConversation(conv.id)}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Chat Window */}
      <div className={`flex-1 ${!selectedConversationId ? "hidden lg:block" : ""}`}>
        {selectedConversationId ? (
          <ChatWindow
            conversationId={selectedConversationId}
            onBack={handleBackToList}
            onMessageSent={handleMessageSent}
          />
        ) : (
          <Card className="h-full">
            <CardContent className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">Select a conversation to start messaging</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
