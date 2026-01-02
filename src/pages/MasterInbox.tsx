import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, Inbox, Mail, CheckCircle, XCircle, Sparkles, CalendarCheck } from "lucide-react";
import ReplyCard from "@/components/inbox/ReplyCard";
import ReplyModal from "@/components/inbox/ReplyModal";

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
  const [replies, setReplies] = useState<LeadReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selectedReply, setSelectedReply] = useState<LeadReply | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("pending");
  const [hasIntegration, setHasIntegration] = useState(false);

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
      setReplies((data as LeadReply[]) || []);
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
    setModalOpen(true);
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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Inbox className="h-8 w-8" />
              Master Inbox
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage and respond to interested leads with AI-powered replies
            </p>
          </div>
          <div className="flex items-center gap-3">
            {!hasIntegration && (
              <Button variant="outline" onClick={() => navigate('/integrations')}>
                Connect EmailBison
              </Button>
            )}
            <Button 
              onClick={syncReplies} 
              disabled={syncing || !hasIntegration}
              variant="outline"
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
            <div className="grid grid-cols-4 gap-4 mb-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Pending
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Mail className="h-5 w-5 text-amber-500" />
                    <span className="text-2xl font-bold">{pendingCount}</span>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Replied
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="text-2xl font-bold">{repliedCount}</span>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Meetings Booked
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <CalendarCheck className="h-5 w-5 text-green-600" />
                    <span className="text-2xl font-bold">{meetingsBookedCount}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {conversionRate}% conversion
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Inbox className="h-5 w-5 text-primary" />
                    <span className="text-2xl font-bold">{replies.length}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="pending" className="gap-2">
                  Pending
                  {pendingCount > 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {pendingCount}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="replied">Replied</TabsTrigger>
                <TabsTrigger value="dismissed">Dismissed</TabsTrigger>
                <TabsTrigger value="all">All</TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="mt-4">
                {filteredReplies.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <Sparkles className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No replies yet</h3>
                      <p className="text-muted-foreground text-center max-w-md">
                        {activeTab === 'pending' 
                          ? "You're all caught up! No pending replies to respond to."
                          : `No ${activeTab} replies found.`}
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {filteredReplies.map((reply) => (
                      <ReplyCard
                        key={reply.id}
                        reply={reply}
                        onClick={() => handleReplyClick(reply)}
                        onDismiss={() => handleDismiss(reply.id)}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </>
        )}

        {selectedReply && (
          <ReplyModal
            open={modalOpen}
            onOpenChange={setModalOpen}
            reply={selectedReply}
            onSuccess={() => {
              fetchReplies();
              setModalOpen(false);
            }}
          />
        )}
      </main>
    </div>
  );
};

export default MasterInbox;
