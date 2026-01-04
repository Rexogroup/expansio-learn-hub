import { Button } from "@/components/ui/button";
import { Calendar, ChevronDown, GitCompare } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format, subDays, subMonths, subYears } from "date-fns";

export type ComparisonType = 'previous' | 'last_month' | 'last_year' | 'custom';

export interface DateRange {
  from: Date;
  to: Date;
}

interface ComparisonPeriodPickerProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  comparisonType: ComparisonType;
  onTypeChange: (type: ComparisonType) => void;
  customRange: DateRange | null;
  onCustomRangeChange: (range: DateRange) => void;
  currentDateRange: DateRange;
  periodDays: number;
}

export function ComparisonPeriodPicker({
  enabled,
  onToggle,
  comparisonType,
  onTypeChange,
  customRange,
  onCustomRangeChange,
  currentDateRange,
  periodDays,
}: ComparisonPeriodPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tempRange, setTempRange] = useState<{ from?: Date; to?: Date }>({});

  // Calculate preset date ranges
  const getPresetRange = (type: ComparisonType): DateRange => {
    switch (type) {
      case 'previous':
        const previousEnd = subDays(currentDateRange.from, 1);
        const previousStart = subDays(previousEnd, periodDays - 1);
        return { from: previousStart, to: previousEnd };
      case 'last_month':
        return { 
          from: subMonths(currentDateRange.from, 1), 
          to: subMonths(currentDateRange.to, 1) 
        };
      case 'last_year':
        return { 
          from: subYears(currentDateRange.from, 1), 
          to: subYears(currentDateRange.to, 1) 
        };
      case 'custom':
        return customRange || { from: subDays(new Date(), 60), to: subDays(new Date(), 31) };
      default:
        return { from: subDays(currentDateRange.from, periodDays), to: subDays(currentDateRange.from, 1) };
    }
  };

  const presets: { id: ComparisonType; label: string }[] = [
    { id: 'previous', label: 'Previous Period' },
    { id: 'last_month', label: 'Same Period Last Month' },
    { id: 'last_year', label: 'Same Period Last Year' },
  ];

  const handlePresetClick = (type: ComparisonType) => {
    onTypeChange(type);
    if (!enabled) {
      onToggle(true);
    }
  };

  const handleCustomRangeSelect = () => {
    if (tempRange.from && tempRange.to) {
      onCustomRangeChange({ from: tempRange.from, to: tempRange.to });
      onTypeChange('custom');
      if (!enabled) {
        onToggle(true);
      }
      setIsOpen(false);
    }
  };

  const getCurrentComparisonRange = (): DateRange => {
    if (comparisonType === 'custom' && customRange) {
      return customRange;
    }
    return getPresetRange(comparisonType);
  };

  const getDisplayLabel = (): string => {
    if (!enabled) return 'Compare';
    
    const range = getCurrentComparisonRange();
    return `vs ${format(range.from, 'MMM d')} - ${format(range.to, 'MMM d')}`;
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "gap-2 border border-white/20 text-white hover:bg-white/20 hover:text-white",
            enabled ? "bg-white/20" : "bg-transparent"
          )}
        >
          <GitCompare className="h-4 w-4" />
          {getDisplayLabel()}
          <ChevronDown className="h-3 w-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-3 border-b">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Compare With</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onToggle(!enabled);
                setIsOpen(false);
              }}
              className="h-7 text-xs"
            >
              {enabled ? 'Disable' : 'Enable'}
            </Button>
          </div>
          {enabled && (
            <p className="text-xs text-muted-foreground mt-1">
              Comparing to: {format(getCurrentComparisonRange().from, 'MMM d')} - {format(getCurrentComparisonRange().to, 'MMM d, yyyy')}
            </p>
          )}
        </div>
        
        <div className="p-2 space-y-1">
          {presets.map((preset) => {
            const range = getPresetRange(preset.id);
            return (
              <button
                key={preset.id}
                onClick={() => {
                  handlePresetClick(preset.id);
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors",
                  enabled && comparisonType === preset.id
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                )}
              >
                <span>{preset.label}</span>
                <span className="text-xs opacity-70">
                  {format(range.from, 'MMM d')} - {format(range.to, 'MMM d')}
                </span>
              </button>
            );
          })}
          
          <div className="pt-2 border-t mt-2">
            <button
              onClick={() => {
                setTempRange(customRange || {});
              }}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
                enabled && comparisonType === 'custom'
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              )}
            >
              <Calendar className="h-4 w-4" />
              <span>Custom Range</span>
              {enabled && comparisonType === 'custom' && customRange && (
                <span className="text-xs opacity-70 ml-auto">
                  {format(customRange.from, 'MMM d')} - {format(customRange.to, 'MMM d')}
                </span>
              )}
            </button>
          </div>
        </div>
        
        {/* Calendar for custom range */}
        <div className="border-t">
          <div className="p-3 border-b bg-muted/50">
            <p className="text-xs font-medium">Custom Date Range</p>
            <p className="text-xs text-muted-foreground mt-1">
              {tempRange.from ? (
                tempRange.to ? (
                  `${format(tempRange.from, 'MMM d, yyyy')} - ${format(tempRange.to, 'MMM d, yyyy')}`
                ) : (
                  `${format(tempRange.from, 'MMM d, yyyy')} - Select end date`
                )
              ) : (
                'Select start date'
              )}
            </p>
          </div>
          <CalendarComponent
            mode="range"
            selected={{ from: tempRange.from, to: tempRange.to }}
            onSelect={(range) => {
              setTempRange({ from: range?.from, to: range?.to });
            }}
            numberOfMonths={2}
            disabled={(date) => date > new Date()}
            className="pointer-events-auto"
          />
          <div className="p-3 border-t flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setTempRange({});
              }}
            >
              Clear
            </Button>
            <Button
              size="sm"
              onClick={handleCustomRangeSelect}
              disabled={!tempRange.from || !tempRange.to}
            >
              Apply Custom Range
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
