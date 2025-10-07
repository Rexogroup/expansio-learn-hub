import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Download, Trash2, FileText } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface SavedScript {
  id: string;
  title: string;
  content: string;
  created_at: string;
}

const SavedScripts = () => {
  const [scripts, setScripts] = useState<SavedScript[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadScripts();
  }, []);

  const loadScripts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("generated_scripts")
        .select("id, title, content, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setScripts(data || []);
    } catch (error: any) {
      console.error("Error loading scripts:", error);
      toast.error("Failed to load saved scripts");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (content: string) => {
    await navigator.clipboard.writeText(content);
    toast.success("Copied to clipboard");
  };

  const handleDownload = (script: SavedScript) => {
    const blob = new Blob([script.content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${script.title}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Script downloaded");
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("generated_scripts")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Script deleted");
      loadScripts();
    } catch (error: any) {
      console.error("Error deleting script:", error);
      toast.error("Failed to delete script");
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading saved scripts...</div>;
  }

  if (scripts.length === 0) {
    return (
      <Card className="p-12 text-center">
        <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">No saved scripts yet</h3>
        <p className="text-muted-foreground">
          Save lead magnet scripts from your conversations to access them later
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Saved Scripts</h2>
      <div className="grid gap-4">
        {scripts.map((script) => (
          <Card key={script.id} className="p-6">
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold">{script.title}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Saved {formatDistanceToNow(new Date(script.created_at), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
              </div>

              <div className="bg-muted/50 p-4 rounded-lg">
                <pre className="whitespace-pre-wrap text-sm font-mono">
                  {script.content}
                </pre>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopy(script.content)}
                >
                  <Copy className="h-3 w-3 mr-1" />
                  Copy
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownload(script)}
                >
                  <Download className="h-3 w-3 mr-1" />
                  Download
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(script.id)}
                  className="text-destructive"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Delete
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default SavedScripts;
