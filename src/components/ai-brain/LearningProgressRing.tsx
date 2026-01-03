import { Brain } from "lucide-react";

interface LearningProgressRingProps {
  patternsLearned: number;
  targetPatterns?: number;
}

export const LearningProgressRing = ({ 
  patternsLearned, 
  targetPatterns = 100 
}: LearningProgressRingProps) => {
  const percentage = Math.min((patternsLearned / targetPatterns) * 100, 100);
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center">
      <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
        {/* Background circle */}
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          className="text-muted/30"
        />
        {/* Progress circle */}
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="url(#progressGradient)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-700 ease-out"
        />
        <defs>
          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(var(--primary))" />
            <stop offset="100%" stopColor="hsl(280, 70%, 60%)" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute flex flex-col items-center">
        <Brain className="h-5 w-5 text-primary mb-1" />
        <span className="text-xl font-bold">{patternsLearned}</span>
        <span className="text-xs text-muted-foreground">patterns</span>
      </div>
    </div>
  );
};
