import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Send } from "lucide-react";

interface StartConversationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipientUserId: string;
  recipientName: string;
}

export const StartConversationDialog = ({
  open,
  onOpenChange,
  recipientUserId,
  recipientName,
}: StartConversationDialogProps) => {
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!message.trim()) {
      toast.error("Please enter a message");
      return;
    }

    setSending(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in");
        return;
      }

      // Check if conversation already exists
      const { data: existingParticipations } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", user.id);

      let conversationId: string | null = null;

      if (existingParticipations?.length) {
        const conversationIds = existingParticipations.map(p => p.conversation_id);
        
        const { data: recipientParticipation } = await supabase
          .from("conversation_participants")
          .select("conversation_id")
          .eq("user_id", recipientUserId)
          .in("conversation_id", conversationIds)
          .maybeSingle();

        if (recipientParticipation) {
          conversationId = recipientParticipation.conversation_id;
        }
      }

      // Create new conversation if doesn't exist
      if (!conversationId) {
        const { data: newConversation, error: convError } = await supabase
          .from("direct_conversations")
          .insert({})
          .select()
          .single();

        if (convError) throw convError;
        conversationId = newConversation.id;

        // Add participants
        const { error: partError } = await supabase
          .from("conversation_participants")
          .insert([
            { conversation_id: conversationId, user_id: user.id },
            { conversation_id: conversationId, user_id: recipientUserId },
          ]);

        if (partError) throw partError;

        // Also create a connection request if not already connected
        const { data: existingConnection } = await supabase
          .from("connections")
          .select("id")
          .or(`and(requester_id.eq.${user.id},recipient_id.eq.${recipientUserId}),and(requester_id.eq.${recipientUserId},recipient_id.eq.${user.id})`)
          .maybeSingle();

        if (!existingConnection) {
          await supabase
            .from("connections")
            .insert({
              requester_id: user.id,
              recipient_id: recipientUserId,
              intro_message: message.trim().substring(0, 200),
            });

          // Get sender's profile for email notification
          const { data: senderProfile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", user.id)
            .single();

          const { data: senderAgency } = await supabase
            .from("agency_profiles")
            .select("agency_name")
            .eq("user_id", user.id)
            .maybeSingle();

          // Send connection request email notification
          supabase.functions.invoke("send-notification-email", {
            body: {
              type: "connection_request",
              recipientUserId,
              senderName: senderProfile?.full_name || user.email,
              senderAgencyName: senderAgency?.agency_name,
              messagePreview: message.trim().substring(0, 200),
            },
          }).catch(console.error);
        }
      }

      // Send message
      const { error: msgError } = await supabase
        .from("direct_messages")
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: message.trim(),
        });

      if (msgError) throw msgError;

      // Get sender info for email notification
      const { data: senderProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      const { data: senderAgency } = await supabase
        .from("agency_profiles")
        .select("agency_name")
        .eq("user_id", user.id)
        .maybeSingle();

      // Send new message email notification
      supabase.functions.invoke("send-notification-email", {
        body: {
          type: "new_message",
          recipientUserId,
          senderName: senderProfile?.full_name || user.email,
          senderAgencyName: senderAgency?.agency_name,
          messagePreview: message.trim(),
        },
      }).catch(console.error);

      toast.success("Message sent!");
      setMessage("");
      onOpenChange(false);
      navigate(`/network?tab=messages&conversation=${conversationId}`);
    } catch (error: any) {
      toast.error(error.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Message {recipientName}</DialogTitle>
          <DialogDescription>
            Start a conversation. This will also send a connection request if you're not already connected.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="message">Your Message</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Hi! I'd love to explore potential collaboration opportunities..."
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={sending} className="gap-2">
            <Send className="w-4 h-4" />
            {sending ? "Sending..." : "Send Message"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
