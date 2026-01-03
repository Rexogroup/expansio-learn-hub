import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  MessageSquarePlus, 
  Brain, 
  MessagesSquare, 
  ChevronLeft,
  Trash2,
  MoreHorizontal
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CopilotTab, Conversation } from '@/pages/ExpansioCopilot';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface CopilotSidebarProps {
  activeTab: CopilotTab;
  onTabChange: (tab: CopilotTab) => void;
  conversations: Conversation[];
  activeConversationId: string | null;
  onNewChat: () => void;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
}

export function CopilotSidebar({
  activeTab,
  onTabChange,
  conversations,
  activeConversationId,
  onNewChat,
  onSelectConversation,
  onDeleteConversation,
}: CopilotSidebarProps) {
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div
      className={cn(
        'flex flex-col border-r border-border bg-card transition-all duration-300',
        isCollapsed ? 'w-16' : 'w-72'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        {!isCollapsed && (
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">E</span>
            </div>
            <span className="font-semibold text-foreground">Expansio Copilot</span>
          </button>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="shrink-0"
        >
          <ChevronLeft className={cn('h-4 w-4 transition-transform', isCollapsed && 'rotate-180')} />
        </Button>
      </div>

      {/* New Chat Button */}
      <div className="p-3">
        <Button
          onClick={onNewChat}
          className={cn('w-full gap-2', isCollapsed && 'px-0')}
          variant="default"
        >
          <MessageSquarePlus className="h-4 w-4" />
          {!isCollapsed && 'New Chat'}
        </Button>
      </div>

      {/* Navigation Tabs */}
      <div className="px-3 space-y-1">
        <Button
          variant={activeTab === 'chat' ? 'secondary' : 'ghost'}
          className={cn('w-full justify-start gap-2', isCollapsed && 'justify-center px-0')}
          onClick={() => onTabChange('chat')}
        >
          <MessagesSquare className="h-4 w-4" />
          {!isCollapsed && 'Chats'}
        </Button>
        <Button
          variant={activeTab === 'memory' ? 'secondary' : 'ghost'}
          className={cn('w-full justify-start gap-2', isCollapsed && 'justify-center px-0')}
          onClick={() => onTabChange('memory')}
        >
          <Brain className="h-4 w-4" />
          {!isCollapsed && 'Memory'}
        </Button>
      </div>

      {/* Conversations List */}
      {!isCollapsed && activeTab === 'chat' && (
        <div className="flex-1 flex flex-col mt-4 overflow-hidden">
          <div className="px-4 py-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Recent Chats
            </span>
          </div>
          <ScrollArea className="flex-1 px-3">
            <div className="space-y-1 pb-4">
              {conversations.length === 0 ? (
                <p className="text-sm text-muted-foreground px-2 py-4 text-center">
                  No conversations yet
                </p>
              ) : (
                conversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    className={cn(
                      'group flex items-center gap-2 rounded-lg px-2 py-2 cursor-pointer transition-colors',
                      activeConversationId === conversation.id
                        ? 'bg-secondary text-secondary-foreground'
                        : 'hover:bg-muted'
                    )}
                    onClick={() => onSelectConversation(conversation.id)}
                  >
                    <MessagesSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="flex-1 truncate text-sm">{conversation.title}</span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteConversation(conversation.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
