import { Button } from "@/components/ui/button";
import { Calendar, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format, subDays } from "date-fns";

export interface DateRange {
  from: Date;
  to: Date;
}

interface RevenueTimelineFilterProps {
  value: number; // 10, 30, 60, 120, or 0 for custom
  customRange?: DateRange | null;
  onChange: (days: number, range: DateRange) => void;
  variant?: 'default' | 'dark';
}

const timelineOptions = [
  { value: 10, label: "10d" },
  { value: 30, label: "30d" },
  { value: 60, label: "60d" },
  { value: 120, label: "120d" },
];

export function RevenueTimelineFilter({ 
  value, 
  customRange, 
  onChange, 
  variant = 'default' 
}: RevenueTimelineFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tempRange, setTempRange] = useState<{ from?: Date; to?: Date }>({});
  const isDark = variant === 'dark';

  const handlePresetClick = (days: number) => {
    const today = new Date();
    const range = { from: subDays(today, days), to: today };
    onChange(days, range);
  };

  const handleCustomRangeSelect = () => {
    if (tempRange.from && tempRange.to) {
      onChange(0, { from: tempRange.from, to: tempRange.to });
      setIsOpen(false);
    }
  };

  const getDisplayLabel = () => {
    if (value === 0 && customRange) {
      return `${format(customRange.from, 'MMM d')} - ${format(customRange.to, 'MMM d')}`;
    }
    return 'Custom';
  };

  return (
    <div className={cn(
      "flex items-center gap-1 p-1 rounded-lg",
      isDark ? "bg-white/10" : "bg-muted"
    )}>
      {timelineOptions.map((option) => (
        <Button
          key={option.value}
          variant="ghost"
          size="sm"
          onClick={() => handlePresetClick(option.value)}
          className={cn(
            "h-8 px-3 text-xs font-medium transition-all",
            isDark
              ? value === option.value 
                ? "bg-white/20 text-white shadow-sm" 
                : "text-white/70 hover:text-white hover:bg-white/10"
              : value === option.value 
                ? "bg-background text-foreground shadow-sm" 
                : "text-muted-foreground hover:text-foreground"
          )}
        >
          {option.label}
        </Button>
      ))}
      
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 px-3 text-xs font-medium transition-all gap-1.5",
              isDark
                ? value === 0 
                  ? "bg-white/20 text-white shadow-sm" 
                  : "text-white/70 hover:text-white hover:bg-white/10"
                : value === 0 
                  ? "bg-background text-foreground shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Calendar className="h-3.5 w-3.5" />
            {getDisplayLabel()}
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
