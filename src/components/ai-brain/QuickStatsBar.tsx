import { Check, X, AlertTriangle, Phone } from "lucide-react";

interface QuickStatsBarProps {
  winningScripts: number;
  losingScripts: number;
  winningReplies: number;
  losingReplies: number;
  masteredObjections: number;
  needsWorkObjections: number;
  totalCalls: number;
}

export const QuickStatsBar = ({
  winningScripts,
  losingScripts,
  winningReplies,
  losingReplies,
  masteredObjections,
  needsWorkObjections,
  totalCalls,
}: QuickStatsBarProps) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <StatCard
        label="Scripts"
        wins={winningScripts}
        losses={losingScripts}
        icon={<Check className="h-3 w-3" />}
      />
      <StatCard
        label="Replies"
        wins={winningReplies}
        losses={losingReplies}
        icon={<Check className="h-3 w-3" />}
      />
      <StatCard
        label="Objections"
        wins={masteredObjections}
        losses={needsWorkObjections}
        winsLabel="Mastered"
        lossesLabel="Need Work"
        icon={<AlertTriangle className="h-3 w-3" />}
      />
      <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
        <div className="flex items-center gap-2 mb-1">
          <Phone className="h-3 w-3 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Calls Analyzed</span>
        </div>
        <p className="text-xl font-bold">{totalCalls}</p>
      </div>
    </div>
  );
};

interface StatCardProps {
  label: string;
  wins: number;
  losses: number;
  winsLabel?: string;
  lossesLabel?: string;
  icon: React.ReactNode;
}

const StatCard = ({ label, wins, losses, winsLabel = "Winners", lossesLabel = "Losers", icon }: StatCardProps) => (
  <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
    <p className="text-xs text-muted-foreground mb-2">{label}</p>
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1">
        <span className="flex items-center justify-center w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-500">
          {icon}
        </span>
        <span className="text-sm font-medium">{wins}</span>
        <span className="text-xs text-muted-foreground">{winsLabel}</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="flex items-center justify-center w-4 h-4 rounded-full bg-amber-500/20 text-amber-500">
          <X className="h-3 w-3" />
        </span>
        <span className="text-sm font-medium">{losses}</span>
        <span className="text-xs text-muted-foreground">{lossesLabel}</span>
      </div>
    </div>
  </div>
);
