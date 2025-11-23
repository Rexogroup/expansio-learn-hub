import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { getDocument } from "https://esm.sh/pdfjs-serverless@0.3.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CONVERSION_SYSTEM_PROMPT = `You are an expert at converting presentation content into structured HTML blocks for a Gamma.app-style editor.

Given PDF content (text and structure), convert it to HTML using these EXACT custom blocks:

1. HERO BLOCK (for main titles/headers):
<div data-type="hero" data-bg-color="primary" data-gradient="true" class="hero-block">
  <h1>Title Here</h1>
  <p>Subtitle or description</p>
</div>

2. CARD BLOCK (for content sections):
<div data-type="card" data-bg-color="accent" data-padding="normal" class="card-block">
  <h3>Section Title</h3>
  <p>Content here...</p>
</div>

3. CALLOUT BLOCK (for quotes/highlights):
<div data-type="callout" data-variant="quote" class="callout-block">
  <p>"Quote text here"</p>
</div>
Variants: info, warning, success, quote

4. STEP CARD (for numbered items):
<div data-type="step" data-step-number="1" class="step-card">
  <h3>Step Title</h3>
  <p>Step description...</p>
</div>

5. COLUMN LAYOUT (for side-by-side content):
<div data-type="column-layout" data-columns="3" class="column-layout">
  <div data-type="column-item" class="column-item">
    <div data-type="card" data-bg-color="accent" data-padding="normal" class="card-block">
      <h3>Card Title</h3>
      <p>Card content</p>
    </div>
  </div>
  <div data-type="column-item" class="column-item">
    <div data-type="card" data-bg-color="accent" data-padding="normal" class="card-block">
      <h3>Card Title</h3>
      <p>Card content</p>
    </div>
  </div>
  <div data-type="column-item" class="column-item">
    <div data-type="card" data-bg-color="accent" data-padding="normal" class="card-block">
      <h3>Card Title</h3>
      <p>Card content</p>
    </div>
  </div>
</div>

PATTERN DETECTION RULES:
- First page heading (document title) → hero-block with data-gradient="true"
- 2-4 consecutive sections with SIMILAR structure (short heading + description) → column-layout with card-block inside each column-item
- Text in quotation marks ("...") → callout-block with data-variant="quote"
- Section headings followed by paragraphs → card-block
- Numbered steps/processes → step-card with appropriate data-step-number
- Bulleted lists → Keep as <ul><li> inside a card-block

CONCRETE EXAMPLES:

EXAMPLE 1 - Three Side-by-Side Cards:
INPUT TEXT:
"Give Valuable Work
Deliver something they would normally pay for—real, tangible work that solves an actual problem.

Deliver It Free
No payment required, no strings attached, no friction in the process.

Deliver It Upfront
Before they commit to anything, before a call, before a meeting—value first, always."

OUTPUT HTML:
<div data-type="column-layout" data-columns="3" class="column-layout">
  <div data-type="column-item" class="column-item">
    <div data-type="card" data-bg-color="accent" data-padding="normal" class="card-block">
      <h3>Give Valuable Work</h3>
      <p>Deliver something they would normally pay for—real, tangible work that solves an actual problem.</p>
    </div>
  </div>
  <div data-type="column-item" class="column-item">
    <div data-type="card" data-bg-color="accent" data-padding="normal" class="card-block">
      <h3>Deliver It Free</h3>
      <p>No payment required, no strings attached, no friction in the process.</p>
    </div>
  </div>
  <div data-type="column-item" class="column-item">
    <div data-type="card" data-bg-color="accent" data-padding="normal" class="card-block">
      <h3>Deliver It Upfront</h3>
      <p>Before they commit to anything, before a call, before a meeting—value first, always.</p>
    </div>
  </div>
</div>

EXAMPLE 2 - Quote Callout:
INPUT TEXT:
"Give them something valuable enough that they'd normally pay for it, and deliver it for free, upfront, with no friction."

OUTPUT HTML:
<div data-type="callout" data-variant="quote" class="callout-block">
  <p>"Give them something valuable enough that they'd normally pay for it, and deliver it for free, upfront, with no friction."</p>
</div>

EXAMPLE 3 - Main Title:
INPUT TEXT:
"The Expansio Philosophy
Our approach to winning clients"

OUTPUT HTML:
<div data-type="hero" data-bg-color="primary" data-gradient="true" class="hero-block">
  <h1>The Expansio Philosophy</h1>
  <p>Our approach to winning clients</p>
</div>

CONVERSION PROCESS:
1. Read the entire text first
2. Identify the main title/heading → hero-block with data-gradient="true"
3. Look for groups of 2-4 similar short sections (heading + brief description) → column-layout with card-blocks
4. Find quotes (text in "..." or standalone quote-like sentences) → callout-block with data-variant="quote"
5. Convert remaining sections to card-blocks
6. Preserve ALL text exactly as written
7. Maintain formatting: <strong>, <em>, <ul>, <ol>, <li>

CRITICAL RULES:
- Use data-bg-color: "primary", "secondary", "accent", or "muted"
- Include proper class names on all custom blocks
- When you see 2-4 similar items together, USE COLUMN LAYOUT with cards inside
- Quotes ALWAYS go in callout blocks with variant="quote"
- First page title ALWAYS gets gradient="true"

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

    const { pdfFile, fileName } = await req.json();

    if (!pdfFile) {
      throw new Error('No PDF file provided');
    }

    console.log(`Processing PDF: ${fileName}`);

    // Decode base64 PDF to binary
    const pdfData = Uint8Array.from(atob(pdfFile), c => c.charCodeAt(0));

    // Parse PDF using pdfjs-serverless (Deno-compatible)
    console.log('Parsing PDF with pdfjs-serverless...');
    const doc = await getDocument({ data: pdfData, useSystemFonts: true }).promise;

    // Extract text from all pages
    let cleanText = '';
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      cleanText += pageText + '\n\n';
    }

    console.log(`Extracted ${cleanText.length} characters from ${doc.numPages} pages`);

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
          { role: 'user', content: `Convert this PDF content to custom HTML blocks:\n\nFile: ${fileName}\n\n${cleanText}` }
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
