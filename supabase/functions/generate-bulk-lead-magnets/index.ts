import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

declare const EdgeRuntime: {
  waitUntil: (promise: Promise<unknown>) => void;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BULK_GENERATION_PROMPT = `You are an elite consultant and direct response copywriter specializing in creating irresistible lead magnets for B2B agencies.

YOUR TASK: Generate exactly 20 unique, high-converting lead magnet offers based on the user's business profile below.

STRUCTURE FOR EACH LEAD MAGNET:
"Would you be open to receiving [SPECIFIC NUMBER] [SPECIFIC DELIVERABLE] completely free?"

CRITICAL RULES:
1. Always use specific numbers (3x, 4x, 5x) - vague offers don't convert
2. Name the exact deliverable - "ad creatives", "blog articles", "product pages"
3. Add a qualifier that demonstrates value - "SEO-proof", "conversion-optimized", "ready to publish"
4. Make it tangible - something they can hold, use, or implement immediately
5. Each lead magnet must be unique - different angles, services, deliverables
6. Cover different aspects of their services

CATEGORIES TO COVER (aim for 3-5 lead magnets per category where applicable):
- Content/Copy: blog articles, email sequences, landing page copy
- Creative/Design: ad creatives, social graphics, video scripts
- Technical/SEO: page optimizations, audits with fixes, speed improvements
- Strategy/Planning: content calendars, campaign frameworks, templates

Generate 20 diverse lead magnets that would be irresistible to their ideal clients.`;

interface LeadMagnet {
  title: string;
  content: string;
  category: string;
}

interface UserProfile {
  company_name?: string;
  company_description?: string;
  services_offered?: string;
  target_industries?: string;
  icp_revenue_range?: string;
  icp_employee_count?: string;
  icp_location?: string;
  icp_tech_stack?: string;
  icp_additional_details?: string;
  pain_points?: Array<{ problem: string; solution?: string }>;
  custom_notes?: string;
}

async function generateLeadMagnets(
  supabaseUrl: string,
  supabaseKey: string,
  userId: string,
  count: number
): Promise<void> {
  console.log(`Starting bulk generation of ${count} lead magnets for user ${userId}`);

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Fetch user profile
  const { data: userProfileData, error: profileError } = await supabase
    .from('user_script_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (profileError || !userProfileData) {
    console.error('Error fetching user profile:', profileError);
    throw new Error('User profile not found');
  }

  const userProfile = userProfileData as UserProfile;

  // Build profile context
  let profileContext = `
USER BUSINESS PROFILE:
`;

  if (userProfile.company_name) {
    profileContext += `Company: ${userProfile.company_name}\n`;
  }
  if (userProfile.company_description) {
    profileContext += `Description: ${userProfile.company_description}\n`;
  }
  if (userProfile.services_offered) {
    profileContext += `Services: ${userProfile.services_offered}\n`;
  }
  if (userProfile.target_industries) {
    profileContext += `Target Industries: ${userProfile.target_industries}\n`;
  }

  const icpDetails: string[] = [];
  if (userProfile.icp_revenue_range) icpDetails.push(`Revenue: ${userProfile.icp_revenue_range}`);
  if (userProfile.icp_employee_count) icpDetails.push(`Size: ${userProfile.icp_employee_count}`);
  if (userProfile.icp_location) icpDetails.push(`Location: ${userProfile.icp_location}`);
  if (userProfile.icp_tech_stack) icpDetails.push(`Tech Stack: ${userProfile.icp_tech_stack}`);
  
  if (icpDetails.length > 0) {
    profileContext += `ICP: ${icpDetails.join(' | ')}\n`;
  }
  if (userProfile.icp_additional_details) {
    profileContext += `Additional ICP Details: ${userProfile.icp_additional_details}\n`;
  }

  const painPoints = userProfile.pain_points;
  if (painPoints && painPoints.length > 0) {
    profileContext += `\nPain Points:\n`;
    painPoints.forEach((pp, index) => {
      profileContext += `${index + 1}. ${pp.problem}`;
      if (pp.solution) profileContext += ` → ${pp.solution}`;
      profileContext += `\n`;
    });
  }

  if (userProfile.custom_notes) {
    profileContext += `\nAdditional Notes: ${userProfile.custom_notes}\n`;
  }

  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) {
    throw new Error('LOVABLE_API_KEY is not configured');
  }

  console.log('Calling AI to generate lead magnets...');

  // Use tool calling for structured output
  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: BULK_GENERATION_PROMPT },
        { role: 'user', content: `${profileContext}\n\nGenerate ${count} unique lead magnets for this business.` }
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "save_lead_magnets",
            description: `Generate exactly ${count} unique lead magnet offers`,
            parameters: {
              type: "object",
              properties: {
                lead_magnets: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { 
                        type: "string",
                        description: "Short title for the lead magnet (e.g., '4 UGC Ad Creatives')"
                      },
                      content: { 
                        type: "string",
                        description: "The full lead magnet pitch starting with 'Would you be open to receiving...'"
                      },
                      category: { 
                        type: "string", 
                        enum: ["content", "creative", "technical", "strategy", "outreach", "general"],
                        description: "Category for organizing the lead magnet"
                      }
                    },
                    required: ["title", "content", "category"],
                    additionalProperties: false
                  }
                }
              },
              required: ["lead_magnets"],
              additionalProperties: false
            }
          }
        }
      ],
      tool_choice: { type: "function", function: { name: "save_lead_magnets" } }
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('AI gateway error:', response.status, errorText);
    throw new Error(`AI gateway error: ${response.status}`);
  }

  const data = await response.json();
  console.log('AI response received');

  // Extract lead magnets from tool call
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall || toolCall.function.name !== 'save_lead_magnets') {
    console.error('Unexpected AI response format:', data);
    throw new Error('Invalid AI response format');
  }

  let leadMagnets: LeadMagnet[];
  try {
    const args = JSON.parse(toolCall.function.arguments);
    leadMagnets = args.lead_magnets;
  } catch (e) {
    console.error('Failed to parse tool call arguments:', e);
    throw new Error('Failed to parse AI response');
  }

  console.log(`Generated ${leadMagnets.length} lead magnets, saving to database...`);

  // Save lead magnets to database
  const insertData = leadMagnets.map(lm => ({
    user_id: userId,
    title: lm.title,
    content: lm.content,
    category: `auto-${lm.category}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));

  const { error: insertError } = await supabase
    .from('saved_lead_magnets')
    .insert(insertData);

  if (insertError) {
    console.error('Error saving lead magnets:', insertError);
    throw insertError;
  }

  console.log(`Successfully saved ${leadMagnets.length} lead magnets for user ${userId}`);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: authData, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !authData?.user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const user = authData.user;
    const { count = 20 } = await req.json();

    // Check if user already has auto-generated lead magnets
    const { data: existing } = await supabase
      .from('saved_lead_magnets')
      .select('id')
      .eq('user_id', user.id)
      .like('category', 'auto-%')
      .limit(1);

    if (existing && existing.length > 0) {
      console.log('User already has auto-generated lead magnets, skipping');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Lead magnets already generated',
        skipped: true 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Run generation in background
    EdgeRuntime.waitUntil(
      generateLeadMagnets(supabaseUrl, supabaseKey, user.id, Math.min(count, 25))
        .then(() => console.log('Background generation completed'))
        .catch(err => console.error('Background generation failed:', err))
    );

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Lead magnet generation started',
      count: Math.min(count, 25)
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-bulk-lead-magnets:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
