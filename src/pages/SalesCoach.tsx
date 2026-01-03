import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TranscriptUploader } from "@/components/sales-coach/TranscriptUploader";
import { CallAnalysisResult } from "@/components/sales-coach/CallAnalysisResult";
import { ObjectionPlaybook } from "@/components/sales-coach/ObjectionPlaybook";
import { AnalysisHistory } from "@/components/sales-coach/AnalysisHistory";
import { GrowthCopilotSheet } from "@/components/growth/GrowthCopilotSheet";
import { Brain, BookOpen, History } from "lucide-react";

export interface ObjectionAnalysis {
  category: string;
  objection_text: string;
  user_response: string;
  score: number;
  suggested_response: string;
  coaching_notes: string;
}

export interface CRMOverview {
  point_of_contact: { name: string; role: string; email?: string; phone?: string }[];
  marketing_channels: string[];
  kpis: {
    monthly_ad_spend?: { current?: string; target?: string };
    roi?: { current?: string; target?: string };
    roas?: { current?: string; target?: string };
    cpa?: { current?: string; target?: string };
    cac?: { current?: string; target?: string };
    other?: { name: string; value: string }[];
  };
  offer_made: { pricing: string; model: string; details: string };
}

export interface DealAnalysis {
  lead_needs: string[];
  convincing_factors: string[];
  close_confidence_percent: number;
  verbal_agreement: boolean;
  verbal_agreement_quote?: string;
  proposal_key_points: string[];
}

export interface GapSelling {
  current_state: string;
  desired_state: string;
  gap_articulation_score: number;
  gap_feedback: string;
  missed_opportunities: string[];
}

export interface AnalysisResult {
  overall_score: number;
  objections: ObjectionAnalysis[];
  strengths: string[];
  improvements: string[];
  action_items: string[];
  summary: string;
  crm_overview?: CRMOverview;
  deal_analysis?: DealAnalysis;
  gap_selling?: GapSelling;
}

const SalesCoach = () => {
  const navigate = useNavigate();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("analyze");

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
      }
    };
    checkAuth();
  }, [navigate]);

  const handleAnalyze = async (transcript: string, title: string) => {
    setIsAnalyzing(true);
    setAnalysisResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('analyze-sales-call', {
        body: { transcript, title }
      });

      if (error) throw error;

      if (data.success && data.analysis) {
        setAnalysisResult(data.analysis);
        setAnalysisId(data.analysis_id);
      } else {
        throw new Error(data.error || 'Analysis failed');
      }
    } catch (error) {
      console.error('Analysis error:', error);
      throw error;
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleClearAnalysis = () => {
    setAnalysisResult(null);
    setAnalysisId(null);
  };

  return (
    <main className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Sales Coach</h1>
        <p className="text-muted-foreground">
          Analyze call transcripts for AI-powered objection handling and coaching feedback
        </p>
      </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="analyze" className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              Analyze
            </TabsTrigger>
            <TabsTrigger value="playbook" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Playbook
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="analyze" className="space-y-6">
            {!analysisResult ? (
              <TranscriptUploader 
                onAnalyze={handleAnalyze}
                isAnalyzing={isAnalyzing}
              />
            ) : (
              <CallAnalysisResult 
                result={analysisResult}
                analysisId={analysisId}
                onNewAnalysis={handleClearAnalysis}
              />
            )}
          </TabsContent>

          <TabsContent value="playbook">
            <ObjectionPlaybook />
          </TabsContent>

          <TabsContent value="history">
            <AnalysisHistory 
              onViewAnalysis={(result, id) => {
                setAnalysisResult(result);
                setAnalysisId(id);
                setActiveTab("analyze");
              }}
            />
          </TabsContent>
      </Tabs>
      <GrowthCopilotSheet />
    </main>
  );
};

export default SalesCoach;
