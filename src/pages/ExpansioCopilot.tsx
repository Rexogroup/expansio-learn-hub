import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { CopilotSidebar } from '@/components/copilot/CopilotSidebar';
import { CopilotChatArea } from '@/components/copilot/CopilotChatArea';
import { CopilotMemory } from '@/components/copilot/CopilotMemory';

export type CopilotTab = 'chat' | 'memory';

export interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export default function ExpansioCopilot() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<CopilotTab>('chat');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [initialPrompt, setInitialPrompt] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
    loadConversations();
  }, []);

  // Check for initial prompt from navigation state
  useEffect(() => {
    const state = location.state as { initialPrompt?: string } | null;
    if (state?.initialPrompt) {
      setInitialPrompt(state.initialPrompt);
      setActiveTab('chat');
      // Clear the state to prevent re-triggering on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/auth');
    }
  };

  const loadConversations = async () => {
    try {
      const { data, error } = await supabase
        .from('copilot_conversations')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setConversations(data || []);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('copilot_conversations')
        .insert({ user_id: user.id, title: 'New Chat' })
        .select()
        .single();

      if (error) throw error;

      setConversations(prev => [data, ...prev]);
      setActiveConversationId(data.id);
      setActiveTab('chat');
    } catch (error) {
      console.error('Error creating conversation:', error);
    }
  };

  const handleSelectConversation = (id: string) => {
    setActiveConversationId(id);
    setActiveTab('chat');
  };

  const handleDeleteConversation = async (id: string) => {
    try {
      const { error } = await supabase
        .from('copilot_conversations')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setConversations(prev => prev.filter(c => c.id !== id));
      if (activeConversationId === id) {
        setActiveConversationId(null);
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
    }
  };

  const handleUpdateConversationTitle = async (id: string, title: string) => {
    try {
      const { error } = await supabase
        .from('copilot_conversations')
        .update({ title })
        .eq('id', id);

      if (error) throw error;

      setConversations(prev =>
        prev.map(c => (c.id === id ? { ...c, title } : c))
      );
    } catch (error) {
      console.error('Error updating conversation title:', error);
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <CopilotSidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        conversations={conversations}
        activeConversationId={activeConversationId}
        onNewChat={handleNewChat}
        onSelectConversation={handleSelectConversation}
        onDeleteConversation={handleDeleteConversation}
      />
      <main className="flex-1 overflow-hidden">
        {activeTab === 'chat' && (
          <CopilotChatArea
            conversationId={activeConversationId}
            onNewChat={handleNewChat}
            onUpdateTitle={handleUpdateConversationTitle}
            initialPrompt={initialPrompt}
            onClearInitialPrompt={() => setInitialPrompt(null)}
          />
        )}
        {activeTab === 'memory' && <CopilotMemory />}
      </main>
    </div>
  );
}
