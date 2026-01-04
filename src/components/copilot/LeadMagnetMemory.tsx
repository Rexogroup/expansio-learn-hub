import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Mail, 
  Loader2, 
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Target,
  Zap,
  AlertTriangle,
  CheckCircle2,
  XCircle
} from 'lucide-react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JsonValue = any;

interface ScriptAsset {
  id: string;
  title: string;
  content: JsonValue;
  performance_data?: JsonValue;
  status?: string | null;
  created_at?: string;
}

const getContentString = (content: JsonValue, ...keys: string[]): string | undefined => {
  if (!content || typeof content !== 'object') return undefined;
  for (const key of keys) {
    if (content[key] && typeof content[key] === 'string') return content[key];
  }
  return undefined;
};

const getPerformanceNumber = (perfData: JsonValue, ...keys: string[]): number | undefined => {
  if (!perfData || typeof perfData !== 'object') return undefined;
  for (const key of keys) {
    if (typeof perfData[key] === 'number') return perfData[key];
  }
  return undefined;
};

export function LeadMagnetMemory() {
  const [isLoading, setIsLoading] = useState(true);
  const [scripts, setScripts] = useState<ScriptAsset[]>([]);

  useEffect(() => {
    fetchScripts();
  }, []);

  const fetchScripts = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_assets')
        .select('*')
        .eq('user_id', user.id)
        .in('asset_type', ['winning_script', 'losing_script'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        setScripts(data.map(a => ({
          ...a,
          content: typeof a.content === 'string' ? JSON.parse(a.content) : a.content,
          status: a.asset_type === 'winning_script' ? 'winning' : 'losing'
        })));
      }
    } catch (error) {
      console.error('Error fetching scripts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const winningScripts = scripts.filter(s => s.status === 'winning');
  const losingScripts = scripts.filter(s => s.status === 'losing');

  // Calculate aggregate stats
  const avgWinningIR = winningScripts.length > 0
    ? winningScripts.reduce((sum, s) => sum + (getPerformanceNumber(s.performance_data, 'interested_rate', 'interest_rate') || 0), 0) / winningScripts.length
    : 0;
  const avgLosingIR = losingScripts.length > 0
    ? losingScripts.reduce((sum, s) => sum + (getPerformanceNumber(s.performance_data, 'interested_rate', 'interest_rate') || 0), 0) / losingScripts.length
    : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Lead Magnet Memory
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Patterns learned from your outreach scripts based on campaign performance
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchScripts}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-emerald-500/10 border-emerald-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span className="text-sm font-medium">Winning Scripts</span>
            </div>
            <p className="text-2xl font-bold mt-2">{winningScripts.length}</p>
            {avgWinningIR > 0 && (
              <p className="text-xs text-muted-foreground">Avg {avgWinningIR.toFixed(1)}% IR</p>
            )}
          </CardContent>
        </Card>
        <Card className="bg-red-500/10 border-red-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              <span className="text-sm font-medium">Losing Scripts</span>
            </div>
            <p className="text-2xl font-bold mt-2">{losingScripts.length}</p>
            {avgLosingIR > 0 && (
              <p className="text-xs text-muted-foreground">Avg {avgLosingIR.toFixed(1)}% IR</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Win Rate</span>
            </div>
            <p className="text-2xl font-bold mt-2">
              {scripts.length > 0 ? Math.round((winningScripts.length / scripts.length) * 100) : 0}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-medium">Total Analyzed</span>
            </div>
            <p className="text-2xl font-bold mt-2">{scripts.length}</p>
          </CardContent>
        </Card>
      </div>

      {scripts.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Mail className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="font-semibold text-lg mb-2">No Scripts Analyzed Yet</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Scripts are automatically captured when your campaign variants reach 1,000+ emails 
              and meet performance thresholds. Keep sending to unlock insights!
            </p>
            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Target className="h-4 w-4" />
              <span>Target: 15%+ Interested Rate for "Winning"</span>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Winning Scripts - What's Working */}
          <Card className="border-emerald-500/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-500" />
                What's Working
              </CardTitle>
              <CardDescription>
                Scripts achieving 15%+ interested rate and &lt;500 EPL
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-3">
                  {winningScripts.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No winning scripts yet. Keep optimizing!
                    </p>
                  ) : (
                    winningScripts.map(script => (
                      <ScriptCard key={script.id} script={script} isWinning />
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Losing Scripts - What to Avoid */}
          <Card className="border-red-500/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-red-500" />
                What to Avoid
              </CardTitle>
              <CardDescription>
                Scripts with low performance - learn from these patterns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-3">
                  {losingScripts.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No losing scripts captured yet.
                    </p>
                  ) : (
                    losingScripts.map(script => (
                      <ScriptCard key={script.id} script={script} isWinning={false} />
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      )}

      {/* AI Insights */}
      {scripts.length > 0 && (
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              AI Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              {winningScripts.length > 0 && (
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5" />
                  <p>
                    Your winning scripts average <strong>{avgWinningIR.toFixed(1)}% IR</strong>. 
                    Use similar messaging patterns for new campaigns.
                  </p>
                </div>
              )}
              {losingScripts.length > 0 && (
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5" />
                  <p>
                    Avoid patterns from your losing scripts which averaged only <strong>{avgLosingIR.toFixed(1)}% IR</strong>.
                  </p>
                </div>
              )}
              {scripts.length >= 3 && (
                <div className="flex items-start gap-2">
                  <Target className="h-4 w-4 text-primary mt-0.5" />
                  <p>
                    With {scripts.length} scripts analyzed, the Copilot can now provide personalized 
                    recommendations based on your actual performance data.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ScriptCard({ script, isWinning }: { script: ScriptAsset; isWinning: boolean }) {
  const ir = getPerformanceNumber(script.performance_data, 'interested_rate', 'interest_rate');
  const epl = getPerformanceNumber(script.performance_data, 'emails_per_lead', 'epl');
  const campaign = getContentString(script.content, 'campaign_name');
  const body = getContentString(script.content, 'body_content', 'email_body', 'subject_line', 'subject');
  const recommendation = getContentString(script.content, 'recommendation');

  return (
    <div className={`p-3 rounded-lg border ${isWinning ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm truncate">{script.title}</h4>
          {campaign && (
            <p className="text-xs text-muted-foreground truncate">{campaign}</p>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          {ir !== undefined && (
            <Badge variant={isWinning ? 'default' : 'destructive'} className="text-xs">
              {ir.toFixed(1)}% IR
            </Badge>
          )}
          {epl !== undefined && (
            <Badge variant="outline" className="text-xs">
              {Math.round(epl)} EPL
            </Badge>
          )}
        </div>
      </div>
      {body && (
        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
          {body}
        </p>
      )}
      {recommendation && (
        <p className={`text-xs ${isWinning ? 'text-emerald-600' : 'text-red-600'} italic`}>
          💡 {recommendation}
        </p>
      )}
    </div>
  );
}
