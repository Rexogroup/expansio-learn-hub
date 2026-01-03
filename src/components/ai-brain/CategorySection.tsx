import { LucideIcon, Check, X, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CategorySectionProps {
  title: string;
  icon: LucideIcon;
  winCount: number;
  loseCount: number;
  winLabel?: string;
  loseLabel?: string;
  children: React.ReactNode;
  emptyState?: React.ReactNode;
  onViewAll?: () => void;
  showViewAll?: boolean;
}

export const CategorySection = ({
  title,
  icon: Icon,
  winCount,
  loseCount,
  winLabel = "Winners",
  loseLabel = "Losers",
  children,
  emptyState,
  onViewAll,
  showViewAll = false,
}: CategorySectionProps) => {
  const hasContent = winCount > 0 || loseCount > 0;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm">{title}</h3>
        </div>
      </div>

      {hasContent && (
        <div className="flex items-center gap-3 mb-3 text-xs">
          <div className="flex items-center gap-1">
            <span className="flex items-center justify-center w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-500">
              <Check className="h-2.5 w-2.5" />
            </span>
            <span className="font-medium">{winCount}</span>
            <span className="text-muted-foreground">{winLabel}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="flex items-center justify-center w-4 h-4 rounded-full bg-amber-500/20 text-amber-500">
              <X className="h-2.5 w-2.5" />
            </span>
            <span className="font-medium">{loseCount}</span>
            <span className="text-muted-foreground">{loseLabel}</span>
          </div>
        </div>
      )}

      <div className="flex-1 space-y-2">
        {hasContent ? children : emptyState}
      </div>

      {showViewAll && onViewAll && (
        <Button
          variant="ghost"
          size="sm"
          className="mt-3 w-full justify-between text-xs"
          onClick={onViewAll}
        >
          View All
          <ChevronRight className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
};
