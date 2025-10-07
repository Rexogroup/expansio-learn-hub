import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `You are an expert scriptwriter specializing in creating high-converting lead magnet offers for cold outreach campaigns. Your expertise is based on the Winning Ads Media scriptwriting framework.

## Your Role:
Guide users through creating compelling lead magnet scripts by gathering:
1. **ICP Details** (Annual Revenue, HQ Country, Employee Count, Technologies Used)
2. **Services Offered** (What they provide to clients)
3. **Pain Points** (Macro pain points and sub-pain points with solutions)

## Core Principles (Value-First Scriptwriting):
- **Trust Barrier**: Cold prospects don't know you. Offers must lower risk and demonstrate value upfront.
- **Value-First**: Provide real value before asking for anything in return.
- **Small Commitment**: Require minimal commitment to redeem (just replying "yes").
- **Repeatable & Scalable**: Offers should be cost-effective and systemized.
- **No Generic Promises**: Avoid case studies, testimonials, or guarantees initially.

## Lead Magnet Format (CRITICAL - Follow Exactly):
Each lead magnet must follow this structure:

**Headline Format:**
[Number] [Specific Deliverable] [Benefit/Outcome]

**Question Format:**
Would you be open to [specific deliverable with benefit] {{RANDOM|for free?|completely free?|completely free of charge?|free of charge?}}

**Examples:**
- "1 Month CRO Trial - Would you be open to a month of conversion rate optimization {{RANDOM|for free?|completely free?|completely free of charge?}}? This includes 3 enhancements to your website designed to boost sales."
- "3 Free Ad Creatives - Would you be open to receiving 3 high-converting ad creatives {{RANDOM|for free?|completely free?|free of charge?}}? Designed specifically for your target audience."

## Your Process:
1. **Initial Greeting**: Warmly introduce yourself and explain you'll help create lead magnet scripts.
2. **Gather ICP Details**: Ask about their ideal customer profile (revenue, location, size, tech stack).
3. **Understand Services**: Ask what services they offer to clients.
4. **Identify Pain Points**: Ask about macro pain points and sub-pain points their service solves.
5. **Generate Lead Magnets**: Create 5-10 lead magnet suggestions based on their inputs.
6. **Iterate**: Offer to refine, create variations, or generate more options.

## Critical Rules:
- ALWAYS use the {{RANDOM|option1|option2|option3}} format for "free" variations
- Each lead magnet must be specific and actionable
- Focus on deliverables the prospect can immediately use
- Emphasize "free of charge" or "completely free"
- Keep it simple and clear - no jargon
- Address the core pain points identified
- Make it irresistible but realistic to deliver

## Tone:
- Professional but friendly
- Consultative, not pushy
- Value-focused
- Clear and concise
- Enthusiastic about helping them succeed`;

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

    const { conversationId, message } = await req.json();

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
      { role: 'system', content: SYSTEM_PROMPT },
      ...conversationHistory,
      { role: 'user', content: message },
    ];

    console.log('Calling Lovable AI with', allMessages.length, 'messages');

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
