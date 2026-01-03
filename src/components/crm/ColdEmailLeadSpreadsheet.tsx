import { useState } from "react";
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
import { Badge } from "@/components/ui/badge";
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
import { Plus, MoreHorizontal, Trash2, Mail, MessageSquare } from "lucide-react";
import { format } from "date-fns";

interface ColdEmailLeadSpreadsheetProps {
  leads: CRMLead[];
  teamMembers: TeamMember[];
  teamId: string;
  onUpdate: (lead: CRMLead) => void;
  onCreate: (lead: Partial<CRMLead>) => void;
  onDelete: (leadId: string) => void;
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

export const ColdEmailLeadSpreadsheet = ({
  leads,
  teamMembers,
  teamId,
  onUpdate,
  onCreate,
  onDelete,
}: ColdEmailLeadSpreadsheetProps) => {
  const [editingCell, setEditingCell] = useState<{ leadId: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState<string>("");

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

  const getPlatformBadge = (platform: string | null) => {
    if (platform === 'emailbison') {
      return <Badge variant="secondary" className="text-[10px] px-1.5">EB</Badge>;
    }
    if (platform === 'instantly') {
      return <Badge variant="secondary" className="text-[10px] px-1.5">IN</Badge>;
    }
    return null;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    try {
      return format(new Date(dateString), 'MMM d');
    } catch {
      return '-';
    }
  };

  // Filter to only show cold email leads
  const coldEmailLeads = leads.filter(l => l.source_type === 'cold_email');

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="p-3 border-b bg-muted/30 flex items-center justify-between">
        <Button size="sm" onClick={() => onCreate({ lead_name: "New Lead", source_type: 'cold_email' })}>
          <Plus className="h-4 w-4 mr-2" />
          Add Lead
        </Button>
        <div className="text-sm text-muted-foreground">
          {coldEmailLeads.length} lead{coldEmailLeads.length !== 1 ? 's' : ''} from cold email
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[150px]">Name</TableHead>
              <TableHead className="w-[160px]">Email</TableHead>
              <TableHead className="w-[120px]">Company</TableHead>
              <TableHead className="w-[140px]">Campaign</TableHead>
              <TableHead className="w-[60px]">Platform</TableHead>
              <TableHead className="w-[70px] text-center">Replies</TableHead>
              <TableHead className="w-[90px]">SDR</TableHead>
              <TableHead className="w-[70px] text-center">Meet.</TableHead>
              <TableHead className="w-[90px]">Deal $</TableHead>
              <TableHead className="w-[130px]">Status</TableHead>
              <TableHead className="w-[90px]">Last Activity</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {coldEmailLeads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <Mail className="h-8 w-8 text-muted-foreground/50" />
                    <p>No cold email leads yet.</p>
                    <p className="text-xs">Interested replies from EmailBison/Instantly will appear here automatically.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              coldEmailLeads.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell className="font-medium">
                    {renderEditableCell(lead, 'lead_name', lead.lead_name)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Mail className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm truncate max-w-[140px]">{lead.lead_email || '-'}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {renderEditableCell(lead, 'company', lead.company)}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground truncate max-w-[130px] block">
                      {(lead as any).campaign_name || '-'}
                    </span>
                  </TableCell>
                  <TableCell>
                    {getPlatformBadge((lead as any).platform)}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <MessageSquare className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm">{(lead as any).reply_count || 1}</span>
                    </div>
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
                    <span className="text-xs text-muted-foreground">
                      {formatDate((lead as any).last_activity_at)}
                    </span>
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