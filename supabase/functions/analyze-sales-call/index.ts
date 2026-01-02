import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const OBJECTION_CATEGORIES = [
  'Price/Budget',
  'Timing',
  'Competition',
  'Authority',
  'Need',
  'Trust',
  'Stall',
  'Other'
];

interface ObjectionAnalysis {
  category: string;
  objection_text: string;
  user_response: string;
  score: number;
  suggested_response: string;
  coaching_notes: string;
}

interface CRMOverview {
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

interface DealAnalysis {
  lead_needs: string[];
  convincing_factors: string[];
  close_confidence_percent: number;
  verbal_agreement: boolean;
  verbal_agreement_quote?: string;
  proposal_key_points: string[];
}

interface GapSelling {
  current_state: string;
  desired_state: string;
  gap_articulation_score: number;
  gap_feedback: string;
  missed_opportunities: string[];
}

interface AnalysisResult {
  overall_score: number;
  objections: ObjectionAnalysis[];
  strengths: string[];
  improvements: string[];
  action_items: string[];
  summary: string;
  crm_overview: CRMOverview;
  deal_analysis: DealAnalysis;
  gap_selling: GapSelling;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { transcript, title } = await req.json();
    
    if (!transcript || transcript.trim().length < 100) {
      return new Response(JSON.stringify({ error: 'Transcript too short or empty' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Analyzing sales call for user ${user.id}, title: ${title}`);

    // Fetch admin knowledge base for sales frameworks
    const { data: knowledgeBase } = await supabaseClient
      .from('knowledge_base_documents')
      .select('title, extracted_content, category')
      .in('category', ['framework', 'sales_objections', 'appointment_setting'])
      .eq('is_active', true)
      .limit(10);

    // Fetch user's existing objection assets for learning
    const { data: existingObjections } = await supabaseClient
      .from('user_assets')
      .select('title, content, performance_data')
      .eq('user_id', user.id)
      .eq('asset_type', 'objection')
      .limit(20);

    // Build knowledge context
    let knowledgeContext = '';
    if (knowledgeBase && knowledgeBase.length > 0) {
      knowledgeContext = knowledgeBase
        .map(doc => `### ${doc.title}\n${(doc.extracted_content || '').slice(0, 2000)}`)
        .join('\n\n');
    }

    let objectionContext = '';
    if (existingObjections && existingObjections.length > 0) {
      objectionContext = existingObjections
        .map(obj => {
          const content = obj.content as any;
          return `- ${content?.objection_category || 'Unknown'}: "${content?.objection_text || obj.title}" → Best response: "${content?.suggested_response || 'N/A'}"`;
        })
        .join('\n');
    }

    const systemPrompt = `You are the most experienced sales manager in the world with deep expertise in B2B sales, GAP Selling methodology, and objection handling. Analyze this sales call transcript and provide comprehensive coaching feedback.

OBJECTION CATEGORIES TO USE:
${OBJECTION_CATEGORIES.join(', ')}

${knowledgeContext ? `REFERENCE FRAMEWORKS:\n${knowledgeContext}\n` : ''}

${objectionContext ? `USER'S PREVIOUS OBJECTIONS (for context on patterns):\n${objectionContext}\n` : ''}

ANALYSIS INSTRUCTIONS:

1. CRM QUICK OVERVIEW
   Extract these details for CRM entry:
   - Point(s) of Contact: Name, role, contact info if mentioned
   - Marketing Channels: What channels is the lead using to promote their business?
   - KPIs Mentioned: Monthly Ad spend, ROI, ROAS, CPA, CAC (current and target values if mentioned)
   - Offer Made: What pricing and model did the rep propose?

2. DEAL ANALYSIS
   - Lead's Actual Needs: What does the lead actually need? (the real underlying needs)
   - Convincing Factors: What specifically convinced them (or would convince them)?
   - Close Confidence: 0-100% likelihood this deal closes based on the conversation
   - Verbal Agreement: Did they verbally agree to work together? Include exact quote if yes
   - Proposal Key Points: What MUST be included in the proposal to win this deal?

3. GAP SELLING EVALUATION (Based on the GAP Selling book methodology)
   - Current State: Describe the lead's current situation as discussed
   - Desired State: What outcome does the lead want to achieve?
   - Gap Articulation Score (1-10): Did the rep clearly show the gap between current and desired state?
   - Feedback: What could the rep have done better to highlight the gap and create urgency?
   - Missed Opportunities: What friction points should have been addressed to shorten the sales cycle?

4. OBJECTION ANALYSIS
   For each objection the prospect raised:
   - Category: One of ${OBJECTION_CATEGORIES.join(', ')}
   - Exact Quote: The prospect's exact words
   - Rep's Response: Exactly what the rep said in response
   - Score (1-10): 1 = not handled at all, 10 = perfectly resolved
   - Suggested Response: What they should have said (natural, specific, actionable)
   - Coaching Notes: Detailed breakdown for training - explain WHY this response works better

5. OVERALL ASSESSMENT
   - Overall Score (1-10): Overall call performance
   - Top Strengths: What the rep did well (be specific with examples)
   - Areas to Improve: Specific weaknesses to work on
   - Action Items: Concrete next steps to close THIS specific deal
   - Summary: 2-3 sentence overall assessment

OUTPUT FORMAT (JSON):
{
  "overall_score": <1-10>,
  "crm_overview": {
    "point_of_contact": [{"name": "...", "role": "...", "email": "...", "phone": "..."}],
    "marketing_channels": ["..."],
    "kpis": {
      "monthly_ad_spend": {"current": "...", "target": "..."},
      "roi": {"current": "...", "target": "..."},
      "roas": {"current": "...", "target": "..."},
      "cpa": {"current": "...", "target": "..."},
      "cac": {"current": "...", "target": "..."},
      "other": [{"name": "...", "value": "..."}]
    },
    "offer_made": {"pricing": "...", "model": "...", "details": "..."}
  },
  "deal_analysis": {
    "lead_needs": ["..."],
    "convincing_factors": ["..."],
    "close_confidence_percent": <0-100>,
    "verbal_agreement": <true/false>,
    "verbal_agreement_quote": "...",
    "proposal_key_points": ["..."]
  },
  "gap_selling": {
    "current_state": "...",
    "desired_state": "...",
    "gap_articulation_score": <1-10>,
    "gap_feedback": "...",
    "missed_opportunities": ["..."]
  },
  "objections": [
    {
      "category": "<one of the categories>",
      "objection_text": "<exact quote from prospect>",
      "user_response": "<how the rep responded>",
      "score": <1-10>,
      "suggested_response": "<what they should have said>",
      "coaching_notes": "<detailed explanation>"
    }
  ],
  "strengths": ["..."],
  "improvements": ["..."],
  "action_items": ["..."],
  "summary": "..."
}

Be specific, practical, and encouraging. Use exact quotes from the transcript. If information is not mentioned in the transcript, use empty strings or empty arrays rather than making things up.`;

    const userPrompt = `Analyze this sales call transcript:\n\n${transcript}`;

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: 'json_object' }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI Gateway error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again in a few moments.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const analysisText = aiData.choices?.[0]?.message?.content;
    
    if (!analysisText) {
      throw new Error('No analysis generated');
    }

    console.log('Raw AI response length:', analysisText.length);

    // Helper function to sanitize JSON string
    function sanitizeJsonString(jsonString: string): string {
      let cleaned = jsonString
        .replace(/```json\n?/gi, '')
        .replace(/```\n?/gi, '')
        .trim();
      
      // Remove control characters except standard whitespace
      cleaned = cleaned.replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F]/g, '');
      
      // Remove invalid escape sequences (backslashes not followed by valid JSON escape chars)
      // Valid JSON escapes: " \ / b f n r t u
      cleaned = cleaned.replace(/\\(?!["\\/bfnrtu])/g, '');
      
      return cleaned;
    }

    // Helper function to extract JSON from text
    function extractJsonFromText(text: string): string | null {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      return jsonMatch ? jsonMatch[0] : null;
    }

    let analysis: AnalysisResult;
    try {
      analysis = JSON.parse(analysisText);
    } catch (parseError) {
      console.log('Initial parse failed, attempting sanitization...', parseError);
      
      try {
        const sanitized = sanitizeJsonString(analysisText);
        analysis = JSON.parse(sanitized);
      } catch (sanitizeError) {
        console.log('Sanitized parse failed, attempting JSON extraction...', sanitizeError);
        
        try {
          const extracted = extractJsonFromText(analysisText);
          if (extracted) {
            const sanitizedExtracted = sanitizeJsonString(extracted);
            analysis = JSON.parse(sanitizedExtracted);
          } else {
            throw new Error('Could not extract JSON from response');
          }
        } catch (extractError) {
          console.error('All parsing attempts failed:', extractError);
          console.error('Raw response (first 2000 chars):', analysisText.slice(0, 2000));
          throw new Error('Failed to parse analysis result. Please try again.');
        }
      }
    }

    // Validate and provide defaults for essential fields
    if (typeof analysis.overall_score !== 'number') {
      analysis.overall_score = 5;
    }
    if (!Array.isArray(analysis.objections)) {
      analysis.objections = [];
    }
    if (!Array.isArray(analysis.strengths)) {
      analysis.strengths = [];
    }
    if (!Array.isArray(analysis.improvements)) {
      analysis.improvements = [];
    }
    if (!Array.isArray(analysis.action_items)) {
      analysis.action_items = [];
    }
    if (!analysis.summary) {
      analysis.summary = '';
    }
    if (!analysis.crm_overview) {
      analysis.crm_overview = {
        point_of_contact: [],
        marketing_channels: [],
        kpis: {},
        offer_made: { pricing: '', model: '', details: '' }
      };
    }
    if (!analysis.deal_analysis) {
      analysis.deal_analysis = {
        lead_needs: [],
        convincing_factors: [],
        close_confidence_percent: 50,
        verbal_agreement: false,
        proposal_key_points: []
      };
    }
    if (!analysis.gap_selling) {
      analysis.gap_selling = {
        current_state: '',
        desired_state: '',
        gap_articulation_score: 5,
        gap_feedback: '',
        missed_opportunities: []
      };
    }

    console.log('Successfully parsed analysis');

    // Save the call analysis to database with new fields
    const { data: savedAnalysis, error: saveError } = await supabaseClient
      .from('call_analyses')
      .insert({
        user_id: user.id,
        title: title || `Call Analysis - ${new Date().toLocaleDateString()}`,
        transcript_text: transcript,
        analysis_result: analysis,
        overall_score: analysis.overall_score,
        objections_identified: analysis.objections?.length || 0,
        strengths: analysis.strengths,
        improvements: analysis.improvements,
        crm_overview: analysis.crm_overview,
        deal_analysis: analysis.deal_analysis,
        gap_selling: analysis.gap_selling,
        close_confidence: analysis.deal_analysis?.close_confidence_percent,
      })
      .select()
      .single();

    if (saveError) {
      console.error('Failed to save analysis:', saveError);
    }

    // Auto-save new objections to user_assets and trigger clustering
    const savedObjectionIds: string[] = [];
    if (analysis.objections && analysis.objections.length > 0) {
      for (const objection of analysis.objections) {
        // Check if similar objection already exists
        const { data: existingObj } = await supabaseClient
          .from('user_assets')
          .select('id, content')
          .eq('user_id', user.id)
          .eq('asset_type', 'objection')
          .ilike('title', `%${objection.category}%`)
          .limit(1);

        let assetId: string;

        if (existingObj && existingObj.length > 0) {
          // Update frequency if exists
          const existing = existingObj[0];
          const existingContent = existing.content as any;
          await supabaseClient
            .from('user_assets')
            .update({
              content: {
                ...existingContent,
                frequency: (existingContent.frequency || 1) + 1,
                last_seen: new Date().toISOString(),
                latest_user_response: objection.user_response,
                latest_score: objection.score,
              },
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id);
          assetId = existing.id;
          savedObjectionIds.push(existing.id);
        } else {
          // Create new objection asset
          const { data: newObj } = await supabaseClient
            .from('user_assets')
            .insert({
              user_id: user.id,
              asset_type: 'objection',
              title: `${objection.category}: ${objection.objection_text.slice(0, 50)}...`,
              content: {
                objection_category: objection.category,
                objection_text: objection.objection_text,
                user_response: objection.user_response,
                suggested_response: objection.suggested_response,
                coaching_notes: objection.coaching_notes,
                score: objection.score,
                frequency: 1,
                last_seen: new Date().toISOString(),
                source_call_id: savedAnalysis?.id,
              },
              status: 'active',
              version: 1,
            })
            .select('id')
            .single();
          
          if (newObj) {
            assetId = newObj.id;
            savedObjectionIds.push(newObj.id);
          } else {
            continue;
          }
        }

        // Trigger clustering for this objection (fire and forget)
        supabaseClient.functions.invoke('cluster-objections', {
          body: {
            objection_text: objection.objection_text,
            category: objection.category,
            user_response: objection.user_response,
            score: objection.score,
            suggested_response: objection.suggested_response,
            coaching_notes: objection.coaching_notes,
            source_asset_id: assetId,
          }
        }).then(({ error }) => {
          if (error) {
            console.error('Clustering error for objection:', error);
          } else {
            console.log(`Clustered objection: ${objection.category}`);
          }
        }).catch(err => {
          console.error('Clustering invocation error:', err);
        });
      }
    }

    console.log(`Analysis complete. Score: ${analysis.overall_score}, Objections: ${analysis.objections?.length || 0}, Close confidence: ${analysis.deal_analysis?.close_confidence_percent}%`);

    return new Response(JSON.stringify({
      success: true,
      analysis,
      analysis_id: savedAnalysis?.id,
      saved_objection_ids: savedObjectionIds,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in analyze-sales-call:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
