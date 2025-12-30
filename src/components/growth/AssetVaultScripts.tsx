import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { TrendingUp, TrendingDown, ChevronDown, Mail, Target, Zap, Lock, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface ScriptAsset {
  id: string;
  title: string;
  content: string;
  performance_data: {
    emails_sent: number;
    interested_rate: number;
    emails_per_lead: number | null;
    classification: string;
    classification_reason: string;
    captured_at: string;
  };
  asset_type: 'winning_script' | 'losing_script';
  created_at: string;
}

interface AssetVaultScriptsProps {
  className?: string;
  refreshKey?: number;
  onRefreshComplete?: () => void;
}

export function AssetVaultScripts({ className, refreshKey, onRefreshComplete }: AssetVaultScriptsProps) {
  const [scripts, setScripts] = useState<ScriptAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchScripts();
  }, [refreshKey]);

  const fetchScripts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_assets')
        .select('id, title, content, performance_data, asset_type, created_at')
        .eq('user_id', user.id)
        .in('asset_type', ['winning_script', 'losing_script'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setScripts((data || []).map(item => ({
        id: item.id,
        title: item.title,
        content: typeof item.content === 'string' ? item.content : JSON.stringify(item.content),
        performance_data: item.performance_data as ScriptAsset['performance_data'],
        asset_type: item.asset_type as 'winning_script' | 'losing_script',
        created_at: item.created_at
      })));
    } catch (err) {
      console.error('Error fetching script assets:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshAILearning = async () => {
    setIsRefreshing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Not authenticated');
        return;
      }

      const response = await supabase.functions.invoke('classify-scripts', {
        body: { user_id: user.id },
      });

      if (response.error) throw response.error;

      const result = response.data;
      if (result.scripts_saved > 0) {
        toast.success(`AI learned from ${result.scripts_saved} new script(s)`);
      } else {
        toast.info('No new scripts to learn from');
      }
      
      await fetchScripts();
      onRefreshComplete?.();
    } catch (err) {
      console.error('Error refreshing AI learning:', err);
      toast.error('Failed to refresh AI learning');
    } finally {
      setIsRefreshing(false);
    }
  };

  const winningScripts = scripts.filter(s => s.asset_type === 'winning_script');
  const losingScripts = scripts.filter(s => s.asset_type === 'losing_script');

  const parseContent = (content: string): { subject_line?: string; email_body?: string; campaign_name?: string; step_number?: number; variant_label?: string } => {
    try {
      return typeof content === 'string' ? JSON.parse(content) : content;
    } catch {
      return {};
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Lock className="w-4 h-4" />
            AI Learning Vault
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-12 bg-muted rounded"></div>
            <div className="h-12 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (scripts.length === 0) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Lock className="w-4 h-4" />
            AI Learning Vault
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground text-center py-2">
            No scripts captured yet. After your campaigns send 1000+ emails, top and underperforming scripts will be automatically saved here.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={handleRefreshAILearning}
            disabled={isRefreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Analyzing...' : 'Analyze Scripts Now'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Lock className="w-4 h-4" />
            AI Learning Vault
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {scripts.length} captured
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleRefreshAILearning}
              disabled={isRefreshing}
              title="Refresh AI Learning"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Proprietary scripts powering your personalized AI Copilot
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Winning Scripts */}
        {winningScripts.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <span className="text-sm font-medium text-green-600 dark:text-green-400">
                Winning Scripts ({winningScripts.length})
              </span>
            </div>
            <ScrollArea className="max-h-48">
              <div className="space-y-2">
                {winningScripts.map((script) => {
                  const content = parseContent(script.content);
                  const perf = script.performance_data;
                  return (
                    <Collapsible
                      key={script.id}
                      open={expandedId === script.id}
                      onOpenChange={(open) => setExpandedId(open ? script.id : null)}
                    >
                      <CollapsibleTrigger className="w-full">
                        <div className="flex items-center justify-between p-2 rounded-lg bg-green-500/5 border border-green-500/20 hover:bg-green-500/10 transition-colors">
                          <div className="flex items-center gap-2 text-left">
                            <Badge variant="outline" className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30 text-xs">
                              SCALE
                            </Badge>
                            <span className="text-sm font-medium truncate max-w-[180px]">
                              {script.title}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              {perf.interested_rate?.toFixed(1)}% IR
                            </span>
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="mt-2 p-3 rounded-lg bg-muted/50 space-y-2 text-sm">
                          {content.subject_line && (
                            <div className="flex items-start gap-2">
                              <Mail className="w-3.5 h-3.5 mt-0.5 text-muted-foreground" />
                              <span className="text-muted-foreground">
                                Subject: <span className="text-foreground">"{content.subject_line}"</span>
                              </span>
                            </div>
                          )}
                          {content.email_body && (
                            <div className="mt-2 p-2 bg-background/50 rounded border text-xs text-foreground/80">
                              <span className="text-muted-foreground font-medium">Offer:</span> {content.email_body.substring(0, 200)}{content.email_body.length > 200 ? '...' : ''}
                            </div>
                          )}
                          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Target className="w-3 h-3" />
                              {perf.emails_sent?.toLocaleString()} sent
                            </span>
                            <span className="flex items-center gap-1">
                              <Zap className="w-3 h-3" />
                              {perf.emails_per_lead || 'N/A'} emails/lead
                            </span>
                          </div>
                          <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                            ✓ {perf.classification_reason}
                          </p>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Losing Scripts */}
        {losingScripts.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="w-4 h-4 text-red-500" />
              <span className="text-sm font-medium text-red-600 dark:text-red-400">
                Scripts to Avoid ({losingScripts.length})
              </span>
            </div>
            <ScrollArea className="max-h-48">
              <div className="space-y-2">
                {losingScripts.map((script) => {
                  const content = parseContent(script.content);
                  const perf = script.performance_data;
                  return (
                    <Collapsible
                      key={script.id}
                      open={expandedId === script.id}
                      onOpenChange={(open) => setExpandedId(open ? script.id : null)}
                    >
                      <CollapsibleTrigger className="w-full">
                        <div className="flex items-center justify-between p-2 rounded-lg bg-red-500/5 border border-red-500/20 hover:bg-red-500/10 transition-colors">
                          <div className="flex items-center gap-2 text-left">
                            <Badge variant="outline" className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30 text-xs">
                              KILL
                            </Badge>
                            <span className="text-sm font-medium truncate max-w-[180px]">
                              {script.title}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              {perf.interested_rate?.toFixed(1)}% IR
                            </span>
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="mt-2 p-3 rounded-lg bg-muted/50 space-y-2 text-sm">
                          {content.subject_line && (
                            <div className="flex items-start gap-2">
                              <Mail className="w-3.5 h-3.5 mt-0.5 text-muted-foreground" />
                              <span className="text-muted-foreground">
                                Subject: <span className="text-foreground">"{content.subject_line}"</span>
                              </span>
                            </div>
                          )}
                          {content.email_body && (
                            <div className="mt-2 p-2 bg-background/50 rounded border text-xs text-foreground/80">
                              <span className="text-muted-foreground font-medium">Offer:</span> {content.email_body.substring(0, 200)}{content.email_body.length > 200 ? '...' : ''}
                            </div>
                          )}
                          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Target className="w-3 h-3" />
                              {perf.emails_sent?.toLocaleString()} sent
                            </span>
                            <span className="flex items-center gap-1">
                              <Zap className="w-3 h-3" />
                              {perf.emails_per_lead || 'N/A'} emails/lead
                            </span>
                          </div>
                          <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                            ✗ {perf.classification_reason}
                          </p>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Security Notice */}
        <div className="flex items-center gap-2 pt-2 border-t text-xs text-muted-foreground">
          <Lock className="w-3 h-3" />
          <span>These scripts are proprietary assets that enhance your AI Copilot. They cannot be downloaded.</span>
        </div>
      </CardContent>
    </Card>
  );
}
