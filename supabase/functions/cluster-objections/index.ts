import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ClusterRequest {
  objection_text: string;
  category: string;
  user_response: string;
  score: number;
  suggested_response: string;
  coaching_notes: string;
  source_asset_id: string;
}

interface ExistingCluster {
  id: string;
  cluster_name: string;
  representative_objection: string;
  summary: string | null;
  variations: string[];
  best_response: string | null;
  best_response_score: number | null;
  total_occurrences: number;
  avg_handling_score: number | null;
  source_asset_ids: string[];
  rebuttal_framework: string | null;
  difficulty_level: string | null;
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

    const body: ClusterRequest = await req.json();
    const { objection_text, category, user_response, score, suggested_response, coaching_notes, source_asset_id } = body;

    if (!objection_text || !category) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Clustering objection for user ${user.id}: "${objection_text.slice(0, 50)}..."`);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Fetch existing clusters for this user in the same category
    const { data: existingClusters, error: fetchError } = await supabaseClient
      .from('objection_clusters')
      .select('*')
      .eq('user_id', user.id)
      .eq('category', category);

    if (fetchError) {
      console.error('Error fetching existing clusters:', fetchError);
      throw fetchError;
    }

    let clusterId: string;
    let action: 'created' | 'updated';

    // Generate semantic cluster name and summary using AI
    async function generateSemanticClusterData(objectionText: string, category: string): Promise<{ name: string; summary: string; rebuttal_framework: string; difficulty_level: string }> {
      const namingPrompt = `Analyze this sales objection and provide semantic naming and insights.

OBJECTION: "${objectionText}"
CATEGORY: ${category}

Generate:
1. cluster_name: A short, professional 3-5 word name that captures the CORE concern. Examples:
   - "Budget Not Yet Allocated"
   - "Crowded Vendor Space"
   - "Compliance & Legal Concerns"
   - "Executive Buy-in Required"
   - "Timing Not Right"

2. summary: A 1-2 sentence distillation of what the prospect is really saying/feeling.

3. rebuttal_framework: A brief 10-15 word approach to handle this type of objection (e.g., "Acknowledge concern → Quantify ROI → Ask about decision timeline")

4. difficulty_level: "easy" (common, straightforward), "moderate" (requires skill), or "hard" (complex, needs strategy)

Respond with JSON only:
{
  "cluster_name": "...",
  "summary": "...",
  "rebuttal_framework": "...",
  "difficulty_level": "easy|moderate|hard"
}`;

      try {
        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash-lite',
            messages: [{ role: 'user', content: namingPrompt }],
            response_format: { type: 'json_object' },
          }),
        });

        if (!response.ok) {
          console.error('AI naming failed:', await response.text());
          return {
            name: `${category} Objection`,
            summary: objectionText.slice(0, 100),
            rebuttal_framework: 'Acknowledge → Address → Move forward',
            difficulty_level: 'moderate'
          };
        }

        const data = await response.json();
        const result = JSON.parse(data.choices?.[0]?.message?.content || '{}');
        return {
          name: result.cluster_name || `${category} Objection`,
          summary: result.summary || objectionText.slice(0, 100),
          rebuttal_framework: result.rebuttal_framework || 'Acknowledge → Address → Move forward',
          difficulty_level: result.difficulty_level || 'moderate'
        };
      } catch (e) {
        console.error('Error generating cluster name:', e);
        return {
          name: `${category} Objection`,
          summary: objectionText.slice(0, 100),
          rebuttal_framework: 'Acknowledge → Address → Move forward',
          difficulty_level: 'moderate'
        };
      }
    }

    if (!existingClusters || existingClusters.length === 0) {
      // No existing clusters in this category - create new one with AI naming
      console.log('No existing clusters in category, creating new cluster with AI naming');
      
      const clusterData = await generateSemanticClusterData(objection_text, category);
      
      const { data: newCluster, error: insertError } = await supabaseClient
        .from('objection_clusters')
        .insert({
          user_id: user.id,
          category,
          cluster_name: clusterData.name,
          representative_objection: objection_text,
          summary: clusterData.summary,
          rebuttal_framework: clusterData.rebuttal_framework,
          difficulty_level: clusterData.difficulty_level,
          variations: [],
          best_response: suggested_response,
          best_response_score: score,
          total_occurrences: 1,
          avg_handling_score: score,
          source_asset_ids: source_asset_id ? [source_asset_id] : [],
        })
        .select('id')
        .single();

      if (insertError) {
        console.error('Error creating cluster:', insertError);
        throw insertError;
      }

      clusterId = newCluster.id;
      action = 'created';
    } else {
      // Use AI to determine if this objection matches an existing cluster
      const clusterContext = existingClusters.map((c: ExistingCluster, i: number) => 
        `${i + 1}. "${c.cluster_name}" - Summary: "${c.summary || c.representative_objection}"`
      ).join('\n');

      const matchPrompt = `You are analyzing sales objections to group semantically similar ones together.

NEW OBJECTION: "${objection_text}"
CATEGORY: ${category}

EXISTING CLUSTERS IN THIS CATEGORY:
${clusterContext}

Task: Determine if the new objection is semantically similar to any existing cluster.
Consider the MEANING and INTENT, not exact wording.

Examples of similar objections:
- "It's too expensive" ≈ "What's your pricing?" ≈ "We don't have budget" (all about money)
- "We're busy right now" ≈ "Call back next quarter" ≈ "Not a good time" (all about timing)

Respond with JSON only:
{
  "matches_existing": true or false,
  "cluster_index": 1-based index if matches (null if no match),
  "confidence": 0.0 to 1.0
}`;

      const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash-lite',
          messages: [{ role: 'user', content: matchPrompt }],
          response_format: { type: 'json_object' },
        }),
      });

      if (!aiResponse.ok) {
        console.error('AI Gateway error:', await aiResponse.text());
        // Fallback: create new cluster with AI naming if matching fails
        const clusterData = await generateSemanticClusterData(objection_text, category);
        
        const { data: fallbackCluster, error: fallbackError } = await supabaseClient
          .from('objection_clusters')
          .insert({
            user_id: user.id,
            category,
            cluster_name: clusterData.name,
            representative_objection: objection_text,
            summary: clusterData.summary,
            rebuttal_framework: clusterData.rebuttal_framework,
            difficulty_level: clusterData.difficulty_level,
            variations: [],
            best_response: suggested_response,
            best_response_score: score,
            total_occurrences: 1,
            avg_handling_score: score,
            source_asset_ids: source_asset_id ? [source_asset_id] : [],
          })
          .select('id')
          .single();

        if (fallbackError) throw fallbackError;
        return new Response(JSON.stringify({ 
          success: true, 
          cluster_id: fallbackCluster.id,
          action: 'created',
          note: 'AI matching unavailable, created new cluster'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const aiData = await aiResponse.json();
      const matchResult = JSON.parse(aiData.choices?.[0]?.message?.content || '{}');

      console.log('AI match result:', matchResult);

      if (matchResult.matches_existing && matchResult.cluster_index && matchResult.confidence >= 0.7) {
        // Update existing cluster
        const matchedCluster = existingClusters[matchResult.cluster_index - 1] as ExistingCluster;
        
        if (!matchedCluster) {
          console.error('Invalid cluster index from AI');
          // Create new cluster with AI naming as fallback
          const clusterData = await generateSemanticClusterData(objection_text, category);
          
          const { data: newCluster, error: insertError } = await supabaseClient
            .from('objection_clusters')
            .insert({
              user_id: user.id,
              category,
              cluster_name: clusterData.name,
              representative_objection: objection_text,
              summary: clusterData.summary,
              rebuttal_framework: clusterData.rebuttal_framework,
              difficulty_level: clusterData.difficulty_level,
              variations: [],
              best_response: suggested_response,
              best_response_score: score,
              total_occurrences: 1,
              avg_handling_score: score,
              source_asset_ids: source_asset_id ? [source_asset_id] : [],
            })
            .select('id')
            .single();

          if (insertError) throw insertError;
          clusterId = newCluster.id;
          action = 'created';
        } else {
          console.log(`Matching to existing cluster: ${matchedCluster.cluster_name}`);
          
          // Calculate new average score
          const currentTotal = (matchedCluster.avg_handling_score || 0) * matchedCluster.total_occurrences;
          const newTotal = matchedCluster.total_occurrences + 1;
          const newAvg = (currentTotal + score) / newTotal;

          // Add variation if it's meaningfully different
          const variations = matchedCluster.variations || [];
          const isDuplicate = variations.some(v => 
            v.toLowerCase().trim() === objection_text.toLowerCase().trim()
          ) || matchedCluster.representative_objection.toLowerCase().trim() === objection_text.toLowerCase().trim();

          if (!isDuplicate) {
            variations.push(objection_text);
          }

          // Determine difficulty based on avg score
          let difficultyLevel = matchedCluster.difficulty_level || 'moderate';
          if (newAvg >= 7) difficultyLevel = 'easy';
          else if (newAvg < 5) difficultyLevel = 'hard';
          else difficultyLevel = 'moderate';

          // Update best response if this one is better
          const updateData: Record<string, unknown> = {
            total_occurrences: newTotal,
            avg_handling_score: Math.round(newAvg * 10) / 10,
            variations,
            difficulty_level: difficultyLevel,
            source_asset_ids: [...(matchedCluster.source_asset_ids || []), source_asset_id].filter(Boolean),
            updated_at: new Date().toISOString(),
          };

          if (!matchedCluster.best_response_score || score > matchedCluster.best_response_score) {
            updateData.best_response = suggested_response;
            updateData.best_response_score = score;
          }

          const { error: updateError } = await supabaseClient
            .from('objection_clusters')
            .update(updateData)
            .eq('id', matchedCluster.id);

          if (updateError) {
            console.error('Error updating cluster:', updateError);
            throw updateError;
          }

          clusterId = matchedCluster.id;
          action = 'updated';
        }
      } else {
        // Create new cluster with AI-generated semantic name
        console.log('No match found, creating new cluster with AI naming');
        
        const clusterData = await generateSemanticClusterData(objection_text, category);
        
        const { data: newCluster, error: insertError } = await supabaseClient
          .from('objection_clusters')
          .insert({
            user_id: user.id,
            category,
            cluster_name: clusterData.name,
            representative_objection: objection_text,
            summary: clusterData.summary,
            rebuttal_framework: clusterData.rebuttal_framework,
            difficulty_level: clusterData.difficulty_level,
            variations: [],
            best_response: suggested_response,
            best_response_score: score,
            total_occurrences: 1,
            avg_handling_score: score,
            source_asset_ids: source_asset_id ? [source_asset_id] : [],
          })
          .select('id')
          .single();

        if (insertError) {
          console.error('Error creating cluster:', insertError);
          throw insertError;
        }

        clusterId = newCluster.id;
        action = 'created';
      }
    }

    console.log(`Cluster ${action}: ${clusterId}`);

    return new Response(JSON.stringify({
      success: true,
      cluster_id: clusterId,
      action,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in cluster-objections:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
