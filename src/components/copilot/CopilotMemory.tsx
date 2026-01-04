import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Loader2, 
  Brain, 
  Save,
  Building2,
  Mail,
  MessageSquare,
  Phone
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { BusinessProfileMemory, MemoryData } from './BusinessProfileMemory';
import { LeadMagnetMemory } from './LeadMagnetMemory';
import { AppointmentMemory } from './AppointmentMemory';
import { SalesMemory } from './SalesMemory';

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

export function CopilotMemory() {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [memory, setMemory] = useState<MemoryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');

  useEffect(() => {
    loadMemory();
  }, []);

  const loadMemory = async () => {
    try {
      const { data, error } = await supabase
        .from('copilot_memory')
        .select('*')
        .maybeSingle();

      if (error) throw error;

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
      }
    } catch (error) {
      console.error('Error loading memory:', error);
    } finally {
      setIsLoading(false);
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Brain className="h-6 w-6 text-primary" />
              Copilot Memory
            </h1>
            <p className="text-muted-foreground mt-1">
              Your AI learns from this data to provide personalized guidance at every funnel stage
            </p>
          </div>
          {activeTab === 'profile' && (
            <Button onClick={handleSaveMemory} disabled={isSaving || !memory}>
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Changes
            </Button>
          )}
        </div>

        {/* Tabbed Memory Sections */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 h-auto p-1">
            <TabsTrigger 
              value="profile" 
              className="flex items-center gap-2 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">Business Profile</span>
              <span className="sm:hidden">Profile</span>
            </TabsTrigger>
            <TabsTrigger 
              value="leadmagnets" 
              className="flex items-center gap-2 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Mail className="h-4 w-4" />
              <span className="hidden sm:inline">Lead Magnets</span>
              <span className="sm:hidden">Outreach</span>
            </TabsTrigger>
            <TabsTrigger 
              value="appointments" 
              className="flex items-center gap-2 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Appointments</span>
              <span className="sm:hidden">Booking</span>
            </TabsTrigger>
            <TabsTrigger 
              value="sales" 
              className="flex items-center gap-2 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Phone className="h-4 w-4" />
              <span className="hidden sm:inline">Sales</span>
              <span className="sm:hidden">Calls</span>
            </TabsTrigger>
          </TabsList>

          <div className="mt-6">
            <TabsContent value="profile" className="m-0">
              <BusinessProfileMemory 
                memory={memory}
                setMemory={setMemory}
                onSave={handleSaveMemory}
                isSaving={isSaving}
              />
            </TabsContent>

            <TabsContent value="leadmagnets" className="m-0">
              <LeadMagnetMemory />
            </TabsContent>

            <TabsContent value="appointments" className="m-0">
              <AppointmentMemory />
            </TabsContent>

            <TabsContent value="sales" className="m-0">
              <SalesMemory />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </ScrollArea>
  );
}
