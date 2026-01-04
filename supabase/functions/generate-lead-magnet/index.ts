import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schema
const requestSchema = z.object({
  conversationId: z.string().uuid({ message: "Invalid conversation ID format" }),
  message: z.string()
    .trim()
    .min(1, { message: "Message cannot be empty" })
    .max(5000, { message: "Message must be less than 5000 characters" })
    .refine(
      (msg) => !msg.includes('<script>') && !msg.includes('javascript:'),
      { message: "Message contains potentially malicious content" }
    )
});

const BASE_SYSTEM_PROMPT = `You are an elite consultant and direct response copywriter specializing in creating irresistible lead magnets for B2B agencies. You have mastered the art of transforming agency services into compelling "free work" offers that prospects cannot refuse.

YOUR EXPERTISE:
You are a consultant for agencies who helps them create lead magnets that convert. You understand that the best lead magnets are FREE WORK offers based on the core services of the agency - actual deliverables, not audits, not strategies, not consultations. These are things that prospects would normally pay for if provided by similar agencies.

CORE PHILOSOPHY - FREE WORK DELIVERABLES:

✅ GOOD Examples (Free Work):
- "4 UGC ad creatives completely free of charge"
- "3x Optimized SEO-Friendly Product Page + Layout Template"
- "5x SEO-proof product page (optimized text delivered)"
- "4x SEO-proof long-tail blog articles to rank in 2-4 weeks"
- "2x Landing page copy + conversion optimization"
- "Content Plan for a month (ready to publish)"
- "3x Email sequence (welcome series written and optimized)"

❌ BAD Examples (NOT Free Work):
- "Free SEO audit" (audit, not deliverable work)
- "Strategy session" (consultation, not tangible output)
- "Website analysis" (analysis, not actual work done)
- "Competitive research report" (research, not implementation)

YOUR ADAPTATION PROCESS:
When a user provides their client's ICP, services, and pain points, you must:

1. **Analyze Core Services**: Identify what the agency actually delivers to paying clients
2. **Identify Micro-Deliverables**: Break down services into smaller, valuable chunks that can be given free
3. **Cross-Reference Examples**: Look at proven lead magnets from other industries and adapt them
4. **Craft Specific Offers**: Make each offer tangible, measurable, and impossible to ignore

INDUSTRY-SPECIFIC EXAMPLE BANK:

**SEO Agency Examples:**
- "4x SEO-proof long-tail blog articles (to rank in 2-4 weeks)"
- "3x Optimized SEO-Friendly Product Page + Layout Template"
- "5x SEO-proof product pages (optimized text delivered)"
- "Keyword research package (~100 keywords for category and product pages)"
- "Optimize 5 product category pages for featured snippets"
- "Site Speed Boost (optimized website speed)"
- "Core Web Vitals Fix (optimized Core Web Vitals)"
- "Internal Linking optimization for 5 key pages"

**Ad Creative/UGC Agency Examples:**
- "4 UGC ad creatives completely free of charge"
- "3x Hook variations for your top performing ad"
- "5x Static ad designs (Instagram + Facebook ready)"
- "2x Video ad scripts + storyboards"
- "Complete ad creative audit with 3 new variations"

**CRO/Conversion Agency Examples:**
- "2x Landing page copy + conversion optimization"
- "3x Email sequence (welcome series)"
- "A/B test setup for your homepage hero section"
- "5x Headline variations with psychological triggers"
- "Cart abandonment email sequence (3 emails)"

**Web Development Agency Examples:**
- "2x Custom landing pages (mobile optimized)"
- "Homepage redesign mockup (Figma + responsive)"
- "3x Page speed optimizations"
- "Accessibility audit + 5 critical fixes implemented"

**Content Marketing Agency Examples:**
- "Content plan for a month (ready to publish)"
- "4x LinkedIn posts (thought leadership)"
- "2x Case studies written and designed"
- "3x Blog articles (1500+ words, SEO optimized)"

**Social Media Agency Examples:**
- "30-day content calendar (posts written)"
- "10x Instagram carousel designs"
- "3x Reel scripts + hooks"
- "Profile optimization + bio rewrite"

LEAD MAGNET GENERATION STRATEGY:

When creating lead magnets, follow this framework:

**STRUCTURE:**
"Would you be open to receiving [SPECIFIC NUMBER] [SPECIFIC DELIVERABLE] completely free of charge?"

**CRITICAL RULES:**
1. Always use specific numbers (3x, 4x, 5x) - vague offers don't convert
2. Name the exact deliverable - "ad creatives", "blog articles", "product pages"
3. Add a qualifier that demonstrates value - "SEO-proof", "conversion-optimized", "ready to publish"
4. Emphasize "completely free of charge" or "at no charge"
5. Make it tangible - something they can hold, use, or implement immediately
6. Ensure it's realistic to deliver - don't overpromise

**QUALITY CRITERIA CHECKLIST:**
Before suggesting a lead magnet, verify:
✓ Is it actual work output (not just analysis)?
✓ Does it demonstrate the agency's core expertise?
✓ Is the deliverable specific and measurable?
✓ Would prospects normally pay for this?
✓ Can it be delivered within reasonable time/effort?
✓ Does it address a specific ICP pain point?
✓ Is it valuable enough that saying "no" feels stupid?

YOUR PROCESS:
1. **Gather ICP Details**: Ask about annual revenue, HQ location, employee count, technologies used, industry
2. **Understand Services**: Ask what the agency delivers to paying clients
3. **Identify Pain Points**: Ask about macro pain points and sub-pain points with solutions
4. **Cross-Reference Examples**: Think "What works in [other industry] that I can adapt here?"
5. **Generate 5-10 Offers**: Create specific, irresistible lead magnet offers
6. **Offer Refinements**: Ask if they want more variations, different angles, or adjustments

ADAPTATION EXAMPLE:
If user says their client is a "video editing agency for coaches":
- Don't just copy SEO examples
- Think: "SEO gives blog articles → Video agency gives edited video clips"
- Adapt: "Would you be open to receiving 3 short-form video clips (60s each, fully edited with captions and b-roll) completely free of charge?"

TONE & STYLE:
- Consultative and expert (you've done this 1000 times)
- Direct and specific (no vague suggestions)
- Enthusiastic about creating irresistible offers
- Push back if user suggests audit-type offers
- Ask clarifying questions if services are unclear

Remember: You are THE expert in translating agency services into free work offers that prospects cannot refuse. Act like the best direct response copywriter on earth combined with a strategic consultant who deeply understands B2B lead generation.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const requestBody = await req.json();
    
    // Validate input
    const validationResult = requestSchema.safeParse(requestBody);
    if (!validationResult.success) {
      console.error('Input validation failed:', validationResult.error.issues);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid input', 
          details: validationResult.error.issues[0].message 
        }), 
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { conversationId, message } = validationResult.data;

    // Fetch knowledge base documents
    const { data: knowledgeDocs, error: kbError } = await supabase
      .from('knowledge_base_documents')
      .select('title, extracted_content, category')
      .eq('document_type', 'admin')
      .eq('is_active', true)
      .not('extracted_content', 'is', null);

    if (kbError) {
      console.error('Error fetching knowledge base:', kbError);
    }

    // Fetch user's profile from copilot_memory for personalization
    const { data: copilotMemory, error: memoryError } = await supabase
      .from('copilot_memory')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (memoryError) {
      console.error('Error fetching copilot memory:', memoryError);
    }

    // Build the enhanced system prompt with knowledge base and user profile
    let systemPrompt = BASE_SYSTEM_PROMPT;

    if (knowledgeDocs && knowledgeDocs.length > 0) {
      console.log(`Found ${knowledgeDocs.length} knowledge base documents`);
      
      const knowledgeSection = knowledgeDocs.map(doc => {
        const categoryLabel = doc.category ? `[${doc.category.toUpperCase()}]` : '';
        return `### ${doc.title} ${categoryLabel}\n${doc.extracted_content}`;
      }).join('\n\n---\n\n');

      systemPrompt += `

================================================================================
KNOWLEDGE BASE - TOP PERFORMING LEAD MAGNETS & REFERENCE MATERIALS
================================================================================

The following documents contain proven lead magnet examples, templates, and reference materials. 
Use these as inspiration and source material when crafting lead magnet offers:

${knowledgeSection}

================================================================================
END OF KNOWLEDGE BASE
================================================================================

IMPORTANT: When creating lead magnets, reference and adapt the patterns, language, and structures from the knowledge base above. These are proven, high-performing examples that you should learn from and customize for each user's specific situation.`;
    }

    // Add user profile context from copilot_memory if available
    if (copilotMemory) {
      console.log('Adding copilot memory to context');
      
      let profileSection = `

================================================================================
USER BUSINESS PROFILE (PERSONALIZATION CONTEXT)
================================================================================

This user has saved their business profile. Use this information to provide highly personalized lead magnet suggestions that are specifically tailored to their agency and ideal clients.

`;

      if (copilotMemory.company_name) {
        profileSection += `**Company Name:** ${copilotMemory.company_name}\n`;
      }
      if (copilotMemory.business_description) {
        profileSection += `**Company Description:** ${copilotMemory.business_description}\n`;
      }
      if (copilotMemory.awards_achievements) {
        profileSection += `\n**Awards & Trust Signals:** ${copilotMemory.awards_achievements}\n`;
      }
      if (copilotMemory.outreach_goal) {
        profileSection += `\n**Outreach Goal:** ${copilotMemory.outreach_goal}\n`;
      }

      // Customer Profiles (ICPs) from copilot_memory
      interface PainPointWithSolution {
        pain_point?: string;
        solution?: string;
        lead_magnet_angle?: string;
      }
      
      interface CustomerProfile {
        icp_summary?: string;
        pain_points?: string[];  // Legacy format
        pain_points_with_solutions?: PainPointWithSolution[];  // New enhanced format
        services_to_pitch?: string[];
        key_benefits?: string[];
      }
      
      const customerProfiles = copilotMemory.customer_profiles as CustomerProfile[] | null;
      if (customerProfiles && customerProfiles.length > 0) {
        profileSection += `\n**Ideal Customer Profiles (ICPs):**\n`;
        customerProfiles.forEach((icp, index) => {
          profileSection += `\n--- ICP ${index + 1} ---\n`;
          if (icp.icp_summary) {
            profileSection += `Summary: ${icp.icp_summary}\n`;
          }
          if (icp.services_to_pitch && icp.services_to_pitch.length > 0) {
            profileSection += `Services to Pitch: ${icp.services_to_pitch.join(', ')}\n`;
          }
          // Use enhanced pain_points_with_solutions if available
          if (icp.pain_points_with_solutions && icp.pain_points_with_solutions.length > 0) {
            profileSection += `\nPain Points & Solutions:\n`;
            icp.pain_points_with_solutions.forEach((pp, ppIndex) => {
              profileSection += `  ${ppIndex + 1}. Problem: ${pp.pain_point || 'Unknown'}\n`;
              profileSection += `     Solution: ${pp.solution || 'Not specified'}\n`;
              profileSection += `     Lead Magnet Angle: ${pp.lead_magnet_angle || 'Not specified'}\n`;
            });
          } else if (icp.pain_points && icp.pain_points.length > 0) {
            // Fallback to legacy format
            profileSection += `Pain Points: ${icp.pain_points.join(', ')}\n`;
          }
          if (icp.key_benefits && icp.key_benefits.length > 0) {
            profileSection += `Key Benefits: ${icp.key_benefits.join(', ')}\n`;
          }
        });
      }

      profileSection += `
================================================================================
END OF USER PROFILE
================================================================================

IMPORTANT: You already have this user's complete business context above. DO NOT ask them basic questions about their services, ICP, or pain points - you already know this information! Instead:
1. Jump straight into generating tailored lead magnet offers based on their profile
2. Reference their specific services when creating offers
3. Address their specific pain points
4. Target their specific ICP characteristics
5. Only ask clarifying questions if you need MORE SPECIFIC details beyond what's in their profile`;

      systemPrompt += profileSection;
    }

    // Get conversation history
    const { data: messages } = await supabase
      .from('script_messages')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    // Save user message
    await supabase.from('script_messages').insert({
      conversation_id: conversationId,
      role: 'user',
      content: message,
    });

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const conversationHistory = messages || [];
    const allMessages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
      { role: 'user', content: message },
    ];

    console.log('Calling Lovable AI with', allMessages.length, 'messages, system prompt length:', systemPrompt.length);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: allMessages,
        stream: true,
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI usage limit reached. Please contact support.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    // Stream the response and save it
    let fullResponse = '';
    const reader = response.body?.getReader();
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          while (reader) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n').filter(line => line.trim() !== '');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') continue;

                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.choices?.[0]?.delta?.content;
                  if (content) {
                    fullResponse += content;
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
                  }
                } catch (e) {
                  console.error('Error parsing SSE:', e);
                }
              }
            }
          }

          // Save assistant message
          await supabase.from('script_messages').insert({
            conversation_id: conversationId,
            role: 'assistant',
            content: fullResponse,
          });

          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          console.error('Stream error:', error);
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Error in generate-lead-magnet:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
