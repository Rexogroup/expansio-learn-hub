import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { PLATFORM_FIELDS, PlatformFieldKey, parseDate, formatDatePreview, parseCurrency } from "@/lib/csv-utils";
import { Calendar, Mail, Link2, Building, Briefcase, DollarSign, FileText } from "lucide-react";

interface FieldMapperProps {
  csvHeaders: string[];
  sampleRow: Record<string, string>;
  mapping: Record<string, PlatformFieldKey | ''>;
  onMappingChange: (csvHeader: string, platformField: PlatformFieldKey | '') => void;
}

const getFieldIcon = (key: string) => {
  switch (key) {
    case 'lead_email': return <Mail className="h-4 w-4" />;
    case 'linkedin_url': return <Link2 className="h-4 w-4" />;
    case 'company': return <Building className="h-4 w-4" />;
    case 'job_title': return <Briefcase className="h-4 w-4" />;
    case 'deal_value': return <DollarSign className="h-4 w-4" />;
    case 'notes': return <FileText className="h-4 w-4" />;
    case 'created_at':
    case 'closed_at':
    case 'meeting_datetime':
    case 'first_reach_date':
      return <Calendar className="h-4 w-4" />;
    default: return null;
  }
};

const getPreviewValue = (value: string, fieldKey: PlatformFieldKey | '') => {
  if (!value || !fieldKey) return value || '—';
  
  const field = PLATFORM_FIELDS.find(f => f.key === fieldKey);
  if (field?.type === 'date') {
    const parsed = parseDate(value);
    return parsed ? formatDatePreview(parsed) : value;
  }
  if (field?.type === 'currency') {
    const parsed = parseCurrency(value);
    return parsed !== null ? `$${parsed.toLocaleString()}` : value;
  }
  return value;
};

export function FieldMapper({ csvHeaders, sampleRow, mapping, onMappingChange }: FieldMapperProps) {
  const usedFields = new Set(Object.values(mapping).filter(Boolean));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[1fr,auto,1fr,1fr] gap-3 text-sm font-medium text-muted-foreground px-2">
        <span>CSV Column</span>
        <span></span>
        <span>Map To</span>
        <span>Preview</span>
      </div>
      
      <div className="space-y-2">
        {csvHeaders.map((header) => {
          const currentMapping = mapping[header] || '';
          const sampleValue = sampleRow[header] || '';
          
          return (
            <div 
              key={header} 
              className="grid grid-cols-[1fr,auto,1fr,1fr] gap-3 items-center p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <div className="font-medium truncate" title={header}>
                {header}
              </div>
              
              <span className="text-muted-foreground">→</span>
              
              <Select
                value={currentMapping}
                onValueChange={(value) => onMappingChange(header, value as PlatformFieldKey | '')}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Skip this field" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Skip this field</SelectItem>
                  {PLATFORM_FIELDS.map((field) => (
                    <SelectItem 
                      key={field.key} 
                      value={field.key}
                      disabled={usedFields.has(field.key) && mapping[header] !== field.key}
                    >
                      <div className="flex items-center gap-2">
                        {getFieldIcon(field.key)}
                        <span>{field.label}</span>
                        {field.dedupe && (
                          <Badge variant="outline" className="text-xs ml-1">Dedupe</Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <div className="text-sm text-muted-foreground truncate" title={sampleValue}>
                {getPreviewValue(sampleValue, currentMapping)}
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="flex gap-2 text-xs text-muted-foreground mt-4">
        <Badge variant="outline" className="text-xs">Dedupe</Badge>
        <span>= Used for duplicate detection</span>
      </div>
    </div>
  );
}
