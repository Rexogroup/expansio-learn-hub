import { CRMLead, TeamMember } from "@/pages/CRM";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DollarSign, Building2, Mail, MessageSquare } from "lucide-react";

interface LeadPipelineProps {
  leads: CRMLead[];
  teamMembers: TeamMember[];
  onUpdate: (lead: CRMLead) => void;
  sourceType?: 'linkedin' | 'cold_email';
}

const PIPELINE_STAGES = [
  { key: 'new', label: 'New', color: 'bg-muted' },
  { key: 'contacted', label: 'Contacted', color: 'bg-blue-500' },
  { key: 'interested', label: 'Interested', color: 'bg-yellow-500' },
  { key: 'meeting_booked', label: 'Meeting Booked', color: 'bg-purple-500' },
  { key: 'meeting_completed', label: 'Meeting Done', color: 'bg-indigo-500' },
  { key: 'proposal', label: 'Proposal', color: 'bg-orange-500' },
  { key: 'closed_won', label: 'Closed Won', color: 'bg-green-500' },
  { key: 'closed_lost', label: 'Closed Lost', color: 'bg-red-500' },
];

export const LeadPipeline = ({ leads, teamMembers, onUpdate, sourceType = 'linkedin' }: LeadPipelineProps) => {
  const getLeadsByStage = (stage: string) => leads.filter((lead) => lead.status === stage);

  const getStageTotalValue = (stage: string) => {
    return getLeadsByStage(stage).reduce((sum, lead) => sum + (lead.deal_value || 0), 0);
  };

  const getAssigneeName = (assignedTo: string | null) => {
    if (!assignedTo) return null;
    const member = teamMembers.find((m) => m.user_id === assignedTo);
    return member?.profile?.full_name || member?.profile?.email?.split('@')[0] || null;
  };

  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    e.dataTransfer.setData("leadId", leadId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData("leadId");
    const lead = leads.find((l) => l.id === leadId);
    if (lead && lead.status !== newStatus) {
      onUpdate({ ...lead, status: newStatus as CRMLead['status'] });
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getPlatformBadge = (platform: string | null | undefined) => {
    if (platform === 'emailbison') {
      return <Badge variant="secondary" className="text-[10px] px-1.5 py-0">EB</Badge>;
    }
    if (platform === 'instantly') {
      return <Badge variant="secondary" className="text-[10px] px-1.5 py-0">IN</Badge>;
    }
    return null;
  };

  const isColdEmail = sourceType === 'cold_email';

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {PIPELINE_STAGES.map((stage) => {
        const stageLeads = getLeadsByStage(stage.key);
        const totalValue = getStageTotalValue(stage.key);

        return (
          <div
            key={stage.key}
            className="flex-shrink-0 w-[280px]"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, stage.key)}
          >
            <div className="bg-muted/30 rounded-lg p-3">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${stage.color}`} />
                  <h3 className="font-medium text-sm">{stage.label}</h3>
                  <Badge variant="secondary" className="text-xs">
                    {stageLeads.length}
                  </Badge>
                </div>
              </div>
              
              {totalValue > 0 && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
                  <DollarSign className="h-3 w-3" />
                  {formatCurrency(totalValue)}
                </div>
              )}

              <div className="space-y-2 min-h-[200px]">
                {stageLeads.map((lead) => (
                  <Card
                    key={lead.id}
                    className="cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
                    draggable
                    onDragStart={(e) => handleDragStart(e, lead.id)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h4 className="font-medium text-sm line-clamp-1">{lead.lead_name}</h4>
                        {lead.deal_value && (
                          <Badge variant="outline" className="text-xs shrink-0">
                            {formatCurrency(lead.deal_value)}
                          </Badge>
                        )}
                      </div>

                      {/* Email for cold email leads */}
                      {isColdEmail && lead.lead_email && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                          <Mail className="h-3 w-3" />
                          <span className="line-clamp-1">{lead.lead_email}</span>
                        </div>
                      )}

                      {lead.company && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                          <Building2 className="h-3 w-3" />
                          <span className="line-clamp-1">{lead.company}</span>
                        </div>
                      )}

                      {/* Campaign name for cold email leads */}
                      {isColdEmail && (lead as any).campaign_name && (
                        <div className="text-xs text-muted-foreground mb-2 truncate">
                          {(lead as any).campaign_name}
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <div className="flex gap-1">
                          {/* LinkedIn badges */}
                          {!isColdEmail && (
                            <>
                              {lead.connection_sent && (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                  Sent
                                </Badge>
                              )}
                              {lead.connection_accepted && (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                  Acc
                                </Badge>
                              )}
                            </>
                          )}
                          
                          {/* Cold email badges */}
                          {isColdEmail && (
                            <>
                              {getPlatformBadge((lead as any).platform)}
                              {(lead as any).reply_count > 1 && (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 gap-0.5">
                                  <MessageSquare className="h-2.5 w-2.5" />
                                  {(lead as any).reply_count}
                                </Badge>
                              )}
                            </>
                          )}

                          {lead.interested && (
                            <Badge className="text-[10px] px-1.5 py-0 bg-yellow-500/20 text-yellow-700 dark:text-yellow-300">
                              Int
                            </Badge>
                          )}
                          {lead.meeting_booked && (
                            <Badge className="text-[10px] px-1.5 py-0 bg-purple-500/20 text-purple-700 dark:text-purple-300">
                              Meet
                            </Badge>
                          )}
                        </div>

                        {lead.assigned_to && (
                          <Avatar className="h-5 w-5">
                            <AvatarFallback className="text-[10px]">
                              {getAssigneeName(lead.assigned_to)?.charAt(0).toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {stageLeads.length === 0 && (
                  <div className="flex items-center justify-center h-[100px] text-xs text-muted-foreground border-2 border-dashed rounded-lg">
                    Drop leads here
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};