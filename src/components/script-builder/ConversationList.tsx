import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface ConversationListProps {
  onSelectConversation: (id: string) => void;
  refreshTrigger: number;
}

const ConversationList = ({ onSelectConversation, refreshTrigger }: ConversationListProps) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConversations();
  }, [refreshTrigger]);

  const loadConversations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("script_conversations")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      setConversations(data || []);
    } catch (error: any) {
      console.error("Error loading conversations:", error);
      toast.error("Failed to load conversations");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("script_conversations")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Conversation deleted");
      loadConversations();
    } catch (error: any) {
      console.error("Error deleting conversation:", error);
      toast.error("Failed to delete conversation");
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading conversations...</div>;
  }

  if (conversations.length === 0) {
    return (
      <Card className="p-12 text-center">
        <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">No conversations yet</h3>
        <p className="text-muted-foreground">
          Start a new conversation to create lead magnet scripts
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Conversation History</h2>
      <div className="grid gap-4">
        {conversations.map((conversation) => (
          <Card key={conversation.id} className="p-4 hover:bg-muted/50 transition-colors">
            <div className="flex items-start justify-between">
              <button
                onClick={() => onSelectConversation(conversation.id)}
                className="flex-1 text-left"
              >
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold">{conversation.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(conversation.updated_at), {
                    addSuffix: true,
                  })}
                </p>
              </button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDelete(conversation.id)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ConversationList;
