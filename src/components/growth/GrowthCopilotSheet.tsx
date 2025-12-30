import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Bot, Send, Sparkles, RefreshCw, X } from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface CopilotContext {
  currentStep?: number;
  currentStepName?: string;
  status?: string;
  totalEmailsSent?: number;
  interestedRate?: number;
  campaignCount?: number;
}

export function GrowthCopilotSheet() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [context, setContext] = useState<CopilotContext | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const callCopilot = async (type: 'diagnose' | 'recommend' | 'chat', userMessage?: string) => {
    setIsLoading(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      if (type === 'chat' && userMessage) {
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
      }

      const response = await supabase.functions.invoke('growth-copilot', {
        body: {
          type,
          message: userMessage,
          conversationHistory: messages,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) throw response.error;

      const { response: aiResponse, context: newContext } = response.data;
      
      setContext(newContext);
      setMessages(prev => [...prev, { role: 'assistant', content: aiResponse }]);
      
    } catch (error) {
      console.error('Copilot error:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'I apologize, but I encountered an error. Please try again.' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    
    const userMessage = input.trim();
    setInput('');
    callCopilot('chat', userMessage);
  };

  const handleQuickAction = (type: 'diagnose' | 'recommend') => {
    const actionMessage = type === 'diagnose' 
      ? 'Analyze my performance' 
      : 'What should I do next?';
    setMessages(prev => [...prev, { role: 'user', content: actionMessage }]);
    callCopilot(type);
  };

  const clearChat = () => {
    setMessages([]);
    setContext(null);
  };

  return (
    <>
      {/* Floating Button */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            size="lg"
            className={cn(
              "fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg",
              "bg-primary hover:bg-primary/90 text-primary-foreground",
              "transition-all duration-300 hover:scale-105",
              messages.length > 0 && "ring-2 ring-primary/30 ring-offset-2 ring-offset-background"
            )}
          >
            <Bot className="h-6 w-6" />
            {messages.length > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive flex items-center justify-center">
                <span className="text-[10px] text-destructive-foreground font-medium">
                  {messages.filter(m => m.role === 'assistant').length}
                </span>
              </span>
            )}
          </Button>
        </SheetTrigger>

        <SheetContent 
          side="right" 
          className="w-full sm:w-[450px] sm:max-w-[450px] p-0 flex flex-col"
        >
          {/* Header */}
          <SheetHeader className="px-6 py-4 border-b border-border flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <SheetTitle className="text-lg font-semibold">Growth Copilot</SheetTitle>
                  {context && (
                    <p className="text-xs text-muted-foreground">
                      Step {context.currentStep}: {context.currentStepName}
                    </p>
                  )}
                </div>
              </div>
              {messages.length > 0 && (
                <Button variant="ghost" size="sm" onClick={clearChat} className="h-8 px-2">
                  <RefreshCw className="w-4 h-4" />
                </Button>
              )}
            </div>
          </SheetHeader>

          {/* Messages Area */}
          <ScrollArea className="flex-1 px-6" ref={scrollRef}>
            <div className="space-y-4 py-6">
              {messages.length === 0 ? (
                <div className="text-center py-12 space-y-6">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                    <Sparkles className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <p className="text-lg font-medium text-foreground">Ready to help you grow</p>
                    <p className="text-sm text-muted-foreground mt-2 max-w-[280px] mx-auto">
                      Ask me anything about your campaigns or get a quick diagnosis of your performance.
                    </p>
                  </div>
                  
                  {/* Quick Actions */}
                  <div className="flex flex-col gap-3 pt-4 max-w-[280px] mx-auto">
                    <Button
                      variant="outline"
                      onClick={() => handleQuickAction('diagnose')}
                      disabled={isLoading}
                      className="w-full justify-start"
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      Diagnose My Performance
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleQuickAction('recommend')}
                      disabled={isLoading}
                      className="w-full justify-start"
                    >
                      <Bot className="w-4 h-4 mr-2" />
                      What Should I Do Next?
                    </Button>
                  </div>
                </div>
              ) : (
                messages.map((message, index) => (
                  <div
                    key={index}
                    className={cn(
                      "flex gap-3",
                      message.role === 'user' ? "justify-end" : "justify-start"
                    )}
                  >
                    {message.role === 'assistant' && (
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                        <Bot className="w-4 h-4 text-primary" />
                      </div>
                    )}
                    <div
                      className={cn(
                        "max-w-[85%] rounded-xl px-4 py-3 text-sm",
                        message.role === 'user'
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      )}
                    >
                      {message.role === 'assistant' ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <ReactMarkdown
                            components={{
                              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                              ul: ({ children }) => <ul className="mb-2 ml-4 list-disc">{children}</ul>,
                              ol: ({ children }) => <ol className="mb-2 ml-4 list-decimal">{children}</ol>,
                              li: ({ children }) => <li className="mb-1">{children}</li>,
                              strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                            }}
                          >
                            {message.content}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        message.content
                      )}
                    </div>
                  </div>
                ))
              )}
              
              {isLoading && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-primary animate-pulse" />
                  </div>
                  <div className="bg-muted rounded-xl px-4 py-3">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="p-6 border-t border-border flex-shrink-0">
            <form onSubmit={handleSubmit} className="flex gap-3">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about your campaigns..."
                disabled={isLoading}
                className="flex-1"
              />
              <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
