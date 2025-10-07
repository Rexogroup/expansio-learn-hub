import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Send, Plus, Loader2 } from "lucide-react";
import ChatMessage from "./ChatMessage";
import WelcomeMessage from "./WelcomeMessage";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

interface ChatInterfaceProps {
  conversationId: string | null;
  onNewConversation: () => void;
}

const ChatInterface = ({ conversationId, onNewConversation }: ChatInterfaceProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (conversationId) {
      loadMessages();
    } else {
      setMessages([]);
    }
  }, [conversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadMessages = async () => {
    try {
      const { data, error } = await supabase
        .from("script_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMessages((data as Message[]) || []);
    } catch (error: any) {
      console.error("Error loading messages:", error);
      toast.error("Failed to load messages");
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    if (!conversationId) {
      toast.error("Please start a new conversation first");
      return;
    }

    const userMessage = input.trim();
    setInput("");
    setIsLoading(true);
    setIsStreaming(true);

    // Add user message immediately
    const tempUserMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: userMessage,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempUserMsg]);

    // Prepare assistant message placeholder
    const tempAssistantMsg: Message = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "",
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempAssistantMsg]);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-lead-magnet`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            conversationId,
            message: userMessage,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate response");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantResponse = "";

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n").filter(line => line.trim() !== "");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                assistantResponse += parsed.content;
                setMessages(prev => {
                  const updated = [...prev];
                  const lastMsg = updated[updated.length - 1];
                  if (lastMsg.role === "assistant") {
                    lastMsg.content = assistantResponse;
                  }
                  return updated;
                });
              }
            } catch (e) {
              console.error("Error parsing SSE:", e);
            }
          }
        }
      }

      // Reload messages to get the saved version
      await loadMessages();
      setIsStreaming(false);
    } catch (error: any) {
      console.error("Error sending message:", error);
      toast.error(error.message || "Failed to send message");
      // Remove failed messages
      setMessages(prev => prev.slice(0, -2));
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-300px)]">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold">Chat</h2>
        <Button onClick={onNewConversation} variant="outline">
          <Plus className="mr-2 h-4 w-4" />
          New Conversation
        </Button>
      </div>

      <Card className="flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 && !conversationId && <WelcomeMessage />}
          
          {messages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message}
              conversationId={conversationId}
            />
          ))}
          
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={conversationId ? "Type your message..." : "Start a new conversation first..."}
              disabled={isLoading || !conversationId}
              className="min-h-[60px] resize-none"
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading || !conversationId}
              size="icon"
              className="h-[60px] w-[60px]"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>
          {isStreaming && (
            <p className="text-xs text-muted-foreground mt-2">AI is typing...</p>
          )}
        </div>
      </Card>
    </div>
  );
};

export default ChatInterface;
