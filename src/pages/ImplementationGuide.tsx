import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FileDown, Copy, Check, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

const ImplementationGuide = () => {
  const [copied, setCopied] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    sql: true,
    edge: true,
    config: true,
    components: true,
    routes: true,
    deps: true,
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopyAll = async () => {
    await navigator.clipboard.writeText(fullMarkdownContent);
    setCopied(true);
    toast.success("Complete guide copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const fullMarkdownContent = `# AI Chat Builder - Complete Implementation Guide

This guide contains everything needed to replicate the AI Lead Magnet Script Builder feature in another Lovable project.

---

## Part 1: Database Schema (SQL Migration)

Run this SQL in your database to create all required tables:

\`\`\`sql
-- =============================================
-- SCRIPT BUILDER DATABASE SCHEMA
-- =============================================

-- 1. Script Conversations Table
CREATE TABLE public.script_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT DEFAULT 'New Conversation',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.script_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own conversations" 
  ON public.script_conversations FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own conversations" 
  ON public.script_conversations FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations" 
  ON public.script_conversations FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own conversations" 
  ON public.script_conversations FOR DELETE 
  USING (auth.uid() = user_id);

-- 2. Script Messages Table
CREATE TABLE public.script_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.script_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.script_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages from own conversations" 
  ON public.script_messages FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.script_conversations 
    WHERE id = script_messages.conversation_id AND user_id = auth.uid()
  ));

CREATE POLICY "Users can create messages in own conversations" 
  ON public.script_messages FOR INSERT 
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.script_conversations 
    WHERE id = script_messages.conversation_id AND user_id = auth.uid()
  ));

-- 3. User Script Profiles Table
CREATE TABLE public.user_script_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  company_name TEXT,
  company_description TEXT,
  services_offered TEXT,
  target_industries TEXT,
  icp_revenue_range TEXT,
  icp_employee_count TEXT,
  icp_location TEXT,
  icp_tech_stack TEXT,
  icp_additional_details TEXT,
  pain_points JSONB DEFAULT '[]',
  custom_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_script_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" 
  ON public.user_script_profiles FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own profile" 
  ON public.user_script_profiles FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" 
  ON public.user_script_profiles FOR UPDATE 
  USING (auth.uid() = user_id);

-- 4. Saved Lead Magnets Table
CREATE TABLE public.saved_lead_magnets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  conversation_id UUID REFERENCES public.script_conversations(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.saved_lead_magnets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own lead magnets" 
  ON public.saved_lead_magnets FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own lead magnets" 
  ON public.saved_lead_magnets FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own lead magnets" 
  ON public.saved_lead_magnets FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own lead magnets" 
  ON public.saved_lead_magnets FOR DELETE 
  USING (auth.uid() = user_id);

-- 5. Generated Scripts Table
CREATE TABLE public.generated_scripts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  conversation_id UUID REFERENCES public.script_conversations(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  icp_details JSONB,
  pain_points JSONB,
  services TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.generated_scripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own scripts" 
  ON public.generated_scripts FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own scripts" 
  ON public.generated_scripts FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own scripts" 
  ON public.generated_scripts FOR DELETE 
  USING (auth.uid() = user_id);

-- 6. Knowledge Base Documents Table (Optional - for admin-uploaded reference materials)
CREATE TABLE public.knowledge_base_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  uploaded_by UUID NOT NULL,
  title TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  document_type TEXT DEFAULT 'general',
  category TEXT,
  extracted_content TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.knowledge_base_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active documents" 
  ON public.knowledge_base_documents FOR SELECT 
  USING (is_active = true);

CREATE POLICY "Admins can manage documents" 
  ON public.knowledge_base_documents FOR ALL 
  USING (true);
\`\`\`

---

## Part 2: Edge Function

Create file: \`supabase/functions/generate-lead-magnet/index.ts\`

\`\`\`typescript
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

const BASE_SYSTEM_PROMPT = \`You are an elite consultant and direct response copywriter specializing in creating irresistible lead magnets for B2B agencies. You have mastered the art of transforming agency services into compelling "free work" offers that prospects cannot refuse.

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

Remember: You are THE expert in translating agency services into free work offers that prospects cannot refuse. Act like the best direct response copywriter on earth combined with a strategic consultant who deeply understands B2B lead generation.\`;

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

    // Fetch knowledge base documents (optional)
    const { data: knowledgeDocs, error: kbError } = await supabase
      .from('knowledge_base_documents')
      .select('title, extracted_content, category')
      .eq('document_type', 'admin')
      .eq('is_active', true)
      .not('extracted_content', 'is', null);

    if (kbError) {
      console.error('Error fetching knowledge base:', kbError);
    }

    // Fetch user's profile for personalization
    const { data: userProfile, error: profileError } = await supabase
      .from('user_script_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (profileError) {
      console.error('Error fetching user profile:', profileError);
    }

    // Build the enhanced system prompt with knowledge base and user profile
    let systemPrompt = BASE_SYSTEM_PROMPT;

    if (knowledgeDocs && knowledgeDocs.length > 0) {
      console.log(\`Found \${knowledgeDocs.length} knowledge base documents\`);
      
      const knowledgeSection = knowledgeDocs.map(doc => {
        const categoryLabel = doc.category ? \`[\${doc.category.toUpperCase()}]\` : '';
        return \`### \${doc.title} \${categoryLabel}\\n\${doc.extracted_content}\`;
      }).join('\\n\\n---\\n\\n');

      systemPrompt += \`

================================================================================
KNOWLEDGE BASE - TOP PERFORMING LEAD MAGNETS & REFERENCE MATERIALS
================================================================================

The following documents contain proven lead magnet examples, templates, and reference materials. 
Use these as inspiration and source material when crafting lead magnet offers:

\${knowledgeSection}

================================================================================
END OF KNOWLEDGE BASE
================================================================================

IMPORTANT: When creating lead magnets, reference and adapt the patterns, language, and structures from the knowledge base above. These are proven, high-performing examples that you should learn from and customize for each user's specific situation.\`;
    }

    // Add user profile context if available
    if (userProfile) {
      console.log('Adding user profile to context');
      
      let profileSection = \`

================================================================================
USER BUSINESS PROFILE (PERSONALIZATION CONTEXT)
================================================================================

This user has saved their business profile. Use this information to provide highly personalized lead magnet suggestions that are specifically tailored to their agency and ideal clients.

\`;

      if (userProfile.company_name) {
        profileSection += \`**Company Name:** \${userProfile.company_name}\\n\`;
      }
      if (userProfile.company_description) {
        profileSection += \`**Company Description:** \${userProfile.company_description}\\n\`;
      }
      if (userProfile.services_offered) {
        profileSection += \`\\n**Services Offered:**\\n\${userProfile.services_offered}\\n\`;
      }
      if (userProfile.target_industries) {
        profileSection += \`\\n**Target Industries:** \${userProfile.target_industries}\\n\`;
      }

      // ICP Details
      const icpDetails = [];
      if (userProfile.icp_revenue_range) icpDetails.push(\`Revenue: \${userProfile.icp_revenue_range}\`);
      if (userProfile.icp_employee_count) icpDetails.push(\`Size: \${userProfile.icp_employee_count}\`);
      if (userProfile.icp_location) icpDetails.push(\`Location: \${userProfile.icp_location}\`);
      if (userProfile.icp_tech_stack) icpDetails.push(\`Tech Stack: \${userProfile.icp_tech_stack}\`);
      
      if (icpDetails.length > 0) {
        profileSection += \`\\n**Ideal Client Profile (ICP):**\\n\${icpDetails.join(' | ')}\\n\`;
      }
      if (userProfile.icp_additional_details) {
        profileSection += \`**Additional ICP Details:** \${userProfile.icp_additional_details}\\n\`;
      }

      // Pain Points
      const painPoints = userProfile.pain_points as Array<{ problem: string; solution?: string }> | null;
      if (painPoints && painPoints.length > 0) {
        profileSection += \`\\n**Client Pain Points:**\\n\`;
        painPoints.forEach((pp, index) => {
          profileSection += \`\${index + 1}. Problem: \${pp.problem}\`;
          if (pp.solution) profileSection += \` → Solution: \${pp.solution}\`;
          profileSection += \`\\n\`;
        });
      }

      if (userProfile.custom_notes) {
        profileSection += \`\\n**Additional Notes:** \${userProfile.custom_notes}\\n\`;
      }

      profileSection += \`
================================================================================
END OF USER PROFILE
================================================================================

IMPORTANT: You already have this user's complete business context above. DO NOT ask them basic questions about their services, ICP, or pain points - you already know this information! Instead:
1. Jump straight into generating tailored lead magnet offers based on their profile
2. Reference their specific services when creating offers
3. Address their specific pain points
4. Target their specific ICP characteristics
5. Only ask clarifying questions if you need MORE SPECIFIC details beyond what's in their profile\`;

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
        'Authorization': \`Bearer \${LOVABLE_API_KEY}\`,
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
      
      throw new Error(\`AI gateway error: \${response.status}\`);
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
            const lines = chunk.split('\\n').filter(line => line.trim() !== '');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') continue;

                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.choices?.[0]?.delta?.content;
                  if (content) {
                    fullResponse += content;
                    controller.enqueue(encoder.encode(\`data: \${JSON.stringify({ content })}\\n\\n\`));
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

          controller.enqueue(encoder.encode('data: [DONE]\\n\\n'));
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
\`\`\`

---

## Part 3: Update config.toml

Add this to your \`supabase/config.toml\` file under \`[functions]\`:

\`\`\`toml
[functions.generate-lead-magnet]
verify_jwt = false
\`\`\`

---

## Part 4: React Components

### 4.1 Main Page: src/pages/ScriptBuilder.tsx

\`\`\`tsx
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Navbar } from "@/components/Navbar";
import ChatInterface from "@/components/script-builder/ChatInterface";
import ConversationList from "@/components/script-builder/ConversationList";
import SavedScripts from "@/components/script-builder/SavedScripts";
import SavedLeadMagnets from "@/components/script-builder/SavedLeadMagnets";
import UserProfile from "@/components/script-builder/UserProfile";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const ScriptBuilder = () => {
  const navigate = useNavigate();
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [activeTab, setActiveTab] = useState("chat");
  const [initialMessage, setInitialMessage] = useState<string | undefined>(undefined);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error("Please log in to access Script Builder");
      navigate("/auth");
      return;
    }
  };

  const handleNewConversation = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("script_conversations")
        .insert({ user_id: user.id, title: "New Conversation" })
        .select()
        .single();

      if (error) throw error;

      setCurrentConversationId(data.id);
      setRefreshTrigger(prev => prev + 1);
      toast.success("New conversation started");
      return data.id;
    } catch (error: any) {
      console.error("Error creating conversation:", error);
      toast.error("Failed to create conversation");
      return null;
    }
  };

  const handleSelectConversation = (id: string) => {
    setCurrentConversationId(id);
  };

  const handleRefineInChat = useCallback(async (content: string, title: string) => {
    const newConvId = await handleNewConversation();
    if (!newConvId) return;

    const refinementPrompt = \`I want to refine this lead magnet "\${title}":\\n\\n\${content}\\n\\nPlease help me improve it. What aspects would you like me to focus on - the hook, the deliverable specifics, or the value proposition?\`;
    setInitialMessage(refinementPrompt);
    setActiveTab("chat");
    toast.success("Lead magnet loaded for refinement");
  }, []);

  const clearInitialMessage = useCallback(() => {
    setInitialMessage(undefined);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">AI Lead Magnet Builder</h1>
          <p className="text-muted-foreground">
            Create high-converting lead magnet scripts using our proven scriptwriting framework
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-2xl grid-cols-5">
            <TabsTrigger value="chat">Chat</TabsTrigger>
            <TabsTrigger value="profile">My Profile</TabsTrigger>
            <TabsTrigger value="favorites">Favorites</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="saved">Saved Scripts</TabsTrigger>
          </TabsList>

          <TabsContent value="chat" className="mt-6">
            <ChatInterface 
              conversationId={currentConversationId} 
              onNewConversation={handleNewConversation} 
              initialMessage={initialMessage} 
              onClearInitialMessage={clearInitialMessage} 
            />
          </TabsContent>

          <TabsContent value="profile" className="mt-6">
            <UserProfile />
          </TabsContent>

          <TabsContent value="favorites" className="mt-6">
            <SavedLeadMagnets onRefineInChat={handleRefineInChat} />
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            <ConversationList 
              onSelectConversation={handleSelectConversation} 
              refreshTrigger={refreshTrigger} 
            />
          </TabsContent>

          <TabsContent value="saved" className="mt-6">
            <SavedScripts />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ScriptBuilder;
\`\`\`

### 4.2 Chat Interface: src/components/script-builder/ChatInterface.tsx

\`\`\`tsx
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Send, Plus, Loader2 } from "lucide-react";
import ChatMessage from "./ChatMessage";
import WelcomeMessage from "./WelcomeMessage";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

interface ChatInterfaceProps {
  conversationId: string | null;
  onNewConversation: () => void;
  initialMessage?: string;
  onClearInitialMessage?: () => void;
}

const ChatInterface = ({ 
  conversationId, 
  onNewConversation, 
  initialMessage,
  onClearInitialMessage 
}: ChatInterfaceProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialMessage && conversationId) {
      setInput(initialMessage);
      onClearInitialMessage?.();
    }
  }, [initialMessage, conversationId, onClearInitialMessage]);

  useEffect(() => {
    if (conversationId) {
      loadMessages();
    } else {
      setMessages([]);
    }
  }, [conversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadMessages = async () => {
    try {
      const { data, error } = await supabase
        .from("script_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMessages((data as Message[]) || []);
    } catch (error: any) {
      console.error("Error loading messages:", error);
      toast.error("Failed to load messages");
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    if (!conversationId) {
      toast.error("Please start a new conversation first");
      return;
    }

    const userMessage = input.trim();
    setInput("");
    setIsLoading(true);
    setIsStreaming(true);

    const tempUserMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: userMessage,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempUserMsg]);

    const tempAssistantMsg: Message = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "",
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempAssistantMsg]);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await fetch(
        \`\${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-lead-magnet\`,
        {
          method: "POST",
          headers: {
            "Authorization": \`Bearer \${session.access_token}\`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            conversationId,
            message: userMessage,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate response");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantResponse = "";

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\\n").filter(line => line.trim() !== "");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                assistantResponse += parsed.content;
                setMessages(prev => {
                  const updated = [...prev];
                  const lastMsg = updated[updated.length - 1];
                  if (lastMsg.role === "assistant") {
                    lastMsg.content = assistantResponse;
                  }
                  return updated;
                });
              }
            } catch (e) {
              console.error("Error parsing SSE:", e);
            }
          }
        }
      }

      await loadMessages();
      setIsStreaming(false);
    } catch (error: any) {
      console.error("Error sending message:", error);
      toast.error(error.message || "Failed to send message");
      setMessages(prev => prev.slice(0, -2));
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-300px)]">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold">Chat</h2>
        <Button onClick={onNewConversation} variant="outline">
          <Plus className="mr-2 h-4 w-4" />
          New Conversation
        </Button>
      </div>

      <Card className="flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 && !conversationId && <WelcomeMessage />}
          
          {messages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message}
              conversationId={conversationId}
            />
          ))}
          
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={conversationId ? "Type your message..." : "Start a new conversation first..."}
              disabled={isLoading || !conversationId}
              className="min-h-[60px] resize-none"
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading || !conversationId}
              size="icon"
              className="h-[60px] w-[60px]"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>
          {isStreaming && (
            <p className="text-xs text-muted-foreground mt-2">AI is typing...</p>
          )}
        </div>
      </Card>
    </div>
  );
};

export default ChatInterface;
\`\`\`

### 4.3 Chat Message: src/components/script-builder/ChatMessage.tsx

\`\`\`tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check, Save, Star } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const CATEGORIES = [
  { value: "general", label: "General" },
  { value: "seo", label: "SEO" },
  { value: "ads", label: "Ads & Creatives" },
  { value: "cro", label: "CRO" },
  { value: "content", label: "Content Marketing" },
  { value: "email", label: "Email Marketing" },
  { value: "social", label: "Social Media" },
  { value: "web", label: "Web Development" },
  { value: "ai", label: "AI Services" },
  { value: "other", label: "Other" },
];

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

interface ChatMessageProps {
  message: Message;
  conversationId: string | null;
}

const ChatMessage = ({ message, conversationId }: ChatMessageProps) => {
  const [copied, setCopied] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [favoriteDialogOpen, setFavoriteDialogOpen] = useState(false);
  const [scriptTitle, setScriptTitle] = useState("");
  const [favoriteTitle, setFavoriteTitle] = useState("");
  const [favoriteCategory, setFavoriteCategory] = useState("general");

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("generated_scripts").insert({
        user_id: user.id,
        conversation_id: conversationId,
        title: scriptTitle || "Untitled Script",
        content: message.content,
      });

      if (error) throw error;

      toast.success("Script saved successfully");
      setSaveDialogOpen(false);
      setScriptTitle("");
    } catch (error: any) {
      console.error("Error saving script:", error);
      toast.error("Failed to save script");
    }
  };

  const handleSaveToFavorites = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("saved_lead_magnets").insert({
        user_id: user.id,
        conversation_id: conversationId,
        title: favoriteTitle || "Untitled Lead Magnet",
        content: message.content,
        category: favoriteCategory,
      });

      if (error) throw error;

      toast.success("Added to favorites!");
      setFavoriteDialogOpen(false);
      setFavoriteTitle("");
      setFavoriteCategory("general");
    } catch (error: any) {
      console.error("Error saving to favorites:", error);
      toast.error("Failed to save to favorites");
    }
  };

  const isAssistant = message.role === "assistant";

  return (
    <div
      className={cn(
        "flex gap-3 p-4 rounded-lg",
        isAssistant ? "bg-muted/50" : "bg-primary/5"
      )}
    >
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
        {isAssistant ? "🤖" : "👤"}
      </div>
      
      <div className="flex-1 space-y-2">
        <div className="font-semibold text-sm">
          {isAssistant ? "AI Assistant" : "You"}
        </div>
        <div className="prose prose-sm max-w-none dark:prose-invert">
          <ReactMarkdown>{message.content}</ReactMarkdown>
        </div>
        
        {isAssistant && message.content && (
          <div className="flex gap-2 mt-3">
            <Button variant="ghost" size="sm" onClick={handleCopy} className="h-8">
              {copied ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
              {copied ? "Copied" : "Copy"}
            </Button>

            <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8">
                  <Save className="h-3 w-3 mr-1" />
                  Save Script
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Save Script</DialogTitle>
                  <DialogDescription>
                    Give your script a name to save it for later reference.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Script Title</Label>
                    <Input
                      id="title"
                      placeholder="e.g., CRO Lead Magnets for SaaS"
                      value={scriptTitle}
                      onChange={(e) => setScriptTitle(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleSave}>Save</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={favoriteDialogOpen} onOpenChange={setFavoriteDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 text-yellow-600 hover:text-yellow-700">
                  <Star className="h-3 w-3 mr-1" />
                  Add to Favorites
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add to Favorites</DialogTitle>
                  <DialogDescription>
                    Save this lead magnet to your favorites for quick access.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="favorite-title">Title</Label>
                    <Input
                      id="favorite-title"
                      placeholder="e.g., 4 UGC Creatives Offer"
                      value={favoriteTitle}
                      onChange={(e) => setFavoriteTitle(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="favorite-category">Category</Label>
                    <Select value={favoriteCategory} onValueChange={setFavoriteCategory}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setFavoriteDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleSaveToFavorites} className="bg-yellow-600 hover:bg-yellow-700">
                    <Star className="h-4 w-4 mr-1" />
                    Add to Favorites
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;
\`\`\`

### 4.4 User Profile: src/components/script-builder/UserProfile.tsx

\`\`\`tsx
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Save, Loader2, Plus, X, Building2, Target, Briefcase, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface PainPoint {
  problem: string;
  solution: string;
}

interface UserScriptProfile {
  id?: string;
  company_name: string;
  company_description: string;
  services_offered: string;
  target_industries: string;
  icp_revenue_range: string;
  icp_employee_count: string;
  icp_location: string;
  icp_tech_stack: string;
  icp_additional_details: string;
  pain_points: PainPoint[];
  custom_notes: string;
}

const defaultProfile: UserScriptProfile = {
  company_name: "",
  company_description: "",
  services_offered: "",
  target_industries: "",
  icp_revenue_range: "",
  icp_employee_count: "",
  icp_location: "",
  icp_tech_stack: "",
  icp_additional_details: "",
  pain_points: [],
  custom_notes: "",
};

export default function UserProfile() {
  const [profile, setProfile] = useState<UserScriptProfile>(defaultProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pendingPainPoints, setPendingPainPoints] = useState<PainPoint[]>([{ problem: "", solution: "" }]);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("user_script_profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;

      if (data) {
        setProfile({
          id: data.id,
          company_name: data.company_name || "",
          company_description: data.company_description || "",
          services_offered: data.services_offered || "",
          target_industries: data.target_industries || "",
          icp_revenue_range: data.icp_revenue_range || "",
          icp_employee_count: data.icp_employee_count || "",
          icp_location: data.icp_location || "",
          icp_tech_stack: data.icp_tech_stack || "",
          icp_additional_details: data.icp_additional_details || "",
          pain_points: (Array.isArray(data.pain_points) ? data.pain_points : []) as unknown as PainPoint[],
          custom_notes: data.custom_notes || "",
        });
      }
    } catch (error: any) {
      console.error("Error fetching profile:", error);
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const profileData: Record<string, unknown> = {
        user_id: user.id,
        company_name: profile.company_name || null,
        company_description: profile.company_description || null,
        services_offered: profile.services_offered || null,
        target_industries: profile.target_industries || null,
        icp_revenue_range: profile.icp_revenue_range || null,
        icp_employee_count: profile.icp_employee_count || null,
        icp_location: profile.icp_location || null,
        icp_tech_stack: profile.icp_tech_stack || null,
        icp_additional_details: profile.icp_additional_details || null,
        pain_points: JSON.parse(JSON.stringify(profile.pain_points)),
        custom_notes: profile.custom_notes || null,
      };

      if (profile.id) {
        const { error } = await supabase
          .from("user_script_profiles")
          .update(profileData)
          .eq("id", profile.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("user_script_profiles")
          .insert(profileData as any)
          .select()
          .single();
        if (error) throw error;
        setProfile(prev => ({ ...prev, id: data.id }));
      }

      toast.success("Profile saved! The AI will now use this info to personalize your lead magnets.");
    } catch (error: any) {
      console.error("Error saving profile:", error);
      toast.error("Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const addPendingRow = () => {
    setPendingPainPoints(prev => [...prev, { problem: "", solution: "" }]);
  };

  const updatePendingPainPoint = (index: number, field: keyof PainPoint, value: string) => {
    setPendingPainPoints(prev => prev.map((pp, i) => 
      i === index ? { ...pp, [field]: value } : pp
    ));
  };

  const removePendingRow = (index: number) => {
    setPendingPainPoints(prev => prev.length > 1 ? prev.filter((_, i) => i !== index) : prev);
  };

  const addAllPainPoints = () => {
    const validPainPoints = pendingPainPoints.filter(pp => pp.problem.trim());
    if (validPainPoints.length === 0) {
      toast.error("Please enter at least one pain point");
      return;
    }
    setProfile(prev => ({
      ...prev,
      pain_points: [...prev.pain_points, ...validPainPoints],
    }));
    setPendingPainPoints([{ problem: "", solution: "" }]);
    toast.success(\`Added \${validPainPoints.length} pain point\${validPainPoints.length > 1 ? 's' : ''}\`);
  };

  const removePainPoint = (index: number) => {
    setProfile(prev => ({
      ...prev,
      pain_points: prev.pain_points.filter((_, i) => i !== index),
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">My Business Profile</h2>
          <p className="text-muted-foreground">
            Save your business details to get personalized lead magnet recommendations
          </p>
        </div>
        <Button onClick={saveProfile} disabled={saving}>
          {saving ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>
          ) : (
            <><Save className="mr-2 h-4 w-4" />Save Profile</>
          )}
        </Button>
      </div>

      {/* Company Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Company Information
          </CardTitle>
          <CardDescription>Tell us about your agency or business</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="company_name">Company Name</Label>
              <Input
                id="company_name"
                value={profile.company_name}
                onChange={(e) => setProfile(prev => ({ ...prev, company_name: e.target.value }))}
                placeholder="Your Agency Name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="target_industries">Target Industries</Label>
              <Input
                id="target_industries"
                value={profile.target_industries}
                onChange={(e) => setProfile(prev => ({ ...prev, target_industries: e.target.value }))}
                placeholder="e.g., E-commerce, SaaS, Healthcare"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="company_description">Company Description</Label>
            <Textarea
              id="company_description"
              value={profile.company_description}
              onChange={(e) => setProfile(prev => ({ ...prev, company_description: e.target.value }))}
              placeholder="Brief description of what your agency does..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Services */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Services Offered
          </CardTitle>
          <CardDescription>What services does your agency deliver to paying clients?</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="services_offered">Core Services</Label>
            <Textarea
              id="services_offered"
              value={profile.services_offered}
              onChange={(e) => setProfile(prev => ({ ...prev, services_offered: e.target.value }))}
              placeholder="List your main services..."
              rows={5}
            />
          </div>
        </CardContent>
      </Card>

      {/* ICP Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Ideal Client Profile (ICP)
          </CardTitle>
          <CardDescription>Describe your ideal target customer</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="icp_revenue_range">Annual Revenue Range</Label>
              <Input
                id="icp_revenue_range"
                value={profile.icp_revenue_range}
                onChange={(e) => setProfile(prev => ({ ...prev, icp_revenue_range: e.target.value }))}
                placeholder="e.g., $1M - $10M"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="icp_employee_count">Employee Count</Label>
              <Input
                id="icp_employee_count"
                value={profile.icp_employee_count}
                onChange={(e) => setProfile(prev => ({ ...prev, icp_employee_count: e.target.value }))}
                placeholder="e.g., 10-50 employees"
              />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="icp_location">Target Location</Label>
              <Input
                id="icp_location"
                value={profile.icp_location}
                onChange={(e) => setProfile(prev => ({ ...prev, icp_location: e.target.value }))}
                placeholder="e.g., USA, UK, Europe"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="icp_tech_stack">Tech Stack / Platforms</Label>
              <Input
                id="icp_tech_stack"
                value={profile.icp_tech_stack}
                onChange={(e) => setProfile(prev => ({ ...prev, icp_tech_stack: e.target.value }))}
                placeholder="e.g., Shopify, Klaviyo, Meta Ads"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="icp_additional_details">Additional ICP Details</Label>
            <Textarea
              id="icp_additional_details"
              value={profile.icp_additional_details}
              onChange={(e) => setProfile(prev => ({ ...prev, icp_additional_details: e.target.value }))}
              placeholder="Any other details about your ideal client..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Pain Points */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Client Pain Points
          </CardTitle>
          <CardDescription>What problems do your ideal clients face?</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {profile.pain_points.length > 0 && (
            <div className="space-y-3">
              {profile.pain_points.map((pp, index) => (
                <div key={index} className="flex items-start gap-3 p-3 border rounded-lg bg-muted/30">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="destructive" className="text-xs">Problem</Badge>
                      <span className="text-sm font-medium">{pp.problem}</span>
                    </div>
                    {pp.solution && (
                      <div className="flex items-center gap-2">
                        <Badge variant="default" className="text-xs">Solution</Badge>
                        <span className="text-sm text-muted-foreground">{pp.solution}</span>
                      </div>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => removePainPoint(index)} className="text-destructive hover:text-destructive">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          <Separator />
          <div className="space-y-3">
            <Label>Add New Pain Points</Label>
            <div className="space-y-2">
              {pendingPainPoints.map((pp, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    value={pp.problem}
                    onChange={(e) => updatePendingPainPoint(index, "problem", e.target.value)}
                    placeholder="Pain point / Problem..."
                    className="flex-1"
                  />
                  <Input
                    value={pp.solution}
                    onChange={(e) => updatePendingPainPoint(index, "solution", e.target.value)}
                    placeholder="How you solve it (optional)..."
                    className="flex-1"
                  />
                  <Button variant="ghost" size="icon" onClick={() => removePendingRow(index)} disabled={pendingPainPoints.length === 1 && !pp.problem && !pp.solution}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={addPendingRow}>
                <Plus className="mr-2 h-4 w-4" />Add Another Row
              </Button>
              <Button size="sm" onClick={addAllPainPoints} disabled={!pendingPainPoints.some(pp => pp.problem.trim())}>
                Confirm & Add All ({pendingPainPoints.filter(pp => pp.problem.trim()).length})
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Custom Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Notes</CardTitle>
          <CardDescription>Any other information that would help the AI understand your business better</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={profile.custom_notes}
            onChange={(e) => setProfile(prev => ({ ...prev, custom_notes: e.target.value }))}
            placeholder="e.g., We specialize in DTC brands..."
            rows={4}
          />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={saveProfile} disabled={saving} size="lg">
          {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : <><Save className="mr-2 h-4 w-4" />Save Profile</>}
        </Button>
      </div>
    </div>
  );
}
\`\`\`

### 4.5 Saved Lead Magnets: src/components/script-builder/SavedLeadMagnets.tsx

See full implementation in original project - includes search, filter by category, edit, copy, download, and delete functionality.

### 4.6 Saved Scripts: src/components/script-builder/SavedScripts.tsx

See full implementation in original project - includes copy, download, and delete functionality.

### 4.7 Conversation List: src/components/script-builder/ConversationList.tsx

See full implementation in original project - lists conversation history with delete functionality.

### 4.8 Welcome Message: src/components/script-builder/WelcomeMessage.tsx

See full implementation in original project - displays getting started guide.

---

## Part 5: Add Route to App.tsx

Add this import and route to your App.tsx:

\`\`\`tsx
import ScriptBuilder from "./pages/ScriptBuilder";

// Inside Routes:
<Route path="/script-builder" element={<AuthenticatedLayout><ScriptBuilder /></AuthenticatedLayout>} />
\`\`\`

---

## Part 6: Required Dependencies

Make sure these packages are installed:
- react-markdown
- date-fns
- lucide-react
- sonner

---

## Customization Notes

1. **System Prompt**: Modify \`BASE_SYSTEM_PROMPT\` in the edge function to customize the AI's behavior for your use case
2. **Categories**: Update the \`CATEGORIES\` array in ChatMessage.tsx and SavedLeadMagnets.tsx
3. **User Profile Fields**: Modify UserProfile.tsx and the database schema to collect different information
4. **Styling**: All components use shadcn/ui and Tailwind CSS for easy customization

---

Generated: ${new Date().toISOString()}
`;

  return (
    <div className="min-h-screen bg-background">
      {/* Print-only styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          body { font-size: 10pt; }
          pre { font-size: 8pt; white-space: pre-wrap; word-wrap: break-word; }
          .page-break { page-break-before: always; }
          h2 { page-break-before: always; }
          h2:first-of-type { page-break-before: avoid; }
        }
        @media screen {
          .print-only { display: none; }
        }
      `}</style>

      {/* Header - hidden when printing */}
      <div className="no-print sticky top-0 z-50 bg-background border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">AI Chat Builder Implementation Guide</h1>
          <div className="flex gap-2">
            <Button onClick={handleCopyAll} variant="outline">
              {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
              {copied ? "Copied!" : "Copy All"}
            </Button>
            <Button onClick={handlePrint}>
              <FileDown className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <h1 className="text-3xl font-bold mb-2">AI Chat Builder - Complete Implementation Guide</h1>
          <p className="text-muted-foreground mb-8">
            This guide contains everything needed to replicate the AI Lead Magnet Script Builder feature in another Lovable project.
          </p>

          {/* Part 1: SQL Schema */}
          <Card className="mb-6">
            <button 
              onClick={() => toggleSection('sql')} 
              className="no-print w-full p-4 flex items-center justify-between text-left"
            >
              <h2 className="text-xl font-semibold m-0">Part 1: Database Schema (SQL Migration)</h2>
              {expandedSections.sql ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </button>
            <div className={`px-4 pb-4 ${expandedSections.sql ? '' : 'no-print hidden'}`}>
              <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs">
{`-- =============================================
-- SCRIPT BUILDER DATABASE SCHEMA
-- =============================================

-- 1. Script Conversations Table
CREATE TABLE public.script_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT DEFAULT 'New Conversation',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.script_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own conversations" 
  ON public.script_conversations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own conversations" 
  ON public.script_conversations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own conversations" 
  ON public.script_conversations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own conversations" 
  ON public.script_conversations FOR DELETE USING (auth.uid() = user_id);

-- 2. Script Messages Table
CREATE TABLE public.script_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.script_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.script_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages from own conversations" 
  ON public.script_messages FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.script_conversations WHERE id = script_messages.conversation_id AND user_id = auth.uid()));
CREATE POLICY "Users can create messages in own conversations" 
  ON public.script_messages FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM public.script_conversations WHERE id = script_messages.conversation_id AND user_id = auth.uid()));

-- 3. User Script Profiles Table
CREATE TABLE public.user_script_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  company_name TEXT,
  company_description TEXT,
  services_offered TEXT,
  target_industries TEXT,
  icp_revenue_range TEXT,
  icp_employee_count TEXT,
  icp_location TEXT,
  icp_tech_stack TEXT,
  icp_additional_details TEXT,
  pain_points JSONB DEFAULT '[]',
  custom_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_script_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.user_script_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own profile" ON public.user_script_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.user_script_profiles FOR UPDATE USING (auth.uid() = user_id);

-- 4. Saved Lead Magnets Table
CREATE TABLE public.saved_lead_magnets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  conversation_id UUID REFERENCES public.script_conversations(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.saved_lead_magnets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own lead magnets" ON public.saved_lead_magnets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own lead magnets" ON public.saved_lead_magnets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own lead magnets" ON public.saved_lead_magnets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own lead magnets" ON public.saved_lead_magnets FOR DELETE USING (auth.uid() = user_id);

-- 5. Generated Scripts Table
CREATE TABLE public.generated_scripts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  conversation_id UUID REFERENCES public.script_conversations(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  icp_details JSONB,
  pain_points JSONB,
  services TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.generated_scripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own scripts" ON public.generated_scripts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own scripts" ON public.generated_scripts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own scripts" ON public.generated_scripts FOR DELETE USING (auth.uid() = user_id);`}
              </pre>
            </div>
          </Card>

          {/* Part 2: Edge Function */}
          <Card className="mb-6 page-break">
            <button 
              onClick={() => toggleSection('edge')} 
              className="no-print w-full p-4 flex items-center justify-between text-left"
            >
              <h2 className="text-xl font-semibold m-0">Part 2: Edge Function (generate-lead-magnet)</h2>
              {expandedSections.edge ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </button>
            <div className={`px-4 pb-4 ${expandedSections.edge ? '' : 'no-print hidden'}`}>
              <p className="text-sm text-muted-foreground mb-2">
                Create file: <code>supabase/functions/generate-lead-magnet/index.ts</code>
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                This edge function uses the Lovable AI Gateway (google/gemini-2.5-flash) - no API key needed!
              </p>
              <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs max-h-[600px] overflow-y-auto">
{`import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const requestSchema = z.object({
  conversationId: z.string().uuid(),
  message: z.string().trim().min(1).max(5000)
});

const BASE_SYSTEM_PROMPT = \`You are an elite consultant and direct response copywriter...
[CUSTOMIZE THIS PROMPT FOR YOUR USE CASE]
\`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { conversationId, message } = requestSchema.parse(await req.json());

    // Fetch user profile for personalization
    const { data: userProfile } = await supabase
      .from('user_script_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    let systemPrompt = BASE_SYSTEM_PROMPT;
    if (userProfile) {
      // Add profile context to system prompt
      systemPrompt += \`\\n\\nUser Profile: \${JSON.stringify(userProfile)}\`;
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

    // Call Lovable AI Gateway
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': \`Bearer \${Deno.env.get('LOVABLE_API_KEY')}\`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          ...(messages || []),
          { role: 'user', content: message },
        ],
        stream: true,
        temperature: 0.8,
      }),
    });

    // Stream response (see full implementation)
    // Save assistant message when complete
    
    return new Response(stream, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});`}
              </pre>
            </div>
          </Card>

          {/* Part 3: Config */}
          <Card className="mb-6">
            <button 
              onClick={() => toggleSection('config')} 
              className="no-print w-full p-4 flex items-center justify-between text-left"
            >
              <h2 className="text-xl font-semibold m-0">Part 3: Update config.toml</h2>
              {expandedSections.config ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </button>
            <div className={`px-4 pb-4 ${expandedSections.config ? '' : 'no-print hidden'}`}>
              <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs">
{`[functions.generate-lead-magnet]
verify_jwt = false`}
              </pre>
            </div>
          </Card>

          {/* Part 4: Components */}
          <Card className="mb-6 page-break">
            <button 
              onClick={() => toggleSection('components')} 
              className="no-print w-full p-4 flex items-center justify-between text-left"
            >
              <h2 className="text-xl font-semibold m-0">Part 4: React Components (8 files)</h2>
              {expandedSections.components ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </button>
            <div className={`px-4 pb-4 ${expandedSections.components ? '' : 'no-print hidden'}`}>
              <p className="text-muted-foreground mb-4">
                The following components need to be created in <code>src/components/script-builder/</code>:
              </p>
              <ul className="list-disc list-inside space-y-2 text-sm">
                <li><strong>ScriptBuilder.tsx</strong> - Main page with tabs</li>
                <li><strong>ChatInterface.tsx</strong> - Chat UI with streaming</li>
                <li><strong>ChatMessage.tsx</strong> - Message display with save actions</li>
                <li><strong>UserProfile.tsx</strong> - Business profile form</li>
                <li><strong>SavedLeadMagnets.tsx</strong> - Favorites with search/filter</li>
                <li><strong>SavedScripts.tsx</strong> - Saved scripts list</li>
                <li><strong>ConversationList.tsx</strong> - Conversation history</li>
                <li><strong>WelcomeMessage.tsx</strong> - Getting started guide</li>
              </ul>
              <p className="text-muted-foreground mt-4">
                Copy the complete implementation from the original project or use the "Copy All" button above to get the full markdown with all code.
              </p>
            </div>
          </Card>

          {/* Part 5: Routes */}
          <Card className="mb-6">
            <button 
              onClick={() => toggleSection('routes')} 
              className="no-print w-full p-4 flex items-center justify-between text-left"
            >
              <h2 className="text-xl font-semibold m-0">Part 5: Add Route to App.tsx</h2>
              {expandedSections.routes ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </button>
            <div className={`px-4 pb-4 ${expandedSections.routes ? '' : 'no-print hidden'}`}>
              <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs">
{`import ScriptBuilder from "./pages/ScriptBuilder";

// Inside Routes:
<Route path="/script-builder" element={<AuthenticatedLayout><ScriptBuilder /></AuthenticatedLayout>} />`}
              </pre>
            </div>
          </Card>

          {/* Part 6: Dependencies */}
          <Card className="mb-6">
            <button 
              onClick={() => toggleSection('deps')} 
              className="no-print w-full p-4 flex items-center justify-between text-left"
            >
              <h2 className="text-xl font-semibold m-0">Part 6: Required Dependencies</h2>
              {expandedSections.deps ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </button>
            <div className={`px-4 pb-4 ${expandedSections.deps ? '' : 'no-print hidden'}`}>
              <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs">
{`react-markdown
date-fns
lucide-react
sonner`}
              </pre>
            </div>
          </Card>

          {/* Footer */}
          <div className="text-center text-muted-foreground text-sm mt-8 pb-8">
            <p>Generated: {new Date().toLocaleString()}</p>
            <p className="no-print mt-2">
              Click "Download PDF" to save this guide, or "Copy All" to paste the full markdown into another Lovable project.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImplementationGuide;
