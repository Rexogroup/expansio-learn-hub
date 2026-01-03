import { Brain, Upload, Mail, MessageSquare } from "lucide-react";

interface ChecklistItem {
  icon: React.ReactNode;
  label: string;
  completed: boolean;
}

interface UnifiedEmptyStateProps {
  hasScripts: boolean;
  hasReplies: boolean;
  hasCalls: boolean;
}

export const UnifiedEmptyState = ({ hasScripts, hasReplies, hasCalls }: UnifiedEmptyStateProps) => {
  const checklist: ChecklistItem[] = [
    {
      icon: <Upload className="h-4 w-4" />,
      label: "Upload your first sales call",
      completed: hasCalls,
    },
    {
      icon: <Mail className="h-4 w-4" />,
      label: "Send 1,000+ emails for script analysis",
      completed: hasScripts,
    },
    {
      icon: <MessageSquare className="h-4 w-4" />,
      label: "Mark reply outcomes in Master Inbox",
      completed: hasReplies,
    },
  ];

  const allCompleted = checklist.every(item => item.completed);

  if (allCompleted) return null;

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="rounded-full p-4 bg-primary/10 mb-4">
        <Brain className="h-8 w-8 text-primary" />
      </div>
      <h3 className="text-lg font-semibold mb-2">Build Your AI Brain</h3>
      <p className="text-sm text-muted-foreground text-center mb-6 max-w-md">
        Complete these steps to start learning from your outbound data
      </p>
      <div className="space-y-3 w-full max-w-sm">
        {checklist.map((item, index) => (
          <div
            key={index}
            className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
              item.completed
                ? "bg-emerald-500/10 border-emerald-500/30"
                : "bg-muted/50 border-border/50"
            }`}
          >
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full ${
                item.completed
                  ? "bg-emerald-500 text-white"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {item.completed ? (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                item.icon
              )}
            </div>
            <span className={`text-sm ${item.completed ? "text-emerald-600 dark:text-emerald-400" : ""}`}>
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
