import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Globe, 
  Loader2, 
  Building2, 
  Target, 
  Award,
  Users,
  Plus,
  Trash2,
  Sparkles,
  X,
  Lightbulb
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PainPointWithSolution {
  pain_point: string;
  solution: string;
  lead_magnet_angle?: string;
}

interface CustomerProfile {
  icp_summary: string;
  pain_points?: string[];
  pain_points_with_solutions?: PainPointWithSolution[];
  services_to_pitch: string[];
  key_benefits: string[];
}

export interface MemoryData {
  id?: string;
  website_url: string;
  company_name: string;
  business_description: string;
  awards_achievements: string;
  outreach_goal: string;
  customer_profiles: CustomerProfile[];
  extracted_at: string | null;
}

interface BusinessProfileMemoryProps {
  memory: MemoryData | null;
  setMemory: (memory: MemoryData | null) => void;
  onSave: () => Promise<void>;
  isSaving: boolean;
}

export function BusinessProfileMemory({ memory, setMemory, onSave, isSaving }: BusinessProfileMemoryProps) {
  const { toast } = useToast();
  const [websiteUrl, setWebsiteUrl] = useState(memory?.website_url || '');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

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

  return (
    <div className="space-y-6">
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
    </div>
  );
}
