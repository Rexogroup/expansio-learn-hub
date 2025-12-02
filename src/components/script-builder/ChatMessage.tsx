import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check, Save, Star } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const CATEGORIES = [
  { value: "general", label: "General" },
  { value: "seo", label: "SEO" },
  { value: "ads", label: "Ads & Creatives" },
  { value: "cro", label: "CRO" },
  { value: "content", label: "Content Marketing" },
  { value: "email", label: "Email Marketing" },
  { value: "social", label: "Social Media" },
  { value: "web", label: "Web Development" },
  { value: "ai", label: "AI Services" },
  { value: "other", label: "Other" },
];

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
  const [favoriteDialogOpen, setFavoriteDialogOpen] = useState(false);
  const [scriptTitle, setScriptTitle] = useState("");
  const [favoriteTitle, setFavoriteTitle] = useState("");
  const [favoriteCategory, setFavoriteCategory] = useState("general");

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

  const handleSaveToFavorites = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("saved_lead_magnets").insert({
        user_id: user.id,
        conversation_id: conversationId,
        title: favoriteTitle || "Untitled Lead Magnet",
        content: message.content,
        category: favoriteCategory,
      });

      if (error) throw error;

      toast.success("Added to favorites!");
      setFavoriteDialogOpen(false);
      setFavoriteTitle("");
      setFavoriteCategory("general");
    } catch (error: any) {
      console.error("Error saving to favorites:", error);
      toast.error("Failed to save to favorites");
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
        <div className="prose prose-sm max-w-none dark:prose-invert">
          <ReactMarkdown>{message.content}</ReactMarkdown>
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

            <Dialog open={favoriteDialogOpen} onOpenChange={setFavoriteDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 text-yellow-600 hover:text-yellow-700">
                  <Star className="h-3 w-3 mr-1" />
                  Add to Favorites
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add to Favorites</DialogTitle>
                  <DialogDescription>
                    Save this lead magnet to your favorites for quick access.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="favorite-title">Title</Label>
                    <Input
                      id="favorite-title"
                      placeholder="e.g., 4 UGC Creatives Offer"
                      value={favoriteTitle}
                      onChange={(e) => setFavoriteTitle(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="favorite-category">Category</Label>
                    <Select value={favoriteCategory} onValueChange={setFavoriteCategory}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setFavoriteDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveToFavorites} className="bg-yellow-600 hover:bg-yellow-700">
                    <Star className="h-4 w-4 mr-1" />
                    Add to Favorites
                  </Button>
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
