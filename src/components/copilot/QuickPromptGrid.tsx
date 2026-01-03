import { Button } from '@/components/ui/button';
import { 
  Users, 
  Rocket, 
  PenLine, 
  Lightbulb, 
  BarChart3, 
  Trophy,
  HelpCircle,
  ClipboardCheck
} from 'lucide-react';

interface QuickPromptGridProps {
  onSelectPrompt: (prompt: string) => void;
}

const quickPrompts = [
  {
    icon: Users,
    label: 'Find Ideal Prospects',
    prompt: 'Help me identify and define my ideal customer profile for outbound campaigns. What characteristics should I look for?',
  },
  {
    icon: Rocket,
    label: 'Generate a Campaign',
    prompt: 'Create a complete cold email campaign for me, including subject lines, email sequence, and follow-up strategy.',
  },
  {
    icon: PenLine,
    label: 'Write a Sequence',
    prompt: 'Write a 3-step email sequence that I can use for my cold outreach. Make it personalized and compelling.',
  },
  {
    icon: Lightbulb,
    label: 'Campaign Ideas',
    prompt: 'Give me creative campaign ideas to improve my outbound lead generation. What strategies are working best right now?',
  },
  {
    icon: BarChart3,
    label: 'Weekly Analytics',
    prompt: 'Analyze my campaign performance from this week. What are the key metrics I should focus on?',
  },
  {
    icon: Trophy,
    label: 'Best Campaigns',
    prompt: 'Show me my best performing campaigns and explain why they are successful. What can I learn from them?',
  },
  {
    icon: HelpCircle,
    label: 'Get Advice',
    prompt: 'I need advice on improving my cold outreach strategy. What should I focus on to book more meetings?',
  },
  {
    icon: ClipboardCheck,
    label: 'Audit My Setup',
    prompt: 'Audit my current outbound setup and identify any issues or areas for improvement in my infrastructure.',
  },
];

export function QuickPromptGrid({ onSelectPrompt }: QuickPromptGridProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {quickPrompts.map((prompt) => (
        <Button
          key={prompt.label}
          variant="outline"
          className="h-auto flex-col items-start gap-2 p-4 text-left hover:bg-muted/50 hover:border-primary/50 transition-all"
          onClick={() => onSelectPrompt(prompt.prompt)}
        >
          <prompt.icon className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium">{prompt.label}</span>
        </Button>
      ))}
    </div>
  );
}
