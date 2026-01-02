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

interface AnalysisResult {
  overall_score: number;
  objections: ObjectionAnalysis[];
  strengths: string[];
  improvements: string[];
  action_items: string[];
  summary: string;
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

    const systemPrompt = `You are an expert B2B sales coach with 20+ years of experience training high-performing sales teams. Your task is to analyze a sales call transcript and provide actionable coaching feedback.

OBJECTION CATEGORIES TO USE:
${OBJECTION_CATEGORIES.join(', ')}

${knowledgeContext ? `REFERENCE FRAMEWORKS:\n${knowledgeContext}\n` : ''}

${objectionContext ? `USER'S PREVIOUS OBJECTIONS (for context on patterns):\n${objectionContext}\n` : ''}

ANALYSIS INSTRUCTIONS:
1. Carefully read the entire transcript
2. Identify every objection the prospect raised
3. For each objection, evaluate how the rep handled it
4. Provide specific, actionable coaching

OUTPUT FORMAT (JSON):
{
  "overall_score": <1-10>,
  "objections": [
    {
      "category": "<one of the categories>",
      "objection_text": "<exact quote from prospect>",
      "user_response": "<how the rep responded>",
      "score": <1-10>,
      "suggested_response": "<what they should have said - be specific and natural>",
      "coaching_notes": "<brief explanation of why and how to improve>"
    }
  ],
  "strengths": ["<specific thing done well>", "..."],
  "improvements": ["<specific area to work on>", "..."],
  "action_items": ["<concrete action to take>", "..."],
  "summary": "<2-3 sentence overall assessment>"
}

Be specific, practical, and encouraging. Reference the frameworks when relevant.`;

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

    console.log('Raw AI response:', analysisText);

    let analysis: AnalysisResult;
    try {
      analysis = JSON.parse(analysisText);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      throw new Error('Failed to parse analysis result');
    }

    // Save the call analysis to database
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
      })
      .select()
      .single();

    if (saveError) {
      console.error('Failed to save analysis:', saveError);
    }

    // Auto-save new objections to user_assets
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
            savedObjectionIds.push(newObj.id);
          }
        }
      }
    }

    console.log(`Analysis complete. Score: ${analysis.overall_score}, Objections: ${analysis.objections?.length || 0}`);

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
