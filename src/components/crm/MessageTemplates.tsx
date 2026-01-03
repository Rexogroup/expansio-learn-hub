import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CRMLead, TeamMember } from "@/pages/CRM";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Plus, Trash2, Copy, Check, FileText, Link } from "lucide-react";

interface MessageTemplate {
  id: string;
  team_id: string;
  created_by: string;
  name: string;
  template_type: string;
  content: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

interface MessageTemplatesProps {
  teamId: string;
  userId: string;
  leads: CRMLead[];
  userCalendlyLink: string | null;
  onCalendlyLinkUpdate: (link: string) => void;
}

const DEFAULT_TEMPLATES = [
  {
    name: "Connection Follow-up",
    template_type: "connection_followup",
    content: `Hey {{first_name}}! Thanks for connecting. I noticed you're at {{company}} - I'd love to learn more about what you're working on. What's the best way to get a quick 15-minute chat on the calendar?`,
    is_default: true,
  },
  {
    name: "Appointment Setting",
    template_type: "appointment_setting",
    content: `Hi {{first_name}}, great to connect! I help companies like {{company}} grow their revenue through targeted outbound strategies. Would you be open to a quick call to see if there's a fit? Here's my calendar: {{calendly_link}}`,
    is_default: true,
  },
];

export const MessageTemplates = ({
  teamId,
  userId,
  leads,
  userCalendlyLink,
  onCalendlyLinkUpdate,
}: MessageTemplatesProps) => {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [calendlyLink, setCalendlyLink] = useState(userCalendlyLink || "");
  
  // New template form
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateContent, setNewTemplateContent] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, [teamId]);

  useEffect(() => {
    setCalendlyLink(userCalendlyLink || "");
  }, [userCalendlyLink]);

  const fetchTemplates = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("crm_message_templates")
        .select("*")
        .eq("team_id", teamId)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: true });

      if (error) throw error;

      // If no templates exist, create defaults
      if (!data || data.length === 0) {
        await createDefaultTemplates();
        return;
      }

      setTemplates(data as MessageTemplate[]);
      if (data.length > 0 && !selectedTemplateId) {
        setSelectedTemplateId(data[0].id);
      }
    } catch (error: any) {
      console.error("Error fetching templates:", error);
      toast.error("Failed to load templates");
    } finally {
      setIsLoading(false);
    }
  };

  const createDefaultTemplates = async () => {
    try {
      const templatesWithMeta = DEFAULT_TEMPLATES.map((t) => ({
        ...t,
        team_id: teamId,
        created_by: userId,
      }));

      const { data, error } = await supabase
        .from("crm_message_templates")
        .insert(templatesWithMeta)
        .select();

      if (error) throw error;

      setTemplates(data as MessageTemplate[]);
      if (data && data.length > 0) {
        setSelectedTemplateId(data[0].id);
      }
    } catch (error: any) {
      console.error("Error creating default templates:", error);
    }
  };

  const handleCreateTemplate = async () => {
    if (!newTemplateName.trim() || !newTemplateContent.trim()) {
      toast.error("Please fill in both name and content");
      return;
    }

    setIsCreating(true);
    try {
      const { data, error } = await supabase
        .from("crm_message_templates")
        .insert({
          team_id: teamId,
          created_by: userId,
          name: newTemplateName,
          template_type: "custom",
          content: newTemplateContent,
          is_default: false,
        })
        .select()
        .single();

      if (error) throw error;

      setTemplates((prev) => [...prev, data as MessageTemplate]);
      setNewTemplateName("");
      setNewTemplateContent("");
      toast.success("Template created");
    } catch (error: any) {
      console.error("Error creating template:", error);
      toast.error("Failed to create template");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    if (template?.is_default) {
      toast.error("Cannot delete default templates");
      return;
    }

    try {
      const { error } = await supabase
        .from("crm_message_templates")
        .delete()
        .eq("id", templateId);

      if (error) throw error;

      setTemplates((prev) => prev.filter((t) => t.id !== templateId));
      if (selectedTemplateId === templateId) {
        setSelectedTemplateId(templates[0]?.id || null);
      }
      toast.success("Template deleted");
    } catch (error: any) {
      console.error("Error deleting template:", error);
      toast.error("Failed to delete template");
    }
  };

  const handleSaveCalendlyLink = async () => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ calendly_link: calendlyLink })
        .eq("id", userId);

      if (error) throw error;

      onCalendlyLinkUpdate(calendlyLink);
      toast.success("Calendly link saved");
    } catch (error: any) {
      console.error("Error saving Calendly link:", error);
      toast.error("Failed to save Calendly link");
    }
  };

  const fillTemplate = (template: MessageTemplate, lead: CRMLead) => {
    const firstName = lead.lead_name?.split(" ")[0] || "there";
    const company = lead.company || "your company";
    const calendly = calendlyLink || "[Your Calendly Link]";

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

  const connectedLeads = leads.filter((l) => l.connection_accepted);
  const selectedLead = leads.find((l) => l.id === selectedLeadId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left: Templates Management */}
      <div className="space-y-4">
        {/* Calendly Link Setting */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Link className="h-4 w-4" />
              Your Calendly Link
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                placeholder="https://calendly.com/yourname/15min"
                value={calendlyLink}
                onChange={(e) => setCalendlyLink(e.target.value)}
                className="flex-1"
              />
              <Button size="sm" onClick={handleSaveCalendlyLink}>
                Save
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              This will be used for the {"{{calendly_link}}"} placeholder
            </p>
          </CardContent>
        </Card>

        {/* Templates List */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Message Templates
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <ScrollArea className="h-[200px] pr-2">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className={`flex items-center justify-between p-2 rounded-md mb-2 cursor-pointer border ${
                    selectedTemplateId === template.id
                      ? "border-primary bg-primary/5"
                      : "border-transparent hover:bg-muted/50"
                  }`}
                  onClick={() => setSelectedTemplateId(template.id)}
                >
                  <div>
                    <p className="font-medium text-sm">{template.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {template.template_type.replace("_", " ")}
                      {template.is_default && " • Default"}
                    </p>
                  </div>
                  {!template.is_default && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteTemplate(template.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
            </ScrollArea>

            {/* Create New Template */}
            <div className="border-t pt-3 space-y-3">
              <Label className="text-sm font-medium">Create New Template</Label>
              <Input
                placeholder="Template name..."
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
              />
              <Textarea
                placeholder="Template content... Use {{first_name}}, {{company}}, {{calendly_link}}"
                value={newTemplateContent}
                onChange={(e) => setNewTemplateContent(e.target.value)}
                rows={3}
              />
              <Button
                size="sm"
                onClick={handleCreateTemplate}
                disabled={isCreating}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Template
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right: Message Generator */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Generate Messages</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm">Select a Connected Lead</Label>
            <Select
              value={selectedLeadId || ""}
              onValueChange={setSelectedLeadId}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Choose a lead..." />
              </SelectTrigger>
              <SelectContent>
                {connectedLeads.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground">
                    No leads with accepted connections
                  </div>
                ) : (
                  connectedLeads.map((lead) => (
                    <SelectItem key={lead.id} value={lead.id}>
                      {lead.lead_name} {lead.company ? `(${lead.company})` : ""}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {selectedLead && (
            <ScrollArea className="h-[350px] pr-2">
              <div className="space-y-4">
                {templates.map((template) => {
                  const filledMessage = fillTemplate(template, selectedLead);
                  const copyId = `${template.id}-${selectedLead.id}`;
                  
                  return (
                    <div
                      key={template.id}
                      className="p-3 border rounded-lg space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm">{template.name}</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 gap-1"
                          onClick={() => handleCopy(filledMessage, copyId)}
                        >
                          {copiedId === copyId ? (
                            <>
                              <Check className="h-3 w-3" />
                              Copied
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" />
                              Copy
                            </>
                          )}
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {filledMessage}
                      </p>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}

          {!selectedLead && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <FileText className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Select a lead to generate personalized messages
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
