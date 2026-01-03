import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, Calendar, Mail, CheckCircle, Sparkles, CalendarCheck, Inbox } from "lucide-react";
import ReplyCard from "@/components/inbox/ReplyCard";
import ThreadView from "@/components/inbox/ThreadView";
import { useIsMobile } from "@/hooks/use-mobile";

interface LeadReply {
  id: string;
  external_reply_id: string;
  lead_email: string;
  lead_name: string | null;
  campaign_id: string | null;
  campaign_name: string | null;
  subject: string | null;
  body: string;
  received_at: string;
  status: 'pending' | 'replied' | 'dismissed';
  reply_type: string | null;
  ai_draft: string | null;
  sent_response: string | null;
  responded_at: string | null;
  outcome?: 'meeting_booked' | 'positive_response' | 'no_response' | 'negative' | 'pending' | null;
  outcome_at?: string | null;
}

const MasterInbox = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [replies, setReplies] = useState<LeadReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selectedReply, setSelectedReply] = useState<LeadReply | null>(null);
  const [activeTab, setActiveTab] = useState("pending");
  const [hasIntegration, setHasIntegration] = useState(false);
  const [showThreadOnMobile, setShowThreadOnMobile] = useState(false);

  useEffect(() => {
    checkAuthAndFetch();
  }, []);

  const checkAuthAndFetch = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    
    await Promise.all([
      fetchReplies(),
      checkIntegration(session.user.id)
    ]);
  };

  const checkIntegration = async (userId: string) => {
    const { data } = await supabase
      .from('user_integrations')
      .select('id')
      .eq('user_id', userId)
      .eq('platform', 'emailbison')
      .eq('is_active', true)
      .single();
    
    setHasIntegration(!!data);
  };

  const fetchReplies = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('lead_replies')
        .select('*')
        .order('received_at', { ascending: false });

      if (error) throw error;
      const fetchedReplies = (data as LeadReply[]) || [];
      setReplies(fetchedReplies);
      
      // Auto-select first pending reply if none selected
      if (!selectedReply && fetchedReplies.length > 0) {
        const firstPending = fetchedReplies.find(r => r.status === 'pending');
        setSelectedReply(firstPending || fetchedReplies[0]);
      }
    } catch (error) {
      console.error('Error fetching replies:', error);
      toast({
        title: "Error",
        description: "Failed to fetch replies",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const syncReplies = async () => {
    setSyncing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase.functions.invoke('sync-lead-replies', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      toast({
        title: "Sync Complete",
        description: `Synced ${data.synced} replies (${data.inserted} new)`,
      });

      await fetchReplies();
    } catch (error) {
      console.error('Error syncing replies:', error);
      toast({
        title: "Sync Failed",
        description: "Failed to sync replies from EmailBison",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleReplyClick = (reply: LeadReply) => {
    setSelectedReply(reply);
    if (isMobile) {
      setShowThreadOnMobile(true);
    }
  };

  const handleDismiss = async (replyId: string) => {
    try {
      const { error } = await supabase
        .from('lead_replies')
        .update({ status: 'dismissed' })
        .eq('id', replyId);

      if (error) throw error;

      setReplies(prev => prev.map(r => 
        r.id === replyId ? { ...r, status: 'dismissed' as const } : r
      ));
      
      // Update selected reply if it was dismissed
      if (selectedReply?.id === replyId) {
        setSelectedReply(prev => prev ? { ...prev, status: 'dismissed' as const } : null);
      }

      toast({
        title: "Dismissed",
        description: "Reply marked as dismissed",
      });
    } catch (error) {
      console.error('Error dismissing reply:', error);
      toast({
        title: "Error",
        description: "Failed to dismiss reply",
        variant: "destructive",
      });
    }
  };

  const handleSuccess = async () => {
    await fetchReplies();
    // Refresh selected reply with updated data
    if (selectedReply) {
      const updated = replies.find(r => r.id === selectedReply.id);
      if (updated) {
        setSelectedReply(updated);
      }
    }
  };

  const filteredReplies = replies.filter(r => {
    if (activeTab === "all") return true;
    return r.status === activeTab;
  });

  const pendingCount = replies.filter(r => r.status === 'pending').length;
  const repliedCount = replies.filter(r => r.status === 'replied').length;
  const meetingsBookedCount = replies.filter(r => r.outcome === 'meeting_booked').length;
  const conversionRate = repliedCount > 0 ? ((meetingsBookedCount / repliedCount) * 100).toFixed(1) : '0';

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <div className="space-y-4">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-[400px] w-full" />
          </div>
        </main>
      </div>
    );
  }

  // Mobile: Show thread view full-screen when a reply is selected
  if (isMobile && showThreadOnMobile && selectedReply) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="h-[calc(100vh-4rem)]">
          <ThreadView
            reply={selectedReply}
            onSuccess={handleSuccess}
            onDismiss={() => handleDismiss(selectedReply.id)}
            onBack={() => setShowThreadOnMobile(false)}
            isMobile={true}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-6 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Calendar className="h-6 w-6" />
              Appointment Copilot
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Book meetings with interested leads using AI-powered replies
            </p>
          </div>
          <div className="flex items-center gap-3">
            {!hasIntegration && (
              <Button variant="outline" size="sm" onClick={() => navigate('/integrations')}>
                Connect EmailBison
              </Button>
            )}
            <Button 
              onClick={syncReplies} 
              disabled={syncing || !hasIntegration}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync Replies'}
            </Button>
          </div>
        </div>

        {!hasIntegration ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Mail className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Connect EmailBison</h3>
              <p className="text-muted-foreground text-center mb-4 max-w-md">
                Connect your EmailBison account to start receiving interested lead replies
                and respond directly from this inbox.
              </p>
              <Button onClick={() => navigate('/integrations')}>
                Go to Integrations
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 flex-shrink-0">
              <Card className="py-3">
                <CardHeader className="pb-1 pt-0 px-4">
                  <CardTitle className="text-xs font-medium text-muted-foreground">Pending</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-0">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-amber-500" />
                    <span className="text-xl font-bold">{pendingCount}</span>
                  </div>
                </CardContent>
              </Card>
              <Card className="py-3">
                <CardHeader className="pb-1 pt-0 px-4">
                  <CardTitle className="text-xs font-medium text-muted-foreground">Replied</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-0">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-xl font-bold">{repliedCount}</span>
                  </div>
                </CardContent>
              </Card>
              <Card className="py-3">
                <CardHeader className="pb-1 pt-0 px-4">
                  <CardTitle className="text-xs font-medium text-muted-foreground">Meetings Booked</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-0">
                  <div className="flex items-center gap-2">
                    <CalendarCheck className="h-4 w-4 text-green-600" />
                    <span className="text-xl font-bold">{meetingsBookedCount}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{conversionRate}% conversion</p>
                </CardContent>
              </Card>
              <Card className="py-3">
                <CardHeader className="pb-1 pt-0 px-4">
                  <CardTitle className="text-xs font-medium text-muted-foreground">Total</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-0">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-primary" />
                    <span className="text-xl font-bold">{replies.length}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-shrink-0 mb-3">
              <TabsList>
                <TabsTrigger value="pending" className="gap-1.5">
                  Pending
                  {pendingCount > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                      {pendingCount}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="replied">Replied</TabsTrigger>
                <TabsTrigger value="dismissed">Dismissed</TabsTrigger>
                <TabsTrigger value="all">All</TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Split Pane Layout */}
            <div className="flex-1 min-h-0 border rounded-lg overflow-hidden">
              {filteredReplies.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 h-full">
                  <Sparkles className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No replies yet</h3>
                  <p className="text-muted-foreground text-center max-w-md">
                    {activeTab === 'pending' 
                      ? "You're all caught up! No pending replies to respond to."
                      : `No ${activeTab} replies found.`}
                  </p>
                </div>
              ) : (
                <ResizablePanelGroup direction="horizontal">
                  {/* Reply List Panel */}
                  <ResizablePanel defaultSize={35} minSize={25} maxSize={50}>
                    <ScrollArea className="h-full">
                      <div className="p-2 space-y-2">
                        {filteredReplies.map((reply) => (
                          <ReplyCard
                            key={reply.id}
                            reply={reply}
                            onClick={() => handleReplyClick(reply)}
                            onDismiss={() => handleDismiss(reply.id)}
                            isActive={selectedReply?.id === reply.id}
                          />
                        ))}
                      </div>
                    </ScrollArea>
                  </ResizablePanel>

                  <ResizableHandle withHandle />

                  {/* Thread View Panel */}
                  <ResizablePanel defaultSize={65}>
                    {selectedReply ? (
                      <ThreadView
                        reply={selectedReply}
                        onSuccess={handleSuccess}
                        onDismiss={() => handleDismiss(selectedReply.id)}
                      />
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                        <Inbox className="h-12 w-12 mb-4" />
                        <p>Select a reply to view details</p>
                      </div>
                    )}
                  </ResizablePanel>
                </ResizablePanelGroup>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default MasterInbox;
