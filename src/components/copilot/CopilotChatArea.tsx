import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Loader2, Sparkles } from 'lucide-react';
import { QuickPromptGrid } from './QuickPromptGrid';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

interface CopilotChatAreaProps {
  conversationId: string | null;
  onNewChat: () => void;
  onNewChatWithCallback?: () => Promise<string | null>;
  onUpdateTitle: (id: string, title: string) => void;
  initialPrompt?: string | null;
  onClearInitialPrompt?: () => void;
}

export function CopilotChatArea({ 
  conversationId, 
  onNewChat, 
  onNewChatWithCallback,
  onUpdateTitle,
  initialPrompt,
  onClearInitialPrompt,
}: CopilotChatAreaProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (conversationId) {
      loadMessages(conversationId);
    } else {
      setMessages([]);
    }
  }, [conversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-send initial prompt when provided
  useEffect(() => {
    const handleInitialPrompt = async () => {
      if (!initialPrompt || isLoading) return;
      
      const promptToSend = initialPrompt;
      onClearInitialPrompt?.();
      
      let targetConversationId = conversationId;
      
      // If no conversation exists, create one first
      if (!targetConversationId && onNewChatWithCallback) {
        targetConversationId = await onNewChatWithCallback();
        if (!targetConversationId) return;
      }
      
      // Now send the message directly
      await sendMessage(promptToSend, targetConversationId);
    };
    
    handleInitialPrompt();
  }, [initialPrompt]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const loadMessages = async (convId: string) => {
    try {
      const { data, error } = await supabase
        .from('copilot_messages')
        .select('*')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages((data || []).map(m => ({
        ...m,
        role: m.role as 'user' | 'assistant'
      })));
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const handleQuickPrompt = async (prompt: string) => {
    if (!conversationId) {
      await onNewChat();
      setTimeout(() => {
        setInput(prompt);
        inputRef.current?.focus();
      }, 100);
    } else {
      setInput(prompt);
      inputRef.current?.focus();
    }
  };

  const sendMessage = async (message: string, targetConversationId: string | null) => {
    if (!message.trim() || !targetConversationId) return;
    
    setIsLoading(true);
    
    const tempUserMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: message,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempUserMessage]);

    try {
      await supabase.from('copilot_messages').insert({
        conversation_id: targetConversationId,
        role: 'user',
        content: message,
      });

      if (messages.length === 0) {
        onUpdateTitle(targetConversationId, message.substring(0, 50));
      }

      const conversationHistory = messages.map(m => ({
        role: m.role,
        content: m.content,
      }));

      const { data, error } = await supabase.functions.invoke('growth-copilot', {
        body: {
          message,
          conversationHistory: [...conversationHistory, { role: 'user', content: message }],
        },
      });

      if (error) throw error;

      const assistantContent = data?.response || 'I apologize, but I encountered an issue processing your request.';

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: assistantContent,
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [...prev, assistantMessage]);

      await supabase.from('copilot_messages').insert({
        conversation_id: targetConversationId,
        role: 'assistant',
        content: assistantContent,
      });

    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        created_at: new Date().toISOString(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    let currentConversationId = conversationId;

    if (!currentConversationId) {
      if (onNewChatWithCallback) {
        currentConversationId = await onNewChatWithCallback();
        if (!currentConversationId) return;
      } else {
        return;
      }
    }

    const userMessage = input.trim();
    setInput('');
    
    await sendMessage(userMessage, currentConversationId);

  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const showWelcome = !conversationId || messages.length === 0;

  return (
    <div className="flex flex-col h-full">
      {/* Chat Messages Area */}
      <ScrollArea className="flex-1 p-6">
        {showWelcome ? (
          <div className="max-w-3xl mx-auto pt-16">
            <div className="text-center mb-12">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-3xl font-bold text-foreground mb-3">
                How can I help you today?
              </h1>
              <p className="text-muted-foreground text-lg max-w-xl mx-auto">
                I'm your Expansio Copilot. Ask me about campaign strategies, lead generation, 
                performance analysis, or anything related to your outbound growth.
              </p>
            </div>
            <QuickPromptGrid onSelectPrompt={handleQuickPrompt} />
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-6 pb-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  'flex gap-4',
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                {message.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Sparkles className="h-4 w-4 text-primary" />
                  </div>
                )}
                <div
                  className={cn(
                    'rounded-2xl px-4 py-3 max-w-[80%]',
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  )}
                >
                  {message.role === 'assistant' ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown>{message.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <div className="bg-muted rounded-2xl px-4 py-3">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>
        )}
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t border-border p-4">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
          <div className="relative">
            <Textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Expansio AI anything..."
              className="min-h-[60px] max-h-[200px] pr-14 resize-none rounded-xl"
              disabled={isLoading}
            />
            <Button
              type="submit"
              size="icon"
              className="absolute right-2 bottom-2"
              disabled={!input.trim() || isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
