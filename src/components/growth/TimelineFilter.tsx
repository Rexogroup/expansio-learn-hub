import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "lucide-react";

interface TimelineFilterProps {
  value: number;
  onChange: (days: number) => void;
}

const timelineOptions = [
  { value: 10, label: "Last 10 days" },
  { value: 30, label: "Last 30 days" },
  { value: 60, label: "Last 60 days" },
  { value: 120, label: "Last 120 days" },
];

export function TimelineFilter({ value, onChange }: TimelineFilterProps) {
  return (
    <Select
      value={value.toString()}
      onValueChange={(v) => onChange(parseInt(v, 10))}
    >
      <SelectTrigger className="w-[160px]">
        <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
        <SelectValue placeholder="Select period" />
      </SelectTrigger>
      <SelectContent>
        {timelineOptions.map((option) => (
          <SelectItem key={option.value} value={option.value.toString()}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
