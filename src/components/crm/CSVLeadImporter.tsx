import { useState, useCallback, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileSpreadsheet, ArrowRight, ArrowLeft, CheckCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { FieldMapper } from "./FieldMapper";
import { ImportPreview } from "./ImportPreview";
import { 
  parseCSV, 
  normalizeEmail, 
  normalizeLinkedIn, 
  parseDate, 
  parseCurrency,
  PLATFORM_FIELDS,
  PLATFORM_STATUSES,
  PlatformFieldKey,
  ParsedCSV
} from "@/lib/csv-utils";

interface CSVLeadImporterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string;
  onImportComplete: () => void;
}

type Step = 'upload' | 'mapping' | 'options' | 'preview' | 'importing' | 'complete';

interface ImportStats {
  totalRows: number;
  willImport: number;
  duplicatesByEmail: number;
  duplicatesByLinkedIn: number;
  skippedNoIdentifier: number;
  dateRange: {
    created: { min: Date | null; max: Date | null };
    closed: { min: Date | null; max: Date | null };
  };
  revenueByQuarter: Record<string, { amount: number; count: number }>;
}

export function CSVLeadImporter({ open, onOpenChange, teamId, onImportComplete }: CSVLeadImporterProps) {
  const [step, setStep] = useState<Step>('upload');
  const [parsedCSV, setParsedCSV] = useState<ParsedCSV | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [mapping, setMapping] = useState<Record<string, PlatformFieldKey | ''>>({});
  const [sourceType, setSourceType] = useState<'cold_email' | 'linkedin'>('cold_email');
  const [statusMapping, setStatusMapping] = useState<Record<string, string>>({});
  const [importProgress, setImportProgress] = useState(0);
  const [importedCount, setImportedCount] = useState(0);
  const [existingLeads, setExistingLeads] = useState<{ email: string | null; linkedin: string | null }[]>([]);

  const resetState = () => {
    setStep('upload');
    setParsedCSV(null);
    setFileName('');
    setMapping({});
    setSourceType('cold_email');
    setStatusMapping({});
    setImportProgress(0);
    setImportedCount(0);
  };

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }

    try {
      const content = await file.text();
      const parsed = parseCSV(content);
      
      if (parsed.headers.length === 0) {
        toast.error('CSV file is empty or invalid');
        return;
      }

      setParsedCSV(parsed);
      setFileName(file.name);
      
      // Auto-map common field names
      const autoMapping: Record<string, PlatformFieldKey | ''> = {};
      parsed.headers.forEach(header => {
        const lower = header.toLowerCase();
        if (lower.includes('email')) autoMapping[header] = 'lead_email';
        else if (lower.includes('linkedin')) autoMapping[header] = 'linkedin_url';
        else if (lower.includes('company')) autoMapping[header] = 'company';
        else if (lower.includes('name') && !lower.includes('company')) autoMapping[header] = 'lead_name';
        else if (lower.includes('title') || lower.includes('position')) autoMapping[header] = 'job_title';
        else if (lower.includes('value') || lower.includes('amount') || lower.includes('revenue')) autoMapping[header] = 'deal_value';
        else if (lower.includes('status') || lower.includes('stage')) autoMapping[header] = 'status';
        else if (lower.includes('note')) autoMapping[header] = 'notes';
        else if (lower.includes('created') || lower.includes('added')) autoMapping[header] = 'created_at';
        else if (lower.includes('close') || lower.includes('won') || lower.includes('closed')) autoMapping[header] = 'closed_at';
        else if (lower.includes('meeting')) autoMapping[header] = 'meeting_datetime';
      });
      setMapping(autoMapping);
      
      // Fetch existing leads for deduplication
      const { data: leads } = await supabase
        .from('crm_leads')
        .select('lead_email, linkedin_url')
        .eq('team_id', teamId);
      
      setExistingLeads(leads?.map(l => ({
        email: normalizeEmail(l.lead_email),
        linkedin: normalizeLinkedIn(l.linkedin_url)
      })) || []);
      
      setStep('mapping');
    } catch (err) {
      console.error('Error parsing CSV:', err);
      toast.error('Failed to parse CSV file');
    }
  }, [teamId]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      const input = document.createElement('input');
      input.type = 'file';
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      input.files = dataTransfer.files;
      handleFileUpload({ target: input } as any);
    }
  }, [handleFileUpload]);

  // Calculate import stats
  const importStats = useMemo<ImportStats>(() => {
    if (!parsedCSV) return {
      totalRows: 0,
      willImport: 0,
      duplicatesByEmail: 0,
      duplicatesByLinkedIn: 0,
      skippedNoIdentifier: 0,
      dateRange: { created: { min: null, max: null }, closed: { min: null, max: null } },
      revenueByQuarter: {}
    };

    const existingEmails = new Set(existingLeads.map(l => l.email).filter(Boolean));
    const existingLinkedIns = new Set(existingLeads.map(l => l.linkedin).filter(Boolean));
    
    let duplicatesByEmail = 0;
    let duplicatesByLinkedIn = 0;
    let skippedNoIdentifier = 0;
    let willImport = 0;
    
    const createdDates: Date[] = [];
    const closedDates: Date[] = [];
    const revenueByQuarter: Record<string, { amount: number; count: number }> = {};
    
    const emailField = Object.entries(mapping).find(([, v]) => v === 'lead_email')?.[0];
    const linkedinField = Object.entries(mapping).find(([, v]) => v === 'linkedin_url')?.[0];
    const createdField = Object.entries(mapping).find(([, v]) => v === 'created_at')?.[0];
    const closedField = Object.entries(mapping).find(([, v]) => v === 'closed_at')?.[0];
    const dealValueField = Object.entries(mapping).find(([, v]) => v === 'deal_value')?.[0];
    const statusField = Object.entries(mapping).find(([, v]) => v === 'status')?.[0];
    
    const seenInBatch = new Set<string>();
    
    parsedCSV.rows.forEach(row => {
      const email = emailField ? normalizeEmail(row[emailField]) : null;
      const linkedin = linkedinField ? normalizeLinkedIn(row[linkedinField]) : null;
      
      if (!email && !linkedin) {
        skippedNoIdentifier++;
        return;
      }
      
      // Check duplicates
      const emailKey = email ? `email:${email}` : null;
      const linkedinKey = linkedin ? `linkedin:${linkedin}` : null;
      
      if (emailKey && (existingEmails.has(email!) || seenInBatch.has(emailKey))) {
        duplicatesByEmail++;
        return;
      }
      
      if (linkedinKey && (existingLinkedIns.has(linkedin!) || seenInBatch.has(linkedinKey))) {
        duplicatesByLinkedIn++;
        return;
      }
      
      // Mark as seen
      if (emailKey) seenInBatch.add(emailKey);
      if (linkedinKey) seenInBatch.add(linkedinKey);
      
      willImport++;
      
      // Collect dates
      if (createdField) {
        const date = parseDate(row[createdField]);
        if (date) createdDates.push(date);
      }
      
      if (closedField) {
        const date = parseDate(row[closedField]);
        if (date) closedDates.push(date);
      }
      
      // Collect revenue by quarter
      const rawStatus = statusField ? row[statusField] : '';
      const mappedStatus = statusMapping[rawStatus] || rawStatus;
      
      if (closedField && dealValueField && (mappedStatus === 'closed_won' || rawStatus.toLowerCase().includes('won'))) {
        const closeDate = parseDate(row[closedField]);
        const dealValue = parseCurrency(row[dealValueField]);
        
        if (closeDate && dealValue) {
          const quarter = `Q${Math.floor(closeDate.getMonth() / 3) + 1} ${closeDate.getFullYear()}`;
          if (!revenueByQuarter[quarter]) {
            revenueByQuarter[quarter] = { amount: 0, count: 0 };
          }
          revenueByQuarter[quarter].amount += dealValue;
          revenueByQuarter[quarter].count++;
        }
      }
    });
    
    return {
      totalRows: parsedCSV.rows.length,
      willImport,
      duplicatesByEmail,
      duplicatesByLinkedIn,
      skippedNoIdentifier,
      dateRange: {
        created: {
          min: createdDates.length ? new Date(Math.min(...createdDates.map(d => d.getTime()))) : null,
          max: createdDates.length ? new Date(Math.max(...createdDates.map(d => d.getTime()))) : null,
        },
        closed: {
          min: closedDates.length ? new Date(Math.min(...closedDates.map(d => d.getTime()))) : null,
          max: closedDates.length ? new Date(Math.max(...closedDates.map(d => d.getTime()))) : null,
        }
      },
      revenueByQuarter
    };
  }, [parsedCSV, mapping, existingLeads, statusMapping]);

  // Get unique status values from CSV
  const csvStatusValues = useMemo(() => {
    if (!parsedCSV) return [];
    const statusField = Object.entries(mapping).find(([, v]) => v === 'status')?.[0];
    if (!statusField) return [];
    
    const values = new Set<string>();
    parsedCSV.rows.forEach(row => {
      if (row[statusField]) values.add(row[statusField]);
    });
    return Array.from(values).sort();
  }, [parsedCSV, mapping]);

  const handleImport = async () => {
    if (!parsedCSV) return;
    
    setStep('importing');
    setImportProgress(0);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const batchId = crypto.randomUUID();
      
      // Create import session
      await supabase.from('crm_import_sessions').insert({
        user_id: user.id,
        team_id: teamId,
        filename: fileName,
        total_rows: parsedCSV.rows.length,
        field_mapping: mapping
      });
      
      const existingEmails = new Set(existingLeads.map(l => l.email).filter(Boolean));
      const existingLinkedIns = new Set(existingLeads.map(l => l.linkedin).filter(Boolean));
      const seenInBatch = new Set<string>();
      
      const emailField = Object.entries(mapping).find(([, v]) => v === 'lead_email')?.[0];
      const linkedinField = Object.entries(mapping).find(([, v]) => v === 'linkedin_url')?.[0];
      
      const leadsToImport: any[] = [];
      
      parsedCSV.rows.forEach(row => {
        const email = emailField ? normalizeEmail(row[emailField]) : null;
        const linkedin = linkedinField ? normalizeLinkedIn(row[linkedinField]) : null;
        
        if (!email && !linkedin) return;
        
        const emailKey = email ? `email:${email}` : null;
        const linkedinKey = linkedin ? `linkedin:${linkedin}` : null;
        
        if (emailKey && (existingEmails.has(email!) || seenInBatch.has(emailKey))) return;
        if (linkedinKey && (existingLinkedIns.has(linkedin!) || seenInBatch.has(linkedinKey))) return;
        
        if (emailKey) seenInBatch.add(emailKey);
        if (linkedinKey) seenInBatch.add(linkedinKey);
        
        // Build lead object
        const lead: any = {
          team_id: teamId,
          source_type: sourceType,
          imported_from: 'csv_import',
          import_batch_id: batchId,
        };
        
        Object.entries(mapping).forEach(([csvHeader, platformField]) => {
          if (!platformField || !row[csvHeader]) return;
          
          const field = PLATFORM_FIELDS.find(f => f.key === platformField);
          const value = row[csvHeader];
          
          if (field?.type === 'date') {
            const date = parseDate(value);
            if (date) lead[platformField] = date.toISOString();
          } else if (field?.type === 'currency') {
            const num = parseCurrency(value);
            if (num !== null) lead[platformField] = num;
          } else if (platformField === 'status') {
            lead[platformField] = statusMapping[value] || value;
          } else if (platformField === 'linkedin_url') {
            // Store original URL but normalized
            lead[platformField] = row[csvHeader];
          } else {
            lead[platformField] = value;
          }
        });
        
        leadsToImport.push(lead);
      });
      
      // Batch insert
      const batchSize = 100;
      let imported = 0;
      
      for (let i = 0; i < leadsToImport.length; i += batchSize) {
        const batch = leadsToImport.slice(i, i + batchSize);
        const { error } = await supabase.from('crm_leads').insert(batch);
        
        if (error) {
          console.error('Batch insert error:', error);
          throw error;
        }
        
        imported += batch.length;
        setImportProgress((imported / leadsToImport.length) * 100);
        setImportedCount(imported);
      }
      
      // Update session with final counts
      await supabase.from('crm_import_sessions').update({
        imported_count: imported,
        skipped_duplicates: importStats.duplicatesByEmail + importStats.duplicatesByLinkedIn,
        skipped_errors: importStats.skippedNoIdentifier
      }).eq('filename', fileName).eq('team_id', teamId);
      
      setStep('complete');
      toast.success(`Successfully imported ${imported} leads`);
    } catch (err) {
      console.error('Import error:', err);
      toast.error('Failed to import leads');
      setStep('preview');
    }
  };

  const canProceedFromMapping = useMemo(() => {
    const hasEmail = Object.values(mapping).includes('lead_email');
    const hasLinkedIn = Object.values(mapping).includes('linkedin_url');
    return hasEmail || hasLinkedIn;
  }, [mapping]);

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) resetState(); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Import Leads from CSV
          </DialogTitle>
          <DialogDescription>
            {step === 'upload' && 'Upload a CSV file exported from your CRM'}
            {step === 'mapping' && 'Map your CSV columns to platform fields'}
            {step === 'options' && 'Configure import options'}
            {step === 'preview' && 'Review before importing'}
            {step === 'importing' && 'Importing leads...'}
            {step === 'complete' && 'Import complete!'}
          </DialogDescription>
        </DialogHeader>

        {/* Step: Upload */}
        {step === 'upload' && (
          <Card
            className="border-dashed border-2 cursor-pointer hover:border-primary transition-colors"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => document.getElementById('csv-upload')?.click()}
          >
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Upload className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">Drop your CSV file here</p>
              <p className="text-sm text-muted-foreground mt-1">or click to browse</p>
              <input
                id="csv-upload"
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileUpload}
              />
            </CardContent>
          </Card>
        )}

        {/* Step: Field Mapping */}
        {step === 'mapping' && parsedCSV && (
          <div className="space-y-4">
            <FieldMapper
              csvHeaders={parsedCSV.headers}
              sampleRow={parsedCSV.rows[0] || {}}
              mapping={mapping}
              onMappingChange={(header, field) => setMapping(prev => ({ ...prev, [header]: field }))}
            />
            
            {!canProceedFromMapping && (
              <p className="text-sm text-amber-500">
                ⚠️ Map at least Email or LinkedIn URL for duplicate detection
              </p>
            )}
            
            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep('upload')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button onClick={() => setStep('options')} disabled={!canProceedFromMapping}>
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step: Options */}
        {step === 'options' && (
          <div className="space-y-6">
            {/* Source Type */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Lead Type</Label>
              <RadioGroup value={sourceType} onValueChange={(v) => setSourceType(v as any)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="cold_email" id="cold_email" />
                  <Label htmlFor="cold_email">Cold Email Leads</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="linkedin" id="linkedin" />
                  <Label htmlFor="linkedin">LinkedIn / SDR Leads</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Status Mapping */}
            {csvStatusValues.length > 0 && (
              <div className="space-y-3">
                <Label className="text-base font-medium">Status Mapping</Label>
                <p className="text-sm text-muted-foreground">Map your CRM status values to platform statuses</p>
                <div className="space-y-2">
                  {csvStatusValues.map(status => (
                    <div key={status} className="grid grid-cols-[1fr,auto,1fr] gap-3 items-center">
                      <span className="text-sm truncate">{status}</span>
                      <span className="text-muted-foreground">→</span>
                      <Select
                        value={statusMapping[status] || ''}
                        onValueChange={(v) => setStatusMapping(prev => ({ ...prev, [status]: v }))}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Keep original" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Keep original</SelectItem>
                          {PLATFORM_STATUSES.map(s => (
                            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep('mapping')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button onClick={() => setStep('preview')}>
                Preview Import
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step: Preview */}
        {step === 'preview' && (
          <div className="space-y-4">
            <ImportPreview stats={importStats} />
            
            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep('options')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button onClick={handleImport} disabled={importStats.willImport === 0}>
                Import {importStats.willImport} Leads
              </Button>
            </div>
          </div>
        )}

        {/* Step: Importing */}
        {step === 'importing' && (
          <div className="space-y-4 py-8">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-lg font-medium">Importing leads...</p>
              <Progress value={importProgress} className="w-full" />
              <p className="text-sm text-muted-foreground">
                {importedCount} of {importStats.willImport} leads imported
              </p>
            </div>
          </div>
        )}

        {/* Step: Complete */}
        {step === 'complete' && (
          <div className="space-y-4 py-8">
            <div className="flex flex-col items-center gap-4">
              <CheckCircle className="h-12 w-12 text-green-500" />
              <p className="text-lg font-medium">Import Complete!</p>
              <p className="text-muted-foreground">
                Successfully imported {importedCount} leads
              </p>
              <Button onClick={() => { onOpenChange(false); onImportComplete(); resetState(); }}>
                Done
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
