import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'User not authenticated' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for Lovable API key
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Lovable API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for Firecrawl API key
    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!firecrawlApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl connector not configured. Please enable it in Settings.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format URL
    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }

    console.log('Scraping website:', formattedUrl);

    // Scrape the website using Firecrawl
    const firecrawlResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: formattedUrl,
        formats: ['markdown'],
        onlyMainContent: true,
      }),
    });

    const firecrawlData = await firecrawlResponse.json();

    if (!firecrawlResponse.ok || !firecrawlData.success) {
      console.error('Firecrawl error:', firecrawlData);
      return new Response(
        JSON.stringify({ success: false, error: firecrawlData.error || 'Failed to scrape website' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const websiteContent = firecrawlData.data?.markdown || firecrawlData.markdown || '';
    const metadata = firecrawlData.data?.metadata || firecrawlData.metadata || {};

    console.log('Website scraped successfully, extracting business info...');

    // Use AI to extract structured business information with pain point solutions
    const extractionPrompt = `Analyze the following website content and extract structured business information.

Website Content:
${websiteContent.substring(0, 15000)}

Page Title: ${metadata.title || 'Unknown'}
Page Description: ${metadata.description || 'Unknown'}

Extract the following information and return ONLY a valid JSON object (no markdown, no code blocks):
{
  "company_name": "The company or business name",
  "business_description": "A 2-3 sentence description of what the business does, their main services, and value proposition",
  "awards_achievements": "Any notable awards, achievements, certifications, or trust signals mentioned (or null if none found)",
  "outreach_goal": "Inferred goal for outreach based on their business model (e.g., 'Generate qualified leads for enterprise software sales', 'Book discovery calls with marketing agencies')",
  "customer_profiles": [
    {
      "icp_summary": "Brief description of ideal customer (e.g., 'SaaS companies with 50-200 employees')",
      "pain_points_with_solutions": [
        {
          "pain_point": "A specific problem the ideal customer faces",
          "solution": "How this business's services solve that problem",
          "lead_magnet_angle": "A potential free work offer that demonstrates this solution (e.g., '5x SEO-proof product pages delivered')"
        }
      ],
      "services_to_pitch": ["Service 1", "Service 2"],
      "key_benefits": ["Benefit 1", "Benefit 2"]
    }
  ]
}

IMPORTANT FOR PAIN POINTS WITH SOLUTIONS:
- Identify 3-5 specific pain points per ICP based on the business's services
- For each pain point, explain HOW this business solves it based on their services
- Suggest a "lead_magnet_angle" - a tangible free work offer that demonstrates the solution
- Focus on deliverables (not audits or consultations) - things like "4x blog articles", "3x ad creatives", "5x product pages"
- Make solutions specific to the business's actual service offerings

If you cannot find specific information, make reasonable inferences based on the content. Always return valid JSON.`;

    console.log('Calling Lovable AI Gateway for extraction...');

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${lovableApiKey}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are a business analyst expert at extracting structured information from websites. Always respond with valid JSON only, no markdown formatting.',
          },
          {
            role: 'user',
            content: extractionPrompt,
          },
        ],
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: 'AI credits depleted. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      console.error('AI extraction failed:', await aiResponse.text());
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to analyze website content' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    const extractedText = aiData.choices?.[0]?.message?.content || '';

    console.log('AI extraction result:', extractedText);

    // Parse the extracted JSON
    let extractedData;
    try {
      // Clean up potential markdown code blocks
      const cleanedText = extractedText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      extractedData = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      // Return a basic structure if parsing fails
      extractedData = {
        company_name: metadata.title || 'Unknown Company',
        business_description: metadata.description || 'Business description could not be extracted',
        awards_achievements: null,
        outreach_goal: 'Generate qualified leads',
        customer_profiles: [],
      };
    }

    // Save to copilot_memory
    const memoryData = {
      user_id: user.id,
      website_url: formattedUrl,
      company_name: extractedData.company_name,
      business_description: extractedData.business_description,
      awards_achievements: extractedData.awards_achievements,
      outreach_goal: extractedData.outreach_goal,
      customer_profiles: extractedData.customer_profiles || [],
      extracted_at: new Date().toISOString(),
    };

    const { error: upsertError } = await supabase
      .from('copilot_memory')
      .upsert(memoryData, { onConflict: 'user_id' });

    if (upsertError) {
      console.error('Failed to save memory:', upsertError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          ...extractedData,
          website_url: formattedUrl,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error reading website:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to read website';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
