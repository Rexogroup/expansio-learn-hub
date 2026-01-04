import { Button } from "@/components/ui/button";
import { Calendar, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format, startOfMonth, subDays, startOfQuarter, startOfYear } from "date-fns";

export type TimePeriod = 'this_month' | 'last_30' | 'last_quarter' | 'ytd' | 'custom';

export interface DateRange {
  from: Date;
  to: Date;
}

interface TimePeriodFilterProps {
  value: TimePeriod;
  customRange?: DateRange;
  onChange: (period: TimePeriod, range: DateRange) => void;
}

const getDateRange = (period: TimePeriod): DateRange => {
  const today = new Date();
  
  switch (period) {
    case 'this_month':
      return { from: startOfMonth(today), to: today };
    case 'last_30':
      return { from: subDays(today, 30), to: today };
    case 'last_quarter':
      return { from: startOfQuarter(today), to: today };
    case 'ytd':
      return { from: startOfYear(today), to: today };
    default:
      return { from: subDays(today, 30), to: today };
  }
};

export function TimePeriodFilter({ value, customRange, onChange }: TimePeriodFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tempRange, setTempRange] = useState<{ from?: Date; to?: Date }>({});

  const periods: { id: TimePeriod; label: string }[] = [
    { id: 'this_month', label: 'This Month' },
    { id: 'last_30', label: 'Last 30 Days' },
    { id: 'last_quarter', label: 'This Quarter' },
    { id: 'ytd', label: 'YTD' },
  ];

  const handlePeriodClick = (period: TimePeriod) => {
    const range = getDateRange(period);
    onChange(period, range);
  };

  const handleCustomRangeSelect = () => {
    if (tempRange.from && tempRange.to) {
      onChange('custom', { from: tempRange.from, to: tempRange.to });
      setIsOpen(false);
    }
  };

  const getDisplayLabel = () => {
    if (value === 'custom' && customRange) {
      return `${format(customRange.from, 'MMM d')} - ${format(customRange.to, 'MMM d, yyyy')}`;
    }
    return periods.find(p => p.id === value)?.label || 'Select Period';
  };

  return (
    <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
      {periods.map((period) => (
        <Button
          key={period.id}
          variant="ghost"
          size="sm"
          onClick={() => handlePeriodClick(period.id)}
          className={cn(
            "h-8 px-3 text-xs font-medium transition-all",
            value === period.id 
              ? "bg-background text-foreground shadow-sm" 
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {period.label}
        </Button>
      ))}
      
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 px-3 text-xs font-medium transition-all gap-1.5",
              value === 'custom' 
                ? "bg-background text-foreground shadow-sm" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Calendar className="h-3.5 w-3.5" />
            {value === 'custom' ? getDisplayLabel() : 'Custom'}
            <ChevronDown className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <div className="p-3 border-b">
            <p className="text-sm font-medium">Select Date Range</p>
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
          />
          <div className="p-3 border-t flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setTempRange({});
                setIsOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleCustomRangeSelect}
              disabled={!tempRange.from || !tempRange.to}
            >
              Apply
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export { getDateRange };
