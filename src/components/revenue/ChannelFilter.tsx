import { Button } from "@/components/ui/button";
import { Users, Mail, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

export type Channel = 'all' | 'sdr' | 'cold_email';

interface ChannelFilterProps {
  value: Channel;
  onChange: (channel: Channel) => void;
}

export function ChannelFilter({ value, onChange }: ChannelFilterProps) {
  const channels: { id: Channel; label: string; icon: React.ElementType }[] = [
    { id: 'all', label: 'All Channels', icon: Layers },
    { id: 'sdr', label: 'SDR', icon: Users },
    { id: 'cold_email', label: 'Cold Email', icon: Mail },
  ];

  return (
    <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
      {channels.map((channel) => (
        <Button
          key={channel.id}
          variant="ghost"
          size="sm"
          onClick={() => onChange(channel.id)}
          className={cn(
            "h-8 px-3 text-xs font-medium transition-all",
            value === channel.id 
              ? "bg-background text-foreground shadow-sm" 
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <channel.icon className="h-3.5 w-3.5 mr-1.5" />
          {channel.label}
        </Button>
      ))}
    </div>
  );
}
