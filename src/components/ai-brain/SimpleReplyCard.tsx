import { Copy, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface SimpleReplyCardProps {
  title: string;
  content?: string;
  isWinning: boolean;
  replyType?: string;
}

export const SimpleReplyCard = ({
  title,
  content,
  isWinning,
  replyType,
}: SimpleReplyCardProps) => {
  const handleCopy = () => {
    if (content) {
      navigator.clipboard.writeText(content);
      toast.success("Reply copied to clipboard");
    }
  };

  return (
    <div 
      className={`p-3 rounded-lg border transition-colors ${
        isWinning 
          ? "border-l-4 border-l-emerald-500 border-border/50 bg-emerald-500/5" 
          : "border-l-4 border-l-amber-500 border-border/50 bg-amber-500/5"
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {isWinning ? (
            <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
          ) : (
            <XCircle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
          )}
          <h4 className="text-sm font-medium truncate">{title}</h4>
        </div>
        {replyType && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
            {replyType}
          </span>
        )}
      </div>

      {content && (
        <div className="flex items-end gap-2">
          <p className="text-xs text-muted-foreground line-clamp-2 flex-1">
            {content}
          </p>
          {isWinning && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 shrink-0"
              onClick={handleCopy}
            >
              <Copy className="h-3 w-3" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
