import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check, Save } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

interface ChatMessageProps {
  message: Message;
  conversationId: string | null;
}

const ChatMessage = ({ message, conversationId }: ChatMessageProps) => {
  const [copied, setCopied] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [scriptTitle, setScriptTitle] = useState("");

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("generated_scripts").insert({
        user_id: user.id,
        conversation_id: conversationId,
        title: scriptTitle || "Untitled Script",
        content: message.content,
      });

      if (error) throw error;

      toast.success("Script saved successfully");
      setSaveDialogOpen(false);
      setScriptTitle("");
    } catch (error: any) {
      console.error("Error saving script:", error);
      toast.error("Failed to save script");
    }
  };

  const isAssistant = message.role === "assistant";

  return (
    <div
      className={cn(
        "flex gap-3 p-4 rounded-lg",
        isAssistant ? "bg-muted/50" : "bg-primary/5"
      )}
    >
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
        {isAssistant ? "🤖" : "👤"}
      </div>
      
      <div className="flex-1 space-y-2">
        <div className="font-semibold text-sm">
          {isAssistant ? "AI Assistant" : "You"}
        </div>
        <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap">
          {message.content}
        </div>
        
        {isAssistant && message.content && (
          <div className="flex gap-2 mt-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="h-8"
            >
              {copied ? (
                <Check className="h-3 w-3 mr-1" />
              ) : (
                <Copy className="h-3 w-3 mr-1" />
              )}
              {copied ? "Copied" : "Copy"}
            </Button>

            <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8">
                  <Save className="h-3 w-3 mr-1" />
                  Save Script
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Save Script</DialogTitle>
                  <DialogDescription>
                    Give your script a name to save it for later reference.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Script Title</Label>
                    <Input
                      id="title"
                      placeholder="e.g., CRO Lead Magnets for SaaS"
                      value={scriptTitle}
                      onChange={(e) => setScriptTitle(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSave}>Save</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;
