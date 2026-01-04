// CSV parsing and normalization utilities

export interface ParsedCSV {
  headers: string[];
  rows: Record<string, string>[];
  rawRows: string[][];
}

export const parseCSV = (content: string): ParsedCSV => {
  const lines = content.split(/\r?\n/).filter(line => line.trim());
  if (lines.length === 0) {
    return { headers: [], rows: [], rawRows: [] };
  }

  // Parse CSV considering quoted values
  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseLine(lines[0]);
  const rawRows = lines.slice(1).map(parseLine);
  const rows = rawRows.map(row => {
    const obj: Record<string, string> = {};
    headers.forEach((header, i) => {
      obj[header] = row[i] || '';
    });
    return obj;
  });

  return { headers, rows, rawRows };
};

// Email normalization for deduplication
export const normalizeEmail = (email: string | null | undefined): string | null => {
  if (!email) return null;
  return email.toLowerCase().trim();
};

// LinkedIn URL normalization for deduplication
export const normalizeLinkedIn = (url: string | null | undefined): string | null => {
  if (!url) return null;
  const match = url.match(/linkedin\.com\/in\/([^/?#]+)/i);
  return match ? `linkedin.com/in/${match[1].toLowerCase()}` : null;
};

// Date format detection and parsing
const DATE_FORMATS = [
  // ISO formats
  { regex: /^\d{4}-\d{2}-\d{2}T/, parse: (s: string) => new Date(s) },
  { regex: /^\d{4}-\d{2}-\d{2}$/, parse: (s: string) => new Date(s + 'T00:00:00') },
  // US format MM/DD/YYYY
  { regex: /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, parse: (s: string) => {
    const [, m, d, y] = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)!;
    return new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
  }},
  // EU format DD/MM/YYYY
  { regex: /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/, parse: (s: string) => {
    const [, d, m, y] = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)!;
    return new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
  }},
  // Text format "January 15, 2024"
  { regex: /^[A-Za-z]+ \d{1,2}, \d{4}$/, parse: (s: string) => new Date(s) },
  // Unix timestamp (seconds)
  { regex: /^\d{10}$/, parse: (s: string) => new Date(parseInt(s) * 1000) },
  // Unix timestamp (milliseconds)
  { regex: /^\d{13}$/, parse: (s: string) => new Date(parseInt(s)) },
];

export const parseDate = (value: string | null | undefined): Date | null => {
  if (!value || value.trim() === '') return null;
  
  const trimmed = value.trim();
  
  for (const format of DATE_FORMATS) {
    if (format.regex.test(trimmed)) {
      try {
        const date = format.parse(trimmed);
        if (!isNaN(date.getTime())) {
          return date;
        }
      } catch {
        continue;
      }
    }
  }
  
  // Fallback: try native Date parsing
  try {
    const date = new Date(trimmed);
    if (!isNaN(date.getTime())) {
      return date;
    }
  } catch {
    // ignore
  }
  
  return null;
};

export const formatDatePreview = (date: Date | null): string => {
  if (!date) return '—';
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
};

// Parse currency values
export const parseCurrency = (value: string | null | undefined): number | null => {
  if (!value) return null;
  // Remove currency symbols, commas, spaces
  const cleaned = value.replace(/[$€£,\s]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
};

// Platform field definitions for mapping
export interface PlatformField {
  key: string;
  label: string;
  required: boolean;
  dedupe?: boolean;
  type?: 'date' | 'currency';
}

export const PLATFORM_FIELDS: PlatformField[] = [
  { key: 'lead_name', label: 'Lead Name', required: false },
  { key: 'lead_email', label: 'Email', required: false, dedupe: true },
  { key: 'linkedin_url', label: 'LinkedIn URL', required: false, dedupe: true },
  { key: 'company', label: 'Company', required: false },
  { key: 'job_title', label: 'Job Title', required: false },
  { key: 'status', label: 'Status', required: false },
  { key: 'deal_value', label: 'Deal Value', required: false, type: 'currency' },
  { key: 'notes', label: 'Notes', required: false },
  { key: 'created_at', label: 'Created Date', required: false, type: 'date' },
  { key: 'closed_at', label: 'Close Date', required: false, type: 'date' },
  { key: 'meeting_datetime', label: 'Meeting Date', required: false, type: 'date' },
  { key: 'first_reach_date', label: 'First Contact Date', required: false, type: 'date' },
];

export type PlatformFieldKey = string;

// Status mapping
export const PLATFORM_STATUSES = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'replied', label: 'Replied' },
  { value: 'interested', label: 'Interested' },
  { value: 'not_interested', label: 'Not Interested' },
  { value: 'meeting_booked', label: 'Meeting Booked' },
  { value: 'meeting_completed', label: 'Meeting Completed' },
  { value: 'proposal', label: 'Proposal' },
  { value: 'closed_won', label: 'Closed Won' },
  { value: 'closed_lost', label: 'Closed Lost' },
];
