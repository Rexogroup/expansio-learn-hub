import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { getDocument } from "https://esm.sh/pdfjs-serverless@0.3.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CONVERSION_SYSTEM_PROMPT = `You are an expert at converting presentation content into structured HTML blocks for a Gamma.app-style editor.

⚠️ CRITICAL OUTPUT RULES - FOLLOW EXACTLY:
1. You MUST return ONLY HTML using custom blocks with data-type attributes
2. DO NOT use standard HTML tags like <h1>, <h2>, <p>, <div> at the root level
3. EVERY section must be wrapped in a custom block (hero-block, card-block, column-layout, callout-block, or step-card)
4. Standard HTML tags (<h1>, <h3>, <p>, <ul>, etc.) are ONLY allowed INSIDE custom blocks

❌ WRONG OUTPUT (DO NOT DO THIS):
<h1>Title</h1>
<h2>Subtitle</h2>
<p>Content here</p>
<div>
  <h3>Section</h3>
  <p>Text</p>
</div>

✅ CORRECT OUTPUT:
<div data-type="hero" data-bg-color="primary" data-gradient="true" class="hero-block">
  <h1>Title</h1>
  <p>Subtitle</p>
</div>
<div data-type="card" data-bg-color="accent" data-padding="normal" class="card-block">
  <h3>Section</h3>
  <p>Text</p>
</div>

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

5. STEP INDICATOR (for horizontal progress/process flows):
<div data-type="step-indicator" data-step-count="4" data-active-step="2" data-labels="[]" class="step-indicator-container">
  <!-- Chevron steps will be auto-generated -->
</div>

6. COLUMN LAYOUT (for side-by-side content):
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

7. EMBED BLOCK (for embedded videos/content):
<div data-type="embed" data-url="https://www.youtube.com/embed/VIDEO_ID" data-embed-type="youtube" data-aspect-ratio="16:9" data-title="Optional caption" class="embed-block">
  <!-- iframe will be auto-generated -->
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
- Use data-bg-color with values: "blue", "navy", "purple", "pink", "green", "orange", "red", "teal", "yellow", "indigo", "gray", "white"
- Optional data-text-color: "white", "black", "gray", or "auto" (auto is default and adjusts automatically)
- Include proper class names on all custom blocks
- When you see 2-4 similar items together, USE COLUMN LAYOUT with cards inside
- Quotes ALWAYS go in callout blocks with variant="quote"
- First page title ALWAYS gets gradient="true"
- Use vibrant colors: blue/purple/green for main content, white/gray-light for subtle backgrounds

VALIDATION CHECKLIST BEFORE RETURNING:
✓ Does my output start with <div data-type="...">?
✓ Are ALL sections wrapped in custom blocks?
✓ Did I avoid using plain <h1>, <h2>, <p> at the root level?
✓ Are standard HTML tags ONLY inside custom blocks?

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
          { 
            role: 'user', 
            content: `⚠️ CRITICAL: You MUST use custom blocks with data-type attributes. DO NOT return plain HTML tags at the root level.

File: ${fileName}

PDF Content:
${cleanText}

IMPORTANT REMINDER:
- Your output MUST start with: <div data-type="hero" ...> or <div data-type="column-layout" ...>
- DO NOT start with: <h1>, <h2>, <p>, or plain <div>
- Wrap EVERY section in a custom block with data-type attribute
- Check your output against the validation checklist before returning

Now convert this content using ONLY the custom blocks defined in the system prompt.` 
          }
        ],
        temperature: 0.1,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error(`AI conversion failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const convertedHtml = aiData.choices[0].message.content;

    // Validate that custom blocks are present
    if (!convertedHtml.includes('data-type="')) {
      console.error('AI failed to generate custom blocks! Output:', convertedHtml.substring(0, 300));
      throw new Error('AI did not generate proper custom blocks with data-type attributes. Please try uploading the PDF again.');
    }

    console.log('Successfully converted PDF to HTML with custom blocks');

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
