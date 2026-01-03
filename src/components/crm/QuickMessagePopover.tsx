import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CRMLead } from "@/pages/CRM";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";
import { MessageSquare, Copy, Check } from "lucide-react";

interface MessageTemplate {
  id: string;
  name: string;
  content: string;
}

interface QuickMessagePopoverProps {
  lead: CRMLead;
  teamId: string;
  userCalendlyLink: string | null;
}

export const QuickMessagePopover = ({
  lead,
  teamId,
  userCalendlyLink,
}: QuickMessagePopoverProps) => {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchTemplates();
    }
  }, [isOpen, teamId]);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from("crm_message_templates")
        .select("id, name, content")
        .eq("team_id", teamId)
        .order("is_default", { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error("Error fetching templates:", error);
    }
  };

  const fillTemplate = (template: MessageTemplate) => {
    const firstName = lead.lead_name?.split(" ")[0] || "there";
    const company = lead.company || "your company";
    const calendly = userCalendlyLink || "[Your Calendly Link]";

    return template.content
      .replace(/\{\{first_name\}\}/g, firstName)
      .replace(/\{\{company\}\}/g, company)
      .replace(/\{\{calendly_link\}\}/g, calendly);
  };

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      toast.error("Failed to copy");
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          title="Copy message"
        >
          <MessageSquare className="h-4 w-4 text-primary" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-2">
          <p className="font-medium text-sm mb-3">Quick Messages for {lead.lead_name?.split(" ")[0]}</p>
          {templates.length === 0 ? (
            <p className="text-sm text-muted-foreground">No templates available</p>
          ) : (
            templates.map((template) => {
              const filledMessage = fillTemplate(template);
              return (
                <div
                  key={template.id}
                  className="p-2 border rounded-md hover:bg-muted/50 cursor-pointer"
                  onClick={() => handleCopy(filledMessage, template.id)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium">{template.name}</span>
                    {copiedId === template.id ? (
                      <Check className="h-3 w-3 text-green-500" />
                    ) : (
                      <Copy className="h-3 w-3 text-muted-foreground" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {filledMessage}
                  </p>
                </div>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
