import { Calendar, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format, subDays } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  { value: "10", label: "Last 10 days" },
  { value: "30", label: "Last 30 days" },
  { value: "60", label: "Last 60 days" },
  { value: "120", label: "Last 120 days" },
];

export function RevenueTimelineFilter({ 
  value, 
  customRange, 
  onChange, 
  variant = 'default' 
}: RevenueTimelineFilterProps) {
  const [isCustomOpen, setIsCustomOpen] = useState(false);
  const [tempRange, setTempRange] = useState<{ from?: Date; to?: Date }>({});
  const isDark = variant === 'dark';

  const handlePresetChange = (val: string) => {
    if (val === "custom") {
      setIsCustomOpen(true);
      return;
    }
    const days = parseInt(val);
    const today = new Date();
    const range = { from: subDays(today, days), to: today };
    onChange(days, range);
  };

  const handleCustomRangeSelect = () => {
    if (tempRange.from && tempRange.to) {
      onChange(0, { from: tempRange.from, to: tempRange.to });
      setIsCustomOpen(false);
      setTempRange({});
    }
  };

  const getDisplayValue = () => {
    if (value === 0 && customRange) {
      return `${format(customRange.from, 'MMM d')} - ${format(customRange.to, 'MMM d')}`;
    }
    const option = timelineOptions.find(o => o.value === String(value));
    return option?.label || "Last 30 days";
  };

  const getCurrentValue = () => {
    if (value === 0) return "custom";
    return String(value);
  };

  return (
    <Popover open={isCustomOpen} onOpenChange={setIsCustomOpen}>
      <Select value={getCurrentValue()} onValueChange={handlePresetChange}>
        <SelectTrigger 
          className={cn(
            "w-[180px] h-9 text-sm font-medium",
            isDark 
              ? "bg-white/10 border-white/20 text-white hover:bg-white/20" 
              : "bg-background border-border"
          )}
        >
          <Calendar className="h-4 w-4 mr-2 opacity-70" />
          <SelectValue>{getDisplayValue()}</SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-popover border-border">
          {timelineOptions.map((option) => (
            <SelectItem 
              key={option.value} 
              value={option.value}
              className="cursor-pointer"
            >
              {option.label}
            </SelectItem>
          ))}
          <PopoverTrigger asChild>
            <SelectItem 
              value="custom" 
              className="cursor-pointer border-t border-border mt-1 pt-2"
            >
              Custom range
            </SelectItem>
          </PopoverTrigger>
        </SelectContent>
      </Select>
      
      <PopoverContent className="w-auto p-0 bg-popover border-border" align="start">
        <div className="p-3 border-b border-border">
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
          className="pointer-events-auto"
        />
        <div className="p-3 border-t border-border flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setTempRange({});
              setIsCustomOpen(false);
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
  );
}
