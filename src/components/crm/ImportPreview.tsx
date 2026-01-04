import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, AlertCircle, Calendar, DollarSign } from "lucide-react";
import { format } from "date-fns";

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

interface ImportPreviewProps {
  stats: ImportStats;
  isLoading?: boolean;
}

export function ImportPreview({ stats, isLoading }: ImportPreviewProps) {
  const formatDateRange = (min: Date | null, max: Date | null) => {
    if (!min || !max) return 'No dates mapped';
    return `${format(min, 'MMM yyyy')} - ${format(max, 'MMM yyyy')}`;
  };

  const quarters = Object.entries(stats.revenueByQuarter).sort((a, b) => a[0].localeCompare(b[0]));

  return (
    <div className="space-y-4">
      {/* Main Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="border-green-500/30 bg-green-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold text-green-500">{stats.willImport}</p>
                <p className="text-sm text-muted-foreground">Will Import</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-muted">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <XCircle className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{stats.duplicatesByEmail + stats.duplicatesByLinkedIn}</p>
                <p className="text-sm text-muted-foreground">Duplicates Skipped</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Breakdown */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <h4 className="font-medium">Import Breakdown</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total rows in CSV</span>
              <span className="font-medium">{stats.totalRows}</span>
            </div>
            <div className="flex justify-between text-green-500">
              <span>✓ New leads to import</span>
              <span className="font-medium">{stats.willImport}</span>
            </div>
            {stats.duplicatesByEmail > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>⊘ Duplicate email</span>
                <span>{stats.duplicatesByEmail}</span>
              </div>
            )}
            {stats.duplicatesByLinkedIn > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>⊘ Duplicate LinkedIn</span>
                <span>{stats.duplicatesByLinkedIn}</span>
              </div>
            )}
            {stats.skippedNoIdentifier > 0 && (
              <div className="flex justify-between text-amber-500">
                <span className="flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  No email or LinkedIn
                </span>
                <span>{stats.skippedNoIdentifier}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Date Ranges */}
      {(stats.dateRange.created.min || stats.dateRange.closed.min) && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Date Ranges Detected
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <Badge variant="outline">
                  {formatDateRange(stats.dateRange.created.min, stats.dateRange.created.max)}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Closed</span>
                <Badge variant="outline">
                  {formatDateRange(stats.dateRange.closed.min, stats.dateRange.closed.max)}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Revenue by Quarter */}
      {quarters.length > 0 && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Revenue by Period (from imported data)
            </h4>
            <div className="space-y-2 text-sm">
              {quarters.map(([quarter, data]) => (
                <div key={quarter} className="flex justify-between">
                  <span className="text-muted-foreground">{quarter}</span>
                  <span className="font-medium">
                    ${data.amount.toLocaleString()} ({data.count} deals)
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
