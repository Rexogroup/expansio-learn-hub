import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Navbar } from "@/components/Navbar";
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

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error("Please log in to access Script Builder");
      navigate("/auth");
      return;
    }

    // Check if user is admin
    const { data: roles, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .eq("role", "admin")
      .single();

    if (error || !roles) {
      toast.error("Access denied. Admin privileges required.");
      navigate("/courses");
    }
  };

  const handleNewConversation = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("script_conversations")
        .insert({ user_id: user.id, title: "New Conversation" })
        .select()
        .single();

      if (error) throw error;

      setCurrentConversationId(data.id);
      setRefreshTrigger(prev => prev + 1);
      toast.success("New conversation started");
    } catch (error: any) {
      console.error("Error creating conversation:", error);
      toast.error("Failed to create conversation");
    }
  };

  const handleSelectConversation = (id: string) => {
    setCurrentConversationId(id);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">AI Lead Magnet Builder</h1>
          <p className="text-muted-foreground">
            Create high-converting lead magnet scripts using our proven scriptwriting framework
          </p>
        </div>

        <Tabs defaultValue="chat" className="w-full">
          <TabsList className="grid w-full max-w-2xl grid-cols-5">
            <TabsTrigger value="chat">Chat</TabsTrigger>
            <TabsTrigger value="profile">My Profile</TabsTrigger>
            <TabsTrigger value="favorites">Favorites</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="saved">Saved Scripts</TabsTrigger>
          </TabsList>

          <TabsContent value="chat" className="mt-6">
            <ChatInterface
              conversationId={currentConversationId}
              onNewConversation={handleNewConversation}
            />
          </TabsContent>

          <TabsContent value="profile" className="mt-6">
            <UserProfile />
          </TabsContent>

          <TabsContent value="favorites" className="mt-6">
            <SavedLeadMagnets />
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            <ConversationList
              onSelectConversation={handleSelectConversation}
              refreshTrigger={refreshTrigger}
            />
          </TabsContent>

          <TabsContent value="saved" className="mt-6">
            <SavedScripts />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ScriptBuilder;
