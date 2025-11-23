import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CONVERSION_SYSTEM_PROMPT = `You are an expert at converting presentation content into structured HTML blocks for a Gamma.app-style editor.

Given PDF content (text and structure), convert it to HTML using these EXACT custom blocks:

1. HERO BLOCK (for main titles/headers):
<div data-type="hero" data-bg-color="primary" data-gradient="false" class="hero-block">
  <h1>Title Here</h1>
  <p>Subtitle or description</p>
</div>

2. CARD BLOCK (for content sections):
<div data-type="card" data-bg-color="accent" data-padding="normal" class="card-block">
  <h3>Section Title</h3>
  <p>Content here...</p>
</div>

3. CALLOUT BLOCK (for quotes/highlights):
<div data-type="callout" data-variant="info" class="callout-block">
  <p>💡 Important information or quote</p>
</div>
Variants: info, warning, success, quote

4. STEP CARD (for numbered items):
<div data-type="step" data-step-number="1" class="step-card">
  <h3>Step Title</h3>
  <p>Step description...</p>
</div>

5. COLUMN LAYOUT (for side-by-side content):
<div data-type="column-layout" data-columns="2" class="column-layout">
  <div data-type="column-item" class="column-item">
    <p>Left column content</p>
  </div>
  <div data-type="column-item" class="column-item">
    <p>Right column content</p>
  </div>
</div>

CONVERSION RULES:
1. First slide/page title → Hero block with gradient
2. Section headers → Card blocks or Hero blocks
3. Quotes, tips, important notes → Callout blocks
4. Numbered lists or processes → Step cards (preserve numbering)
5. Side-by-side content → Column layouts
6. Preserve ALL text exactly as written
7. Maintain formatting: <strong>, <em>, <ul>, <ol>, <li>
8. Use appropriate data-variant for callouts (info=blue, warning=yellow, success=green, quote=purple)
9. Use data-bg-color: "primary", "secondary", "accent", or "muted"
10. Include proper class names on all custom blocks

Return ONLY valid HTML with these custom blocks. No explanations, no markdown, just HTML.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { pdfContent, fileName } = await req.json();

    if (!pdfContent) {
      throw new Error('No PDF content provided');
    }

    console.log(`Processing PDF: ${fileName}`);

    // Call Lovable AI to convert the PDF content to custom HTML blocks
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [
          { role: 'system', content: CONVERSION_SYSTEM_PROMPT },
          { role: 'user', content: `Convert this PDF content to custom HTML blocks:\n\n${pdfContent}` }
        ],
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error(`AI conversion failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const convertedHtml = aiData.choices[0].message.content;

    console.log('Successfully converted PDF to HTML');

    return new Response(
      JSON.stringify({ 
        success: true, 
        html: convertedHtml,
        fileName 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in convert-pdf-to-lesson:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
