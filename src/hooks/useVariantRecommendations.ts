import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

// SOP Thresholds
const SOP_THRESHOLDS = {
  MIN_SAMPLE_SIZE: 1000,
  SCALE: {
    IR_MIN: 15, // 15%+ Interested Rate (Interested/Replies)
    EPL_MAX: 500, // < 500 emails per interested lead
  },
  ITERATE: {
    IR_MIN: 5, // 5-15% IR
    IR_MAX: 15,
    EPL_MIN: 500, // 500-700 EPL
    EPL_MAX: 700,
  },
  KILL: {
    IR_MAX: 5, // < 5% IR
    EPL_MIN: 1000, // > 1000 EPL
  },
};

export interface VariantRecommendation {
  id: string;
  campaignName: string;
  stepNumber: number;
  variantLabel: string;
  emailsSent: number;
  interestedCount: number;
  repliesCount: number;
  ir: number; // Interested Rate (Interested/Replies * 100)
  epl: number; // Emails per Lead
  action: 'SCALE' | 'ITERATE' | 'KILL';
  reason: string;
}

interface WinningScript {
  id: string;
  title: string | null;
  emailBody: string;
}

export function useVariantRecommendations() {
  const [recommendations, setRecommendations] = useState<VariantRecommendation[]>([]);
  const [winningScripts, setWinningScripts] = useState<WinningScript[]>([]);
  const [loading, setLoading] = useState(true);
  const [recentVolume, setRecentVolume] = useState<number>(0);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Fetch all data in parallel
      const [variantsResult, scriptsResult, metricsResult] = await Promise.all([
        // Get 30-day variant data
        supabase
          .from('campaign_variants')
          .select(`
            id,
            variant_label,
            step_number,
            emails_sent,
            interested_count,
            unique_replies,
            synced_campaigns!inner(campaign_name, user_id, timeline_days)
          `)
          .eq('synced_campaigns.user_id', session.user.id)
          .eq('synced_campaigns.timeline_days', 30)
          .gte('emails_sent', SOP_THRESHOLDS.MIN_SAMPLE_SIZE),
        
        // Get winning scripts for reference
        supabase
          .from('user_assets')
          .select('id, title, content')
          .eq('user_id', session.user.id)
          .eq('asset_type', 'winning_script')
          .limit(3),
        
        // Get recent daily volume (last 7 days from synced_campaigns)
        supabase
          .from('synced_campaigns')
          .select('emails_sent')
          .eq('user_id', session.user.id)
          .eq('timeline_days', 10),
      ]);

      // Process winning scripts
      if (scriptsResult.data) {
        setWinningScripts(scriptsResult.data.map(s => {
          const content = s.content as { email_body?: string } | null;
          return {
            id: s.id,
            title: s.title,
            emailBody: content?.email_body || '',
          };
        }));
      }

      // Calculate recent volume
      if (metricsResult.data) {
        const totalEmails = metricsResult.data.reduce((sum, c) => sum + (c.emails_sent || 0), 0);
        setRecentVolume(totalEmails);
      }

      // Process variant recommendations
      if (variantsResult.data) {
        const recs: VariantRecommendation[] = [];

        for (const variant of variantsResult.data) {
          const campaign = variant.synced_campaigns as unknown as { campaign_name: string };
          const emailsSent = variant.emails_sent || 0;
          const interested = variant.interested_count || 0;
          const replies = variant.unique_replies || 0;

          // Calculate IR (Interested / Replies * 100) - SOP standard
          const ir = replies > 0 ? (interested / replies) * 100 : 0;
          // Calculate EPL (Emails Sent / Interested)
          const epl = interested > 0 ? emailsSent / interested : 9999;

          let action: 'SCALE' | 'ITERATE' | 'KILL';
          let reason: string;

          // Apply SOP thresholds
          if (ir >= SOP_THRESHOLDS.SCALE.IR_MIN && epl < SOP_THRESHOLDS.SCALE.EPL_MAX) {
            action = 'SCALE';
            reason = `${ir.toFixed(1)}% IR with ${Math.round(epl)} EPL - top performer, add volume`;
          } else if (ir < SOP_THRESHOLDS.KILL.IR_MAX || epl > SOP_THRESHOLDS.KILL.EPL_MIN) {
            action = 'KILL';
            reason = ir < SOP_THRESHOLDS.KILL.IR_MAX 
              ? `Only ${ir.toFixed(1)}% IR after ${emailsSent.toLocaleString()} emails - rewrite needed`
              : `${Math.round(epl)} EPL is burning budget - pause and iterate`;
          } else {
            action = 'ITERATE';
            reason = `${ir.toFixed(1)}% IR, ${Math.round(epl)} EPL - near benchmark, test improvements`;
          }

          recs.push({
            id: variant.id,
            campaignName: campaign?.campaign_name || 'Campaign',
            stepNumber: variant.step_number || 1,
            variantLabel: variant.variant_label || 'A',
            emailsSent,
            interestedCount: interested,
            repliesCount: replies,
            ir,
            epl,
            action,
            reason,
          });
        }

        // Sort: KILL (critical) first, then SCALE (high), then ITERATE (normal)
        const priority = { KILL: 0, SCALE: 1, ITERATE: 2 };
        recs.sort((a, b) => priority[a.action] - priority[b.action]);

        setRecommendations(recs);
      }
    } catch (error) {
      console.error('Error fetching variant recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  return {
    recommendations,
    winningScripts,
    recentVolume,
    loading,
    thresholds: SOP_THRESHOLDS,
    refresh: fetchData,
  };
}
