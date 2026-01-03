import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
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
  Sparkles
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CustomerProfile {
  icp_summary: string;
  pain_points: string[];
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

export function CopilotMemory() {
  const { toast } = useToast();
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [memory, setMemory] = useState<MemoryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadMemory();
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
        const profiles = Array.isArray(data.customer_profiles) 
          ? data.customer_profiles as unknown as CustomerProfile[]
          : [];
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
      pain_points: [''],
      services_to_pitch: [''],
      key_benefits: [''],
    };
    updateMemoryField('customer_profiles', [...(memory?.customer_profiles || []), newProfile]);
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
                  <CardContent className="pt-4 space-y-3">
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
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Pain Points</label>
                      <div className="flex flex-wrap gap-2">
                        {profile.pain_points.map((point, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {point || 'Empty'}
                          </Badge>
                        ))}
                      </div>
                      <Input
                        placeholder="Add pain points (comma separated)"
                        className="mt-2"
                        defaultValue={profile.pain_points.join(', ')}
                        onBlur={(e) =>
                          updateCustomerProfile(index, {
                            ...profile,
                            pain_points: e.target.value.split(',').map(s => s.trim()).filter(Boolean),
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Services to Pitch</label>
                      <Input
                        placeholder="Add services (comma separated)"
                        defaultValue={profile.services_to_pitch.join(', ')}
                        onBlur={(e) =>
                          updateCustomerProfile(index, {
                            ...profile,
                            services_to_pitch: e.target.value.split(',').map(s => s.trim()).filter(Boolean),
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Key Benefits</label>
                      <Input
                        placeholder="Add key benefits (comma separated)"
                        defaultValue={profile.key_benefits.join(', ')}
                        onBlur={(e) =>
                          updateCustomerProfile(index, {
                            ...profile,
                            key_benefits: e.target.value.split(',').map(s => s.trim()).filter(Boolean),
                          })
                        }
                      />
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}
