import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MessageBubble } from "./MessageBubble";
import { ArrowLeft, Send, Briefcase, ExternalLink } from "lucide-react";

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
}

interface ChatWindowProps {
  conversationId: string;
  onBack: () => void;
  onMessageSent: () => void;
}

export const ChatWindow = ({ conversationId, onBack, onMessageSent }: ChatWindowProps) => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [otherParticipant, setOtherParticipant] = useState<{
    id: string;
    full_name: string | null;
    email: string;
    agency?: {
      id: string;
      agency_name: string;
      logo_url: string | null;
    };
  } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        await Promise.all([
          fetchMessages(),
          fetchOtherParticipant(user.id),
          markAsRead(user.id),
        ]);
      }
    };
    init();
  }, [conversationId]);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`chat-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          setMessages(prev => [...prev, payload.new as Message]);
          markAsRead(userId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, userId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchMessages = async () => {
    const { data } = await supabase
      .from("direct_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    setMessages(data || []);
    setLoading(false);
  };

  const fetchOtherParticipant = async (uid: string) => {
    const { data: participants } = await supabase
      .from("conversation_participants")
      .select("user_id")
      .eq("conversation_id", conversationId)
      .neq("user_id", uid);

    if (participants?.[0]) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("id", participants[0].user_id)
        .single();

      const { data: agency } = await supabase
        .from("agency_profiles")
        .select("id, agency_name, logo_url")
        .eq("user_id", participants[0].user_id)
        .maybeSingle();

      if (profile) {
        setOtherParticipant({
          ...profile,
          agency: agency || undefined,
        });
      }
    }
  };

  const markAsRead = async (uid: string) => {
    await supabase
      .from("conversation_participants")
      .update({ last_read_at: new Date().toISOString() })
      .eq("conversation_id", conversationId)
      .eq("user_id", uid);
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !userId) return;

    setSending(true);
    const { error } = await supabase
      .from("direct_messages")
      .insert({
        conversation_id: conversationId,
        sender_id: userId,
        content: newMessage.trim(),
      });

    if (error) {
      toast.error("Failed to send message");
    } else {
      setNewMessage("");
      onMessageSent();
      
      // Update conversation updated_at
      await supabase
        .from("direct_conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", conversationId);
    }
    setSending(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const displayName = otherParticipant?.agency?.agency_name || 
    otherParticipant?.full_name || 
    otherParticipant?.email || 
    "Loading...";

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0 border-b py-3 px-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="lg:hidden">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div 
            className="w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden cursor-pointer"
            onClick={() => otherParticipant?.agency && navigate(`/agency/${otherParticipant.agency.id}`)}
          >
            {otherParticipant?.agency?.logo_url ? (
              <img src={otherParticipant.agency.logo_url} alt={displayName} className="w-full h-full object-cover" />
            ) : (
              <Briefcase className="w-5 h-5 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1">
            <h3 className="font-semibold">{displayName}</h3>
          </div>
          {otherParticipant?.agency && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(`/agency/${otherParticipant.agency!.id}`)}
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-auto p-4 space-y-4">
        {loading ? (
          <div className="space-y-4">
            <div className="h-12 w-3/4 bg-muted animate-pulse rounded-lg" />
            <div className="h-12 w-1/2 bg-muted animate-pulse rounded-lg ml-auto" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            No messages yet. Start the conversation!
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isOwn={msg.sender_id === userId}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </CardContent>

      <div className="flex-shrink-0 border-t p-4">
        <div className="flex gap-2">
          <Textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Type a message..."
            rows={1}
            className="resize-none"
          />
          <Button onClick={handleSend} disabled={sending || !newMessage.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
};
