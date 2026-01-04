import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Globe, 
  Loader2, 
  Brain, 
  Building2, 
  Target, 
  Award,
  Users,
  Plus,
  Trash2,
  Save,
  Sparkles,
  ChevronDown,
  RefreshCw,
  Mail,
  MessageSquare,
  Phone,
  X,
  Lightbulb
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { LearningStageDisplay } from '@/components/ai-brain/LearningStageDisplay';
import { QuickStatsBar } from '@/components/ai-brain/QuickStatsBar';
import { CategorySection } from '@/components/ai-brain/CategorySection';
import { SimpleScriptCard } from '@/components/ai-brain/SimpleScriptCard';
import { SimpleReplyCard } from '@/components/ai-brain/SimpleReplyCard';
import { SimpleObjectionCard } from '@/components/ai-brain/SimpleObjectionCard';
import { UnifiedEmptyState } from '@/components/ai-brain/UnifiedEmptyState';

interface PainPointWithSolution {
  pain_point: string;
  solution: string;
  lead_magnet_angle?: string;
}

interface CustomerProfile {
  icp_summary: string;
  pain_points?: string[];  // Legacy format for backward compat
  pain_points_with_solutions?: PainPointWithSolution[];  // New enhanced format
  services_to_pitch: string[];
  key_benefits: string[];
}

interface MemoryData {
  id?: string;
  website_url: string;
  company_name: string;
  business_description: string;
  awards_achievements: string;
  outreach_goal: string;
  customer_profiles: CustomerProfile[];
  extracted_at: string | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JsonValue = any;

interface ScriptAsset {
  id: string;
  title: string;
  content: JsonValue;
  performance_data?: JsonValue;
  status?: string | null;
}

interface ReplyAsset {
  id: string;
  title: string;
  content: JsonValue;
  status?: string | null;
}

interface ObjectionCluster {
  id: string;
  cluster_name: string;
  category: string;
  total_occurrences: number | null;
  avg_handling_score: number | null;
  best_response: string | null;
  difficulty_level: string | null;
  summary: string | null;
  rebuttal_framework: string | null;
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

export function CopilotMemory() {
  const { toast } = useToast();
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [memory, setMemory] = useState<MemoryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [brainOpen, setBrainOpen] = useState(true);

  // AI Brain state
  const [brainLoading, setBrainLoading] = useState(false);
  const [scripts, setScripts] = useState<ScriptAsset[]>([]);
  const [replyAssets, setReplyAssets] = useState<ReplyAsset[]>([]);
  const [objectionClusters, setObjectionClusters] = useState<ObjectionCluster[]>([]);
  const [callCount, setCallCount] = useState(0);

  useEffect(() => {
    loadMemory();
    fetchBrainData();
  }, []);

  const loadMemory = async () => {
    try {
      const { data, error } = await supabase
        .from('copilot_memory')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        const rawProfiles = Array.isArray(data.customer_profiles) 
          ? data.customer_profiles as unknown as CustomerProfile[]
          : [];
        
        // Normalize profiles: convert legacy pain_points to pain_points_with_solutions
        const profiles = rawProfiles.map(p => ({
          ...p,
          pain_points_with_solutions: p.pain_points_with_solutions || 
            (p.pain_points || []).map(pp => ({ pain_point: pp, solution: '', lead_magnet_angle: '' })),
        }));

        setMemory({
          id: data.id,
          website_url: data.website_url || '',
          company_name: data.company_name || '',
          business_description: data.business_description || '',
          awards_achievements: data.awards_achievements || '',
          outreach_goal: data.outreach_goal || '',
          customer_profiles: profiles,
          extracted_at: data.extracted_at,
        });
        setWebsiteUrl(data.website_url || '');
      }
    } catch (error) {
      console.error('Error loading memory:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBrainData = async () => {
    setBrainLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [assetsResponse, clustersResponse, callsResponse] = await Promise.all([
        supabase
          .from("user_assets")
          .select("*")
          .eq("user_id", user.id)
          .in("asset_type", ["winning_script", "losing_script", "winning_reply", "losing_reply"]),
        supabase
          .from("objection_clusters")
          .select("*")
          .eq("user_id", user.id)
          .order("total_occurrences", { ascending: false }),
        supabase
          .from("call_analyses")
          .select("id")
          .eq("user_id", user.id)
      ]);

      if (assetsResponse.data) {
        const scriptAssets = assetsResponse.data.filter(a => 
          a.asset_type === "winning_script" || a.asset_type === "losing_script"
        );
        const replyAssetData = assetsResponse.data.filter(a => 
          a.asset_type === "winning_reply" || a.asset_type === "losing_reply"
        );
        
        setScripts(scriptAssets.map(a => ({
          ...a,
          content: typeof a.content === 'string' ? JSON.parse(a.content) : a.content,
          status: a.asset_type === "winning_script" ? "winning" : "losing"
        })));
        
        setReplyAssets(replyAssetData.map(a => ({
          ...a,
          content: typeof a.content === 'string' ? JSON.parse(a.content) : a.content,
          status: a.asset_type === "winning_reply" ? "winning" : "losing"
        })));
      }

      if (clustersResponse.data) {
        setObjectionClusters(clustersResponse.data);
      }

      if (callsResponse.data) {
        setCallCount(callsResponse.data.length);
      }
    } catch (error) {
      console.error("Error fetching AI brain data:", error);
    } finally {
      setBrainLoading(false);
    }
  };

  const handleAnalyzeWebsite = async () => {
    if (!websiteUrl.trim()) {
      toast({ title: 'Please enter a website URL', variant: 'destructive' });
      return;
    }

    setIsAnalyzing(true);

    try {
      const { data, error } = await supabase.functions.invoke('read-website', {
        body: { url: websiteUrl },
      });

      if (error) throw error;

      if (data.success) {
        setMemory({
          website_url: data.data.website_url,
          company_name: data.data.company_name || '',
          business_description: data.data.business_description || '',
          awards_achievements: data.data.awards_achievements || '',
          outreach_goal: data.data.outreach_goal || '',
          customer_profiles: data.data.customer_profiles || [],
          extracted_at: new Date().toISOString(),
        });
        toast({ title: 'Website analyzed successfully!' });
      } else {
        throw new Error(data.error || 'Failed to analyze website');
      }
    } catch (error: any) {
      console.error('Error analyzing website:', error);
      toast({
        title: 'Analysis failed',
        description: error.message || 'Could not analyze the website',
        variant: 'destructive',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveMemory = async () => {
    if (!memory) return;

    setIsSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const memoryData = {
        user_id: user.id,
        website_url: memory.website_url,
        company_name: memory.company_name,
        business_description: memory.business_description,
        awards_achievements: memory.awards_achievements,
        outreach_goal: memory.outreach_goal,
        customer_profiles: memory.customer_profiles as unknown as Json,
        extracted_at: memory.extracted_at,
      };

      const { error } = await supabase
        .from('copilot_memory')
        .upsert(memoryData, { onConflict: 'user_id' });

      if (error) throw error;

      toast({ title: 'Memory saved successfully!' });
    } catch (error: any) {
      console.error('Error saving memory:', error);
      toast({
        title: 'Save failed',
        description: error.message || 'Could not save memory',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const updateMemoryField = (field: keyof MemoryData, value: any) => {
    if (!memory) {
      setMemory({
        website_url: '',
        company_name: '',
        business_description: '',
        awards_achievements: '',
        outreach_goal: '',
        customer_profiles: [],
        extracted_at: null,
        [field]: value,
      });
    } else {
      setMemory({ ...memory, [field]: value });
    }
  };

  const addCustomerProfile = () => {
    const newProfile: CustomerProfile = {
      icp_summary: '',
      pain_points_with_solutions: [],
      services_to_pitch: [],
      key_benefits: [],
    };
    updateMemoryField('customer_profiles', [...(memory?.customer_profiles || []), newProfile]);
  };

  // Pain point management for a specific ICP
  const addPainPointToProfile = (profileIndex: number) => {
    const profiles = [...(memory?.customer_profiles || [])];
    const profile = profiles[profileIndex];
    const painPoints = profile.pain_points_with_solutions || [];
    profiles[profileIndex] = {
      ...profile,
      pain_points_with_solutions: [...painPoints, { pain_point: '', solution: '', lead_magnet_angle: '' }],
    };
    updateMemoryField('customer_profiles', profiles);
  };

  const updatePainPoint = (profileIndex: number, painIndex: number, field: keyof PainPointWithSolution, value: string) => {
    const profiles = [...(memory?.customer_profiles || [])];
    const profile = profiles[profileIndex];
    const painPoints = [...(profile.pain_points_with_solutions || [])];
    painPoints[painIndex] = { ...painPoints[painIndex], [field]: value };
    profiles[profileIndex] = { ...profile, pain_points_with_solutions: painPoints };
    updateMemoryField('customer_profiles', profiles);
  };

  const removePainPoint = (profileIndex: number, painIndex: number) => {
    const profiles = [...(memory?.customer_profiles || [])];
    const profile = profiles[profileIndex];
    const painPoints = [...(profile.pain_points_with_solutions || [])];
    painPoints.splice(painIndex, 1);
    profiles[profileIndex] = { ...profile, pain_points_with_solutions: painPoints };
    updateMemoryField('customer_profiles', profiles);
  };

  // Chip array management (services, benefits)
  const addChipToProfile = (profileIndex: number, field: 'services_to_pitch' | 'key_benefits', value: string) => {
    if (!value.trim()) return;
    const profiles = [...(memory?.customer_profiles || [])];
    const profile = profiles[profileIndex];
    const items = [...(profile[field] || [])];
    items.push(value.trim());
    profiles[profileIndex] = { ...profile, [field]: items };
    updateMemoryField('customer_profiles', profiles);
  };

  const removeChipFromProfile = (profileIndex: number, field: 'services_to_pitch' | 'key_benefits', chipIndex: number) => {
    const profiles = [...(memory?.customer_profiles || [])];
    const profile = profiles[profileIndex];
    const items = [...(profile[field] || [])];
    items.splice(chipIndex, 1);
    profiles[profileIndex] = { ...profile, [field]: items };
    updateMemoryField('customer_profiles', profiles);
  };

  const updateCustomerProfile = (index: number, profile: CustomerProfile) => {
    const profiles = [...(memory?.customer_profiles || [])];
    profiles[index] = profile;
    updateMemoryField('customer_profiles', profiles);
  };

  const removeCustomerProfile = (index: number) => {
    const profiles = [...(memory?.customer_profiles || [])];
    profiles.splice(index, 1);
    updateMemoryField('customer_profiles', profiles);
  };

  // AI Brain calculations
  const winningScripts = scripts.filter(s => s.status === "winning");
  const losingScripts = scripts.filter(s => s.status === "losing");
  const winningReplies = replyAssets.filter(r => r.status === "winning");
  const losingReplies = replyAssets.filter(r => r.status === "losing");
  const masteredObjections = objectionClusters.filter(o => (o.avg_handling_score || 0) >= 7);
  const needsWorkObjections = objectionClusters.filter(o => (o.avg_handling_score || 0) < 7);
  const totalPatterns = scripts.length + replyAssets.length + objectionClusters.length;
  const hasAnyBrainData = totalPatterns > 0 || callCount > 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Brain className="h-6 w-6 text-primary" />
              Copilot Memory
            </h1>
            <p className="text-muted-foreground mt-1">
              Your AI assistant learns from this information to provide personalized guidance
            </p>
          </div>
          <Button onClick={handleSaveMemory} disabled={isSaving || !memory}>
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>

        {/* Website Analyzer Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Globe className="h-5 w-5 text-primary" />
              Read Your Website
            </CardTitle>
            <CardDescription>
              Enter your website URL and let AI extract your business information automatically
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Input
                placeholder="https://yourwebsite.com"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                className="flex-1"
              />
              <Button onClick={handleAnalyzeWebsite} disabled={isAnalyzing}>
                {isAnalyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Analyze
                  </>
                )}
              </Button>
            </div>
            {memory?.extracted_at && (
              <p className="text-xs text-muted-foreground mt-2">
                Last analyzed: {new Date(memory.extracted_at).toLocaleDateString()}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Business Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="h-5 w-5 text-primary" />
              Business Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Company Name</label>
                <Input
                  placeholder="Your company name"
                  value={memory?.company_name || ''}
                  onChange={(e) => updateMemoryField('company_name', e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Website URL</label>
                <Input
                  placeholder="https://yourwebsite.com"
                  value={memory?.website_url || ''}
                  onChange={(e) => updateMemoryField('website_url', e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Business Description</label>
              <Textarea
                placeholder="Describe what your business does, your main services, and value proposition..."
                value={memory?.business_description || ''}
                onChange={(e) => updateMemoryField('business_description', e.target.value)}
                rows={3}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block flex items-center gap-2">
                <Award className="h-4 w-4 text-amber-500" />
                Awards & Achievements
              </label>
              <Textarea
                placeholder="Notable awards, certifications, or trust signals..."
                value={memory?.awards_achievements || ''}
                onChange={(e) => updateMemoryField('awards_achievements', e.target.value)}
                rows={2}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                Outreach Goal
              </label>
              <Input
                placeholder="e.g., Book discovery calls with marketing agencies"
                value={memory?.outreach_goal || ''}
                onChange={(e) => updateMemoryField('outreach_goal', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Customer Profiles */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Users className="h-5 w-5 text-primary" />
                  Customer Profiles (ICPs)
                </CardTitle>
                <CardDescription>
                  Define your ideal customer profiles for targeted outreach
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={addCustomerProfile}>
                <Plus className="h-4 w-4 mr-1" />
                Add ICP
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {(!memory?.customer_profiles || memory.customer_profiles.length === 0) ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No customer profiles yet</p>
                <p className="text-sm">Add your first ICP or analyze your website to auto-generate</p>
              </div>
            ) : (
              memory.customer_profiles.map((profile, index) => (
                <Card key={index} className="bg-muted/50">
                  <CardContent className="pt-4 space-y-4">
                    {/* ICP Summary */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <label className="text-sm font-medium mb-1.5 block">ICP Summary</label>
                        <Input
                          placeholder="e.g., SaaS companies with 50-200 employees"
                          value={profile.icp_summary}
                          onChange={(e) =>
                            updateCustomerProfile(index, { ...profile, icp_summary: e.target.value })
                          }
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => removeCustomerProfile(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Pain Points with Solutions */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium flex items-center gap-1.5">
                          <Target className="h-3.5 w-3.5 text-destructive" />
                          Pain Points & Solutions
                        </label>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => addPainPointToProfile(index)}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add
                        </Button>
                      </div>
                      
                      {(profile.pain_points_with_solutions || []).length === 0 ? (
                        <p className="text-xs text-muted-foreground italic py-2">
                          No pain points yet. Add one or analyze your website.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {(profile.pain_points_with_solutions || []).map((pp, ppIndex) => (
                            <div key={ppIndex} className="p-3 rounded-md border bg-background space-y-2">
                              <div className="flex items-start gap-2">
                                <Badge variant="destructive" className="text-[10px] px-1.5 py-0 shrink-0 mt-0.5">
                                  Problem
                                </Badge>
                                <Input
                                  className="h-7 text-sm flex-1"
                                  placeholder="Pain point..."
                                  value={pp.pain_point}
                                  onChange={(e) => updatePainPoint(index, ppIndex, 'pain_point', e.target.value)}
                                />
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                                  onClick={() => removePainPoint(index, ppIndex)}
                                >
                                  <X className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                              <div className="flex items-start gap-2">
                                <Badge className="text-[10px] px-1.5 py-0 shrink-0 mt-0.5 bg-emerald-600">
                                  <Lightbulb className="h-2.5 w-2.5 mr-0.5" />
                                  Solution
                                </Badge>
                                <Input
                                  className="h-7 text-sm flex-1"
                                  placeholder="How you solve it..."
                                  value={pp.solution}
                                  onChange={(e) => updatePainPoint(index, ppIndex, 'solution', e.target.value)}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Services to Pitch */}
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Services to Pitch</label>
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {(profile.services_to_pitch || []).map((service, sIndex) => (
                          <Badge key={sIndex} variant="secondary" className="pr-1 gap-1">
                            {service}
                            <button
                              onClick={() => removeChipFromProfile(index, 'services_to_pitch', sIndex)}
                              className="hover:bg-muted rounded-full p-0.5"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                      <Input
                        placeholder="Type and press Enter to add..."
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addChipToProfile(index, 'services_to_pitch', e.currentTarget.value);
                            e.currentTarget.value = '';
                          }
                        }}
                      />
                    </div>

                    {/* Key Benefits */}
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Key Benefits</label>
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {(profile.key_benefits || []).map((benefit, bIndex) => (
                          <Badge key={bIndex} variant="outline" className="pr-1 gap-1">
                            {benefit}
                            <button
                              onClick={() => removeChipFromProfile(index, 'key_benefits', bIndex)}
                              className="hover:bg-muted rounded-full p-0.5"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                      <Input
                        placeholder="Type and press Enter to add..."
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addChipToProfile(index, 'key_benefits', e.currentTarget.value);
                            e.currentTarget.value = '';
                          }
                        }}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </CardContent>
        </Card>

        {/* AI Learning Insights Section */}
        <Card className="border-primary/20">
          <Collapsible open={brainOpen} onOpenChange={setBrainOpen}>
            <CardHeader className="pb-2">
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full p-2 bg-primary/10">
                      <Brain className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">AI Learning Insights</CardTitle>
                      <CardDescription>
                        Patterns learned from your outreach, replies, and sales calls
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); fetchBrainData(); }}
                      disabled={brainLoading}
                    >
                      <RefreshCw className={`h-4 w-4 ${brainLoading ? "animate-spin" : ""}`} />
                    </Button>
                    <ChevronDown className={`h-5 w-5 transition-transform ${brainOpen ? 'rotate-180' : ''}`} />
                  </div>
                </div>
              </CollapsibleTrigger>
            </CardHeader>

            <CollapsibleContent>
              <CardContent className="space-y-6 pt-4">
                {!hasAnyBrainData ? (
                  <UnifiedEmptyState 
                    hasScripts={scripts.length > 0}
                    hasReplies={replyAssets.length > 0}
                    hasCalls={callCount > 0}
                  />
                ) : (
                  <>
                    {/* Learning Stage Display */}
                    <LearningStageDisplay
                      scriptsCount={scripts.length}
                      repliesCount={replyAssets.length}
                      objectionsCount={objectionClusters.length}
                      callCount={callCount}
                    />

                    {/* Quick Stats */}
                    <QuickStatsBar
                      winningScripts={winningScripts.length}
                      losingScripts={losingScripts.length}
                      winningReplies={winningReplies.length}
                      losingReplies={losingReplies.length}
                      masteredObjections={masteredObjections.length}
                      needsWorkObjections={needsWorkObjections.length}
                      totalCalls={callCount}
                    />

                    {/* Three Column Layout */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Outreach Column */}
                      <div className="p-3 rounded-lg border border-border/50 bg-card">
                        <CategorySection
                          title="Outreach"
                          icon={Mail}
                          winCount={winningScripts.length}
                          loseCount={losingScripts.length}
                          emptyState={
                            <p className="text-xs text-muted-foreground text-center py-4">
                              Send 1,000+ emails to unlock script analysis
                            </p>
                          }
                        >
                          {[...winningScripts, ...losingScripts].slice(0, 2).map(script => (
                            <SimpleScriptCard
                              key={script.id}
                              title={script.title}
                              campaign={getContentString(script.content, 'campaign_name')}
                              interestedRate={getPerformanceNumber(script.performance_data, 'interested_rate', 'interest_rate')}
                              emailsPerLead={getPerformanceNumber(script.performance_data, 'emails_per_lead', 'epl')}
                              content={getContentString(script.content, 'body_content', 'email_body', 'subject_line', 'subject')}
                              isWinning={script.status === "winning"}
                              recommendation={getContentString(script.content, 'recommendation')}
                            />
                          ))}
                        </CategorySection>
                      </div>

                      {/* Booking Column */}
                      <div className="p-3 rounded-lg border border-border/50 bg-card">
                        <CategorySection
                          title="Booking"
                          icon={MessageSquare}
                          winCount={winningReplies.length}
                          loseCount={losingReplies.length}
                          winLabel="Booked"
                          loseLabel="Failed"
                          emptyState={
                            <p className="text-xs text-muted-foreground text-center py-4">
                              Mark outcomes in Master Inbox to learn patterns
                            </p>
                          }
                        >
                          {[...winningReplies, ...losingReplies].slice(0, 2).map(reply => (
                            <SimpleReplyCard
                              key={reply.id}
                              title={reply.title}
                              content={getContentString(reply.content, 'message_content', 'sent_message', 'message')}
                              isWinning={reply.status === "winning"}
                              replyType={getContentString(reply.content, 'reply_type')}
                            />
                          ))}
                        </CategorySection>
                      </div>

                      {/* Sales Column */}
                      <div className="p-3 rounded-lg border border-border/50 bg-card">
                        <CategorySection
                          title="Sales"
                          icon={Phone}
                          winCount={masteredObjections.length}
                          loseCount={needsWorkObjections.length}
                          winLabel="Mastered"
                          loseLabel="Need Work"
                          emptyState={
                            <p className="text-xs text-muted-foreground text-center py-4">
                              Analyze sales calls to identify objections
                            </p>
                          }
                        >
                          {[...masteredObjections, ...needsWorkObjections].slice(0, 2).map(cluster => (
                            <SimpleObjectionCard
                              key={cluster.id}
                              clusterName={cluster.cluster_name}
                              category={cluster.category}
                              avgScore={cluster.avg_handling_score || 0}
                              occurrences={cluster.total_occurrences || 0}
                              bestResponse={cluster.best_response || cluster.rebuttal_framework || undefined}
                              difficultyLevel={cluster.difficulty_level || undefined}
                            />
                          ))}
                        </CategorySection>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      </div>
    </ScrollArea>
  );
}
