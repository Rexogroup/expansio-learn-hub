import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

import ChatInterface from "@/components/script-builder/ChatInterface";
import ConversationList from "@/components/script-builder/ConversationList";
import SavedScripts from "@/components/script-builder/SavedScripts";
import SavedLeadMagnets from "@/components/script-builder/SavedLeadMagnets";
import UserProfile from "@/components/script-builder/UserProfile";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
const ScriptBuilder = () => {
  const navigate = useNavigate();
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [activeTab, setActiveTab] = useState("chat");
  const [initialMessage, setInitialMessage] = useState<string | undefined>(undefined);
  useEffect(() => {
    checkAuth();
  }, []);
  const checkAuth = async () => {
    const {
      data: {
        session
      }
    } = await supabase.auth.getSession();
    if (!session) {
      toast.error("Please log in to access Script Builder");
      navigate("/auth");
      return;
    }
  };
  const handleNewConversation = async () => {
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const {
        data,
        error
      } = await supabase.from("script_conversations").insert({
        user_id: user.id,
        title: "New Conversation"
      }).select().single();
      if (error) throw error;
      setCurrentConversationId(data.id);
      setRefreshTrigger(prev => prev + 1);
      toast.success("New conversation started");
      return data.id;
    } catch (error: any) {
      console.error("Error creating conversation:", error);
      toast.error("Failed to create conversation");
      return null;
    }
  };
  const handleSelectConversation = (id: string) => {
    setCurrentConversationId(id);
  };
  const handleRefineInChat = useCallback(async (content: string, title: string) => {
    // Create a new conversation for refinement
    const newConvId = await handleNewConversation();
    if (!newConvId) return;

    // Set the initial message with the lead magnet content
    const refinementPrompt = `I want to refine this lead magnet "${title}":\n\n${content}\n\nPlease help me improve it. What aspects would you like me to focus on - the hook, the deliverable specifics, or the value proposition?`;
    setInitialMessage(refinementPrompt);

    // Switch to chat tab
    setActiveTab("chat");
    toast.success("Lead magnet loaded for refinement");
  }, []);
  const clearInitialMessage = useCallback(() => {
    setInitialMessage(undefined);
  }, []);
  return <main className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Script Copilot</h1>
        <p className="text-muted-foreground">
          Create high-converting lead magnets with AI-powered scriptwriting
        </p>
      </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-2xl grid-cols-5">
            <TabsTrigger value="chat">Chat</TabsTrigger>
            <TabsTrigger value="profile">My Profile</TabsTrigger>
            <TabsTrigger value="favorites">Favorites</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="saved">Saved Scripts</TabsTrigger>
          </TabsList>

          <TabsContent value="chat" className="mt-6">
            <ChatInterface conversationId={currentConversationId} onNewConversation={handleNewConversation} initialMessage={initialMessage} onClearInitialMessage={clearInitialMessage} />
          </TabsContent>

          <TabsContent value="profile" className="mt-6">
            <UserProfile />
          </TabsContent>

          <TabsContent value="favorites" className="mt-6">
            <SavedLeadMagnets onRefineInChat={handleRefineInChat} />
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            <ConversationList onSelectConversation={handleSelectConversation} refreshTrigger={refreshTrigger} />
          </TabsContent>

          <TabsContent value="saved" className="mt-6">
            <SavedScripts />
          </TabsContent>
        </Tabs>
    </main>;
};
export default ScriptBuilder;