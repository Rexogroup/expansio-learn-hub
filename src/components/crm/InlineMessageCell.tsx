import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface InlineMessageCellProps {
  message: string;
  isActive: boolean; // Whether connection is accepted
}

export const InlineMessageCell = ({ message, isActive }: InlineMessageCellProps) => {
  const [copied, setCopied] = useState(false);

  if (!isActive) {
    return (
      <div className="text-muted-foreground text-sm px-2 py-1">-</div>
    );
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      toast.success("Message copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Failed to copy");
    }
  };

  const truncatedMessage = message.length > 40 
    ? message.substring(0, 40) + "..." 
    : message;

  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <div
            onClick={handleCopy}
            className="group cursor-pointer hover:bg-primary/10 px-2 py-1 rounded text-sm flex items-center gap-1 min-w-[180px] max-w-[220px] transition-colors"
          >
            <span className="truncate flex-1 text-muted-foreground">
              {truncatedMessage}
            </span>
            <span className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
              {copied ? (
                <Check className="h-3.5 w-3.5 text-green-500" />
              ) : (
                <Copy className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent 
          side="bottom" 
          className="max-w-[350px] text-sm whitespace-pre-wrap"
        >
          <p className="text-xs text-muted-foreground mb-1">Click to copy:</p>
          {message}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
