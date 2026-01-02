import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CRMOverview } from "@/pages/SalesCoach";
import { ClipboardCopy, Users, Megaphone, BarChart3, DollarSign } from "lucide-react";
import { toast } from "sonner";

interface CRMOverviewCardProps {
  data: CRMOverview;
}

export const CRMOverviewCard = ({ data }: CRMOverviewCardProps) => {
  const handleCopyAll = () => {
    const text = `
Point of Contact:
${data.point_of_contact?.map(p => `- ${p.name} (${p.role})${p.email ? ` - ${p.email}` : ''}${p.phone ? ` - ${p.phone}` : ''}`).join('\n') || 'Not mentioned'}

Marketing Channels: ${data.marketing_channels?.join(', ') || 'Not mentioned'}

KPIs:
- Monthly Ad Spend: ${data.kpis?.monthly_ad_spend?.current || 'N/A'} → ${data.kpis?.monthly_ad_spend?.target || 'N/A'}
- ROI: ${data.kpis?.roi?.current || 'N/A'} → ${data.kpis?.roi?.target || 'N/A'}
- ROAS: ${data.kpis?.roas?.current || 'N/A'} → ${data.kpis?.roas?.target || 'N/A'}
- CPA: ${data.kpis?.cpa?.current || 'N/A'} → ${data.kpis?.cpa?.target || 'N/A'}
- CAC: ${data.kpis?.cac?.current || 'N/A'} → ${data.kpis?.cac?.target || 'N/A'}

Offer Made: ${data.offer_made?.pricing || 'N/A'} - ${data.offer_made?.model || 'N/A'}
${data.offer_made?.details || ''}
    `.trim();
    
    navigator.clipboard.writeText(text);
    toast.success("CRM data copied to clipboard");
  };

  const kpiRows = [
    { label: "Monthly Ad Spend", data: data.kpis?.monthly_ad_spend },
    { label: "ROI", data: data.kpis?.roi },
    { label: "ROAS", data: data.kpis?.roas },
    { label: "CPA", data: data.kpis?.cpa },
    { label: "CAC", data: data.kpis?.cac },
  ].filter(row => row.data?.current || row.data?.target);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ClipboardCopy className="h-5 w-5" />
            CRM Quick Overview
          </CardTitle>
          <Button variant="outline" size="sm" onClick={handleCopyAll}>
            <ClipboardCopy className="mr-2 h-4 w-4" />
            Copy All
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Point of Contact */}
        <div>
          <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            Point of Contact
          </h4>
          {data.point_of_contact && data.point_of_contact.length > 0 ? (
            <div className="space-y-1">
              {data.point_of_contact.map((contact, idx) => (
                <div key={idx} className="text-sm flex items-center gap-2">
                  <span className="font-medium">{contact.name}</span>
                  <Badge variant="secondary" className="text-xs">{contact.role}</Badge>
                  {contact.email && <span className="text-muted-foreground">• {contact.email}</span>}
                  {contact.phone && <span className="text-muted-foreground">• {contact.phone}</span>}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Not mentioned in transcript</p>
          )}
        </div>

        {/* Marketing Channels */}
        <div>
          <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
            <Megaphone className="h-4 w-4 text-muted-foreground" />
            Marketing Channels
          </h4>
          {data.marketing_channels && data.marketing_channels.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {data.marketing_channels.map((channel, idx) => (
                <Badge key={idx} variant="outline">{channel}</Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Not mentioned in transcript</p>
          )}
        </div>

        {/* KPIs */}
        {kpiRows.length > 0 && (
          <div>
            <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              KPIs Mentioned
            </h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Metric</TableHead>
                  <TableHead>Current</TableHead>
                  <TableHead>Target</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {kpiRows.map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{row.label}</TableCell>
                    <TableCell>{row.data?.current || '-'}</TableCell>
                    <TableCell>{row.data?.target || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Offer Made */}
        {(data.offer_made?.pricing || data.offer_made?.model) && (
          <div>
            <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              Offer Made
            </h4>
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="font-medium">{data.offer_made.pricing}</p>
              {data.offer_made.model && (
                <p className="text-sm text-muted-foreground">{data.offer_made.model}</p>
              )}
              {data.offer_made.details && (
                <p className="text-sm mt-1">{data.offer_made.details}</p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
