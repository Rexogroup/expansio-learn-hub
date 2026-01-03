import { useState, useEffect } from "react";
import { CRMLead, TeamMember } from "@/pages/CRM";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, MoreHorizontal, Trash2, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { InlineMessageCell } from "./InlineMessageCell";

interface LeadSpreadsheetProps {
  leads: CRMLead[];
  teamMembers: TeamMember[];
  teamId: string;
  userCalendlyLink: string | null;
  onUpdate: (lead: CRMLead) => void;
  onCreate: (lead: Partial<CRMLead>) => void;
  onDelete: (leadId: string) => void;
}

interface MessageTemplate {
  id: string;
  name: string;
  template_type: string;
  content: string;
}

const STATUS_OPTIONS = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'interested', label: 'Interested' },
  { value: 'meeting_booked', label: 'Meeting Booked' },
  { value: 'meeting_completed', label: 'Meeting Completed' },
  { value: 'proposal', label: 'Proposal' },
  { value: 'closed_won', label: 'Closed Won' },
  { value: 'closed_lost', label: 'Closed Lost' },
];

const DEFAULT_TEMPLATES = {
  connection_followup: "Hey {{first_name}}! Thanks for connecting. I noticed you're at {{company}} - I'd love to learn more about what you're working on. What's the best way to get a quick 15-minute chat on the calendar?",
  appointment_setting: "Hi {{first_name}}, great to connect! I help companies like {{company}} achieve their growth goals. Would you be open to a quick call to see if there's a fit? Here's my calendar: {{calendly_link}}"
};

export const LeadSpreadsheet = ({
  leads,
  teamMembers,
  teamId,
  userCalendlyLink,
  onUpdate,
  onCreate,
  onDelete,
}: LeadSpreadsheetProps) => {
  const [editingCell, setEditingCell] = useState<{ leadId: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);

  useEffect(() => {
    if (teamId) {
      fetchTemplates();
    }
  }, [teamId]);

  const fetchTemplates = async () => {
    const { data } = await supabase
      .from('crm_message_templates')
      .select('*')
      .eq('team_id', teamId);
    
    if (data && data.length > 0) {
      setTemplates(data);
    }
  };

  const fillTemplate = (templateContent: string, lead: CRMLead): string => {
    const firstName = lead.lead_name?.split(' ')[0] || 'there';
    const company = lead.company || 'your company';
    const calendlyLink = userCalendlyLink || '[Your Calendly Link]';

    return templateContent
      .replace(/\{\{first_name\}\}/g, firstName)
      .replace(/\{\{company\}\}/g, company)
      .replace(/\{\{calendly_link\}\}/g, calendlyLink);
  };

  const getMessageForLead = (lead: CRMLead, type: 'connection_followup' | 'appointment_setting'): string => {
    const template = templates.find(t => t.template_type === type);
    const templateContent = template?.content || DEFAULT_TEMPLATES[type];
    return fillTemplate(templateContent, lead);
  };

  const handleStartEdit = (leadId: string, field: string, currentValue: string) => {
    setEditingCell({ leadId, field });
    setEditValue(currentValue || "");
  };

  const handleSaveEdit = (lead: CRMLead) => {
    if (!editingCell) return;

    const updatedLead = { ...lead, [editingCell.field]: editValue || null };
    onUpdate(updatedLead);
    setEditingCell(null);
    setEditValue("");
  };

  const handleCheckboxChange = (lead: CRMLead, field: keyof CRMLead, checked: boolean) => {
    const updatedLead = { ...lead, [field]: checked };
    
    // Auto-update status based on checkbox changes
    if (field === 'interested' && checked && lead.status === 'contacted') {
      updatedLead.status = 'interested';
    }
    if (field === 'meeting_booked' && checked && ['new', 'contacted', 'interested'].includes(lead.status)) {
      updatedLead.status = 'meeting_booked';
    }
    
    onUpdate(updatedLead);
  };

  const handleStatusChange = (lead: CRMLead, status: string) => {
    onUpdate({ ...lead, status: status as CRMLead['status'] });
  };

  const handleAssigneeChange = (lead: CRMLead, assigneeId: string) => {
    onUpdate({ ...lead, assigned_to: assigneeId === 'unassigned' ? null : assigneeId });
  };

  const renderEditableCell = (lead: CRMLead, field: keyof CRMLead, value: string | null) => {
    const isEditing = editingCell?.leadId === lead.id && editingCell?.field === field;

    if (isEditing) {
      return (
        <Input
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={() => handleSaveEdit(lead)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSaveEdit(lead);
            if (e.key === 'Escape') setEditingCell(null);
          }}
          autoFocus
          className="h-8 text-sm"
        />
      );
    }

    return (
      <div
        className="cursor-pointer hover:bg-muted/50 px-2 py-1 rounded min-h-[28px] text-sm"
        onClick={() => handleStartEdit(lead.id, field, value || "")}
      >
        {value || <span className="text-muted-foreground">-</span>}
      </div>
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-muted text-muted-foreground';
      case 'contacted': return 'bg-blue-500/20 text-blue-700 dark:text-blue-300';
      case 'interested': return 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-300';
      case 'meeting_booked': return 'bg-purple-500/20 text-purple-700 dark:text-purple-300';
      case 'meeting_completed': return 'bg-indigo-500/20 text-indigo-700 dark:text-indigo-300';
      case 'proposal': return 'bg-orange-500/20 text-orange-700 dark:text-orange-300';
      case 'closed_won': return 'bg-green-500/20 text-green-700 dark:text-green-300';
      case 'closed_lost': return 'bg-red-500/20 text-red-700 dark:text-red-300';
      default: return 'bg-muted';
    }
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="p-3 border-b bg-muted/30">
        <Button size="sm" onClick={() => onCreate({ lead_name: "New Lead" })}>
          <Plus className="h-4 w-4 mr-2" />
          Add Lead
        </Button>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[150px]">Name</TableHead>
              <TableHead className="w-[140px]">Company</TableHead>
              <TableHead className="w-[160px]">Email</TableHead>
              <TableHead className="w-[80px]">LinkedIn</TableHead>
              <TableHead className="w-[110px]">1st Reach</TableHead>
              <TableHead className="w-[90px]">SDR</TableHead>
              <TableHead className="w-[70px] text-center">Conn.</TableHead>
              <TableHead className="w-[70px] text-center">Acc.</TableHead>
              <TableHead className="w-[200px]">1st Message</TableHead>
              <TableHead className="w-[200px]">Appointment Msg</TableHead>
              <TableHead className="w-[70px] text-center">Int.</TableHead>
              <TableHead className="w-[70px] text-center">Meet.</TableHead>
              <TableHead className="w-[90px]">Deal $</TableHead>
              <TableHead className="w-[130px]">Status</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={15} className="text-center py-8 text-muted-foreground">
                  No leads yet. Click "Add Lead" to get started.
                </TableCell>
              </TableRow>
            ) : (
              leads.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell className="font-medium">
                    {renderEditableCell(lead, 'lead_name', lead.lead_name)}
                  </TableCell>
                  <TableCell>
                    {renderEditableCell(lead, 'company', lead.company)}
                  </TableCell>
                  <TableCell>
                    {renderEditableCell(lead, 'lead_email', lead.lead_email)}
                  </TableCell>
                  <TableCell>
                    {lead.linkedin_url ? (
                      <a
                        href={lead.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-primary hover:underline text-sm"
                      >
                        <ExternalLink className="h-3 w-3" />
                        View
                      </a>
                    ) : (
                      <div
                        className="cursor-pointer hover:bg-muted/50 px-2 py-1 rounded text-sm text-muted-foreground"
                        onClick={() => handleStartEdit(lead.id, 'linkedin_url', "")}
                      >
                        Add
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Input
                      type="date"
                      value={lead.first_reach_date || ""}
                      onChange={(e) => onUpdate({ ...lead, first_reach_date: e.target.value || null })}
                      className="h-8 text-sm w-[100px]"
                    />
                  </TableCell>
                  <TableCell>
                    <Select
                      value={lead.assigned_to || "unassigned"}
                      onValueChange={(value) => handleAssigneeChange(lead, value)}
                    >
                      <SelectTrigger className="h-8 text-sm w-[85px]">
                        <SelectValue placeholder="Assign" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">-</SelectItem>
                        {teamMembers.map((member) => (
                          <SelectItem key={member.user_id} value={member.user_id}>
                            {member.profile?.full_name?.split(' ')[0] || member.profile?.email?.split('@')[0] || 'User'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-center">
                    <Checkbox
                      checked={lead.connection_sent}
                      onCheckedChange={(checked) => 
                        handleCheckboxChange(lead, 'connection_sent', checked as boolean)
                      }
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <Checkbox
                      checked={lead.connection_accepted}
                      onCheckedChange={(checked) => 
                        handleCheckboxChange(lead, 'connection_accepted', checked as boolean)
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <InlineMessageCell
                      message={getMessageForLead(lead, 'connection_followup')}
                      isActive={lead.connection_accepted || false}
                    />
                  </TableCell>
                  <TableCell>
                    <InlineMessageCell
                      message={getMessageForLead(lead, 'appointment_setting')}
                      isActive={lead.connection_accepted || false}
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <Checkbox
                      checked={lead.interested}
                      onCheckedChange={(checked) => 
                        handleCheckboxChange(lead, 'interested', checked as boolean)
                      }
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <Checkbox
                      checked={lead.meeting_booked}
                      onCheckedChange={(checked) => 
                        handleCheckboxChange(lead, 'meeting_booked', checked as boolean)
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={lead.deal_value || ""}
                      onChange={(e) => onUpdate({ ...lead, deal_value: e.target.value ? parseFloat(e.target.value) : null })}
                      className="h-8 text-sm w-[80px]"
                      placeholder="$0"
                    />
                  </TableCell>
                  <TableCell>
                    <Select
                      value={lead.status}
                      onValueChange={(value) => handleStatusChange(lead, value)}
                    >
                      <SelectTrigger className={`h-8 text-sm ${getStatusColor(lead.status)}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => onDelete(lead.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
