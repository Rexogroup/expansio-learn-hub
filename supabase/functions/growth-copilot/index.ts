import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GrowthStep {
  id: string;
  step_number: number;
  name: string;
  description: string;
  benchmark_kpi_name: string;
  benchmark_kpi_value: number;
  benchmark_kpi_unit: string;
  help_content: string;
}

interface CampaignData {
  campaign_name: string;
  emails_sent: number;
  unique_replies: number;
  interested_count: number;
  reply_rate: number;
  interested_rate: number;
  campaign_status: string;
}

interface UserProgress {
  step_id: string;
  status: string;
  current_kpi_value: number | null;
  attempts: number;
}

interface InfrastructureAlert {
  email_address: string;
  alert_type: string;
  severity: string;
  current_value: number;
  threshold_value: number;
  recommended_action: string;
}

interface RequestBody {
  type: 'diagnose' | 'recommend' | 'chat';
  message?: string;
  context?: {
    currentStep?: number;
    focusCampaignId?: string;
  };
  conversationHistory?: Array<{ role: string; content: string }>;
}

interface KnowledgeBaseDoc {
  title: string;
  category: string;
  extracted_content: string;
}

interface CallAnalysis {
  title: string;
  overall_score: number;
  objections_identified: number;
  close_confidence: number;
  gap_selling: {
    gap_articulation_score?: number;
    missed_opportunities?: string[];
  } | null;
  improvements: string[] | null;
  created_at: string;
}

interface ObjectionAsset {
  title: string;
  content: {
    objection_category?: string;
    objection_text?: string;
    suggested_response?: string;
    coaching_notes?: string;
    score?: number;
  };
}

interface ObjectionCluster {
  category: string;
  cluster_name: string;
  representative_objection: string;
  variations: string[];
  best_response: string | null;
  best_response_score: number | null;
  total_occurrences: number;
  avg_handling_score: number | null;
}

interface ReplyAsset {
  title: string;
  content: {
    original_message?: string;
    sent_response?: string;
    lead_email?: string;
    campaign_name?: string;
    reply_type?: string;
  };
  performance_data: {
    outcome?: string;
    time_to_book_hours?: number;
    classification_reason?: string;
  };
  asset_type: 'winning_reply' | 'losing_reply';
}

function buildKnowledgeBaseSection(docs: KnowledgeBaseDoc[]): string {
  if (!docs || docs.length === 0) return '';

  const byCategory = docs.reduce((acc, doc) => {
    const cat = doc.category || 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(doc);
    return acc;
  }, {} as Record<string, KnowledgeBaseDoc[]>);

  const categoryLabels: Record<string, string> = {
    'examples': 'Winning Script Examples',
    'lead_magnet': 'Lead Magnet Best Practices',
    'framework': 'Frameworks & Methodologies',
    'icp': 'ICP Templates',
    'pain_points': 'Pain Point References',
    'objections': 'Objection Handling',
    'scripts': 'Script Templates',
    'appointment_setting': 'Appointment Setting Templates',
    'other': 'Additional Resources'
  };

  // Prioritize categories that are most actionable
  const categoryOrder = ['examples', 'scripts', 'appointment_setting', 'framework', 'objections', 'lead_magnet', 'icp', 'pain_points', 'other'];
  
  let section = '\n## KNOWLEDGE BASE (Reference for Recommendations)\n\n';
  let totalChars = 0;
  const maxTotalChars = 15000; // Limit total KB content to prevent token overflow

  for (const category of categoryOrder) {
    if (!byCategory[category]) continue;
    
    section += `### ${categoryLabels[category] || category}\n`;
    for (const doc of byCategory[category]) {
      if (totalChars >= maxTotalChars) break;
      
      // Truncate each document to ~1500 chars
      const content = doc.extracted_content?.substring(0, 1500) || '';
      const docSection = `**${doc.title}:**\n${content}\n\n`;
      totalChars += docSection.length;
      section += docSection;
    }
    if (totalChars >= maxTotalChars) break;
  }

  return section;
}

interface UserScriptAsset {
  title: string;
  content: string;
  performance_data: {
    emails_sent: number;
    interested_rate: number;
    emails_per_lead: number | null;
    classification: string;
    classification_reason: string;
  };
  asset_type: 'winning_script' | 'losing_script';
}

function buildUserScriptsSection(assets: UserScriptAsset[]): string {
  if (!assets || assets.length === 0) return '';

  const winners = assets.filter(a => a.asset_type === 'winning_script');
  const losers = assets.filter(a => a.asset_type === 'losing_script');

  let section = '\n## YOUR PROVEN SCRIPTS (Personalized Learning)\n\n';
  section += 'These are YOUR actual campaign scripts that have been automatically classified based on performance data.\n\n';

  if (winners.length > 0) {
    section += '### 🏆 Your Winning Scripts (SCALE these patterns)\n';
    section += 'Use these as templates for new campaigns. They have proven to work for YOUR audience.\n\n';
    for (const w of winners) {
      const perf = w.performance_data;
      let contentData: { subject_line?: string; email_body?: string } = {};
      try {
        contentData = typeof w.content === 'string' ? JSON.parse(w.content) : w.content;
      } catch {
        contentData = {};
      }
      section += `- **${w.title}**\n`;
      section += `  - IR: ${perf.interested_rate?.toFixed(1) || 'N/A'}% | Emails/Lead: ${perf.emails_per_lead || 'N/A'} | Sent: ${perf.emails_sent?.toLocaleString() || 0}\n`;
      if (contentData.subject_line) {
        section += `  - Subject: "${contentData.subject_line}"\n`;
      }
      if (contentData.email_body) {
        section += `  - Offer/Body: "${contentData.email_body.substring(0, 300)}${contentData.email_body.length > 300 ? '...' : ''}"\n`;
      }
      section += `  - Why it works: ${perf.classification_reason}\n\n`;
    }
  }

  if (losers.length > 0) {
    section += '### ⚠️ Scripts That Didn\'t Work (Avoid these patterns)\n';
    section += 'Learn from these failures. Do NOT replicate these approaches.\n\n';
    for (const l of losers) {
      const perf = l.performance_data;
      let contentData: { subject_line?: string; email_body?: string } = {};
      try {
        contentData = typeof l.content === 'string' ? JSON.parse(l.content) : l.content;
      } catch {
        contentData = {};
      }
      section += `- **${l.title}**\n`;
      section += `  - IR: ${perf.interested_rate?.toFixed(1) || 'N/A'}% | Emails/Lead: ${perf.emails_per_lead || 'N/A'} | Sent: ${perf.emails_sent?.toLocaleString() || 0}\n`;
      if (contentData.subject_line) {
        section += `  - Subject: "${contentData.subject_line}"\n`;
      }
      if (contentData.email_body) {
        section += `  - Offer/Body: "${contentData.email_body.substring(0, 300)}${contentData.email_body.length > 300 ? '...' : ''}"\n`;
      }
      section += `  - Why it failed: ${perf.classification_reason}\n\n`;
    }
  }

  section += '**IMPORTANT**: When recommending scripts or iterations, always consider what has worked and NOT worked for this specific user. Personalize recommendations based on their proven patterns.\n';

  return section;
}

function buildSalesInsightsSection(
  analyses: CallAnalysis[], 
  objections: ObjectionAsset[],
  clusters: ObjectionCluster[]
): string {
  if ((!analyses || analyses.length === 0) && (!objections || objections.length === 0) && (!clusters || clusters.length === 0)) return '';

  let section = '\n## SALES CALL INTELLIGENCE (From Your Analyzed Calls)\n\n';

  if (analyses && analyses.length > 0) {
    const avgScore = analyses.reduce((sum, a) => sum + (a.overall_score || 0), 0) / analyses.length;
    const avgConfidence = analyses.reduce((sum, a) => sum + (a.close_confidence || 0), 0) / analyses.length;
    const totalObjections = analyses.reduce((sum, a) => sum + (a.objections_identified || 0), 0);

    section += '### Recent Call Performance\n';
    section += `- Calls analyzed: ${analyses.length}\n`;
    section += `- Average score: ${avgScore.toFixed(1)}/10\n`;
    section += `- Average close confidence: ${avgConfidence.toFixed(0)}%\n`;
    section += `- Total objections faced: ${totalObjections}\n\n`;

    // Extract GAP selling insights
    const allMissedOpportunities: string[] = [];
    for (const analysis of analyses) {
      if (analysis.gap_selling?.missed_opportunities) {
        allMissedOpportunities.push(...analysis.gap_selling.missed_opportunities);
      }
    }

    if (allMissedOpportunities.length > 0) {
      // Count frequency of each missed opportunity
      const opCounts = allMissedOpportunities.reduce((acc, op) => {
        acc[op] = (acc[op] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const topMissed = Object.entries(opCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);

      section += '### GAP Selling Opportunities to Address\n';
      section += 'Common missed opportunities from your calls:\n';
      for (const [op, count] of topMissed) {
        section += `- ${op} (seen in ${count} call${count > 1 ? 's' : ''})\n`;
      }
      section += '\n';
    }

    // Extract common improvements
    const allImprovements: string[] = [];
    for (const analysis of analyses) {
      if (analysis.improvements && Array.isArray(analysis.improvements)) {
        allImprovements.push(...analysis.improvements.slice(0, 2));
      }
    }

    if (allImprovements.length > 0) {
      section += '### Coaching Focus Areas\n';
      section += 'Based on your calls, focus on:\n';
      const uniqueImprovements = [...new Set(allImprovements)].slice(0, 4);
      for (const imp of uniqueImprovements) {
        section += `- ${imp}\n`;
      }
      section += '\n';
    }
  }

  // Use clusters if available (preferred), otherwise fall back to raw objections
  if (clusters && clusters.length > 0) {
    section += '### 🎯 Your Objection Patterns (AI-Clustered Intelligence)\n';
    section += 'Semantically similar objections have been grouped together for pattern recognition.\n\n';

    // Sort by total occurrences and identify mastered vs struggling
    const sortedClusters = [...clusters].sort((a, b) => b.total_occurrences - a.total_occurrences);
    const masteredClusters = sortedClusters.filter(c => (c.avg_handling_score || 0) >= 7);
    const strugglingClusters = sortedClusters.filter(c => (c.avg_handling_score || 0) < 6 && (c.avg_handling_score || 0) > 0);

    if (masteredClusters.length > 0) {
      section += '**🏆 Mastered Objections (Avg Score ≥7):**\n';
      for (const cluster of masteredClusters.slice(0, 3)) {
        section += `- **${cluster.cluster_name}** (${cluster.category})\n`;
        section += `  - Seen ${cluster.total_occurrences}x | Avg score: ${cluster.avg_handling_score?.toFixed(1) || 'N/A'}/10\n`;
        if (cluster.best_response) {
          section += `  - Best response (${cluster.best_response_score}/10): "${cluster.best_response.substring(0, 150)}${cluster.best_response.length > 150 ? '...' : ''}"\n`;
        }
      }
      section += '\n';
    }

    if (strugglingClusters.length > 0) {
      section += '**⚠️ Needs Improvement (Avg Score <6):**\n';
      for (const cluster of strugglingClusters.slice(0, 3)) {
        section += `- **${cluster.cluster_name}** (${cluster.category})\n`;
        section += `  - Seen ${cluster.total_occurrences}x | Avg score: ${cluster.avg_handling_score?.toFixed(1) || 'N/A'}/10\n`;
        section += `  - Example: "${cluster.representative_objection.substring(0, 100)}${cluster.representative_objection.length > 100 ? '...' : ''}"\n`;
        if (cluster.variations && cluster.variations.length > 0) {
          section += `  - Also heard as: "${cluster.variations[0].substring(0, 80)}${cluster.variations[0].length > 80 ? '...' : ''}"\n`;
        }
      }
      section += '\n';
    }

    // Show top objections by frequency
    section += '**Most Frequent Objection Patterns:**\n';
    for (const cluster of sortedClusters.slice(0, 5)) {
      section += `- ${cluster.cluster_name} (${cluster.category}): ${cluster.total_occurrences}x, avg ${cluster.avg_handling_score?.toFixed(1) || 'N/A'}/10\n`;
    }
    section += '\n';

  } else if (objections && objections.length > 0) {
    // Fallback to raw objections if no clusters exist
    section += '### Your Objection Playbook\n';
    section += 'These objections have been captured from your sales calls:\n\n';

    const byCategory: Record<string, ObjectionAsset[]> = {};
    for (const obj of objections) {
      const cat = obj.content?.objection_category || 'general';
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(obj);
    }

    for (const [category, objs] of Object.entries(byCategory)) {
      section += `**${category.charAt(0).toUpperCase() + category.slice(1)}:**\n`;
      for (const obj of objs.slice(0, 3)) {
        const text = obj.content?.objection_text || obj.title;
        const response = obj.content?.suggested_response;
        section += `- "${text.substring(0, 100)}${text.length > 100 ? '...' : ''}"\n`;
        if (response) {
          section += `  → Suggested response: "${response.substring(0, 150)}${response.length > 150 ? '...' : ''}"\n`;
        }
      }
    }
    section += '\n';
  }

  section += '**IMPORTANT**: When the user asks about closing deals, handle objections, or improve their sales calls, reference these specific insights from THEIR call history. Use PROVEN patterns from their clustered data.\n';

  return section;
}

function buildAppointmentSettingSection(
  winningReplies: ReplyAsset[],
  losingReplies: ReplyAsset[],
  replyStats: { total: number; meetingsBooked: number; conversionRate: number }
): string {
  if (winningReplies.length === 0 && losingReplies.length === 0 && replyStats.total === 0) return '';

  let section = '\n## APPOINTMENT SETTING INTELLIGENCE (From Your Reply Outcomes)\n\n';

  section += '### Your Booking Performance\n';
  section += `- Total replies handled: ${replyStats.total}\n`;
  section += `- Meetings booked: ${replyStats.meetingsBooked}\n`;
  section += `- Conversion rate: ${replyStats.conversionRate.toFixed(1)}%\n\n`;

  if (winningReplies.length > 0) {
    section += '### 🏆 Your Winning Reply Patterns (These got meetings!)\n';
    section += 'Use these as templates - they have proven to convert for YOUR leads.\n\n';

    for (const reply of winningReplies.slice(0, 5)) {
      const content = typeof reply.content === 'string' ? JSON.parse(reply.content) : reply.content;
      const perf = reply.performance_data;

      section += `- **${reply.title}**\n`;
      if (content.campaign_name) {
        section += `  - Campaign: ${content.campaign_name}\n`;
      }
      if (content.reply_type) {
        section += `  - Lead type: ${content.reply_type}\n`;
      }
      if (perf.time_to_book_hours) {
        section += `  - Time to book: ${perf.time_to_book_hours} hours\n`;
      }
      if (content.sent_response) {
        section += `  - Response used: "${content.sent_response.substring(0, 200)}${content.sent_response.length > 200 ? '...' : ''}"\n`;
      }
      section += '\n';
    }
  }

  if (losingReplies.length > 0) {
    section += '### ⚠️ Reply Patterns to Avoid\n';
    section += 'These responses did NOT convert. Learn from these failures.\n\n';

    for (const reply of losingReplies.slice(0, 3)) {
      const content = typeof reply.content === 'string' ? JSON.parse(reply.content) : reply.content;
      const perf = reply.performance_data;

      section += `- **${reply.title}**\n`;
      if (content.reply_type) {
        section += `  - Lead type: ${content.reply_type}\n`;
      }
      section += `  - Outcome: ${perf.outcome || 'no response'}\n`;
      if (content.sent_response) {
        section += `  - Response used: "${content.sent_response.substring(0, 150)}${content.sent_response.length > 150 ? '...' : ''}"\n`;
      }
      section += `  - Why it failed: ${perf.classification_reason || 'No response after 7+ days'}\n`;
      section += '\n';
    }
  }

  section += '**IMPORTANT**: When recommending appointment setting responses, ALWAYS reference patterns from winning replies. When the user asks "why am I not booking meetings?", compare their approach to these proven patterns.\n';

  return section;
}

function buildSystemPrompt(
  growthSteps: GrowthStep[],
  currentStep: GrowthStep | null,
  userProgress: UserProgress | null,
  campaigns: CampaignData[],
  totalMetrics: { emails_sent: number; replies: number; interested: number; reply_rate: number; interested_rate: number },
  infrastructureAlerts: InfrastructureAlert[],
  knowledgeBaseContent: string,
  userScriptsContent: string,
  salesInsightsContent: string,
  appointmentSettingContent: string
): string {
  const topCampaigns = [...campaigns]
    .filter(c => c.emails_sent >= 1000)
    .sort((a, b) => b.interested_rate - a.interested_rate)
    .slice(0, 3);

  const lowCampaigns = [...campaigns]
    .filter(c => c.emails_sent > 1000 && c.interested_rate < 1.0)
    .sort((a, b) => a.interested_rate - b.interested_rate)
    .slice(0, 3);

  // Build infrastructure alerts section
  const criticalAlerts = infrastructureAlerts.filter(a => a.severity === 'critical');
  const warningAlerts = infrastructureAlerts.filter(a => a.severity === 'warning');

  let infrastructureSection = '';
  if (infrastructureAlerts.length > 0) {
    infrastructureSection = `
### ⚠️ INFRASTRUCTURE ALERTS (Background Context)
${criticalAlerts.length > 0 ? `
**CRITICAL ALERTS (${criticalAlerts.length}):**
${criticalAlerts.map(a => `- ${a.email_address}: ${a.alert_type === 'high_bounce_rate' ? `Bounce Rate ${a.current_value.toFixed(2)}%` : `Health Score ${a.current_value.toFixed(0)}%`} (threshold: ${a.threshold_value}${a.alert_type === 'high_bounce_rate' ? '%' : ''})`).join('\n')}
` : ''}
${warningAlerts.length > 0 ? `
**WARNING ALERTS (${warningAlerts.length}):**
${warningAlerts.map(a => `- ${a.email_address}: ${a.alert_type === 'high_bounce_rate' ? `Bounce Rate ${a.current_value.toFixed(2)}%` : `Health Score ${a.current_value.toFixed(0)}%`} (threshold: ${a.threshold_value}${a.alert_type === 'high_bounce_rate' ? '%' : ''})`).join('\n')}
` : ''}

**CONTEXT RULE**: Only mention infrastructure alerts when:
- The user explicitly asks about infrastructure, deliverability, or email health
- The user asks a general "diagnose my performance" or "what should I do next" question
- The topic is directly related to deliverability (e.g., low reply rates could be caused by infrastructure)

Do NOT mention infrastructure alerts when the user asks about:
- Close rate, sales closing, or proposal strategies
- Objection handling or sales call improvement
- Show rate or meeting attendance
- Appointment setting or follow-up sequences
- Any topic where infrastructure is not directly relevant
`;
  }

  return `You are the Growth OS Copilot, an expert AI advisor for B2B cold outbound agencies. You help users optimize their outbound campaigns and progress through the 7-step growth framework.

## YOUR KNOWLEDGE BASE

### The 7-Step Growth Framework
${growthSteps.map(s => `- Step ${s.step_number}: ${s.name} (Benchmark: ${s.benchmark_kpi_value}${s.benchmark_kpi_unit === 'percent' ? '%' : ''} ${s.benchmark_kpi_name})`).join('\n')}

### User's Current Position
- Current Step: ${currentStep ? `${currentStep.step_number} - ${currentStep.name}` : 'Unknown'}
- Status: ${userProgress?.status || 'not_started'}
- Attempts at this step: ${userProgress?.attempts || 0}

### Overall Campaign Performance
- Total Emails Sent: ${totalMetrics.emails_sent.toLocaleString()}
- Total Replies: ${totalMetrics.replies.toLocaleString()} (${totalMetrics.reply_rate.toFixed(2)}%)
- Total Interested: ${totalMetrics.interested.toLocaleString()} (${totalMetrics.interested_rate.toFixed(2)}%)

### Benchmark Comparisons
${currentStep ? `- Current KPI (${currentStep.benchmark_kpi_name}): ${totalMetrics.interested_rate.toFixed(2)}% vs ${currentStep.benchmark_kpi_value}% benchmark
- Gap: ${(currentStep.benchmark_kpi_value - totalMetrics.interested_rate).toFixed(2)}%` : 'No benchmark data available'}

### Top Performing Campaigns
${topCampaigns.length > 0 ? topCampaigns.map(c => `- ${c.campaign_name}: ${c.interested_rate.toFixed(2)}% IR (${c.emails_sent.toLocaleString()} sent)`).join('\n') : 'No top performers identified yet'}

### Underperforming Campaigns (Consider Pausing)
${lowCampaigns.length > 0 ? lowCampaigns.map(c => `- ${c.campaign_name}: ${c.interested_rate.toFixed(2)}% IR (${c.emails_sent.toLocaleString()} sent) - Below benchmark`).join('\n') : 'No underperformers identified'}
${infrastructureSection}

## EMAIL INFRASTRUCTURE HEALTH RULES

### Bounce Rate Diagnostics
- < 1%: Excellent deliverability - safe to scale sending volume
- 1% - 2%: Warning zone - monitor closely, consider reducing volume
- > 2%: CRITICAL - pause account immediately for 14 days minimum

### Health Score Diagnostics
- 90% - 100%: Healthy - can send at full capacity
- 70% - 90%: Needs attention - reduce sending volume by 50%
- < 70%: Critical - pause from campaigns, warmup only mode

### Recovery Protocol for At-Risk Email Accounts
1. **Immediate Action**: Remove the account from all active campaigns immediately
2. **Enable Warmup**: Keep warmup enabled (or re-enable if disabled) to maintain sender reputation
3. **Wait Period**: Wait 14 days minimum without any campaign sending from this account
4. **Monitor Daily**: Check health score and bounce rate daily until both return to healthy levels
5. **Gradual Resume**: When health returns to 100%, resume campaigns at 25% of normal volume
6. **Scale Carefully**: Increase volume by 20-30% per week only if metrics stay healthy

### Common Causes of High Bounce Rates
- Poor quality lead lists with invalid/outdated email addresses
- Sending to purchased email lists
- Domain reputation issues from previous spam reports
- Hitting spam traps (recycled or typo domains)
- Technical issues with email authentication (SPF, DKIM, DMARC)

### Prevention Best Practices
- Always verify email lists before importing (use email verification services)
- Remove bounced addresses immediately after each campaign
- Maintain active warmup for ALL sending accounts
- Don't exceed 15-20 emails/day per account during warmup
- Use domain health monitoring tools
- Keep bounce rate under 1% at all times

## DIAGNOSTIC RULES

### Positive Reply Rate (IR%) Diagnostics
NOTE: IR% is calculated as (Interested / Total Replies) × 100 — the conversion rate from replies to interested.
Benchmark: 15-20% positive reply rate.
- < 5%: Critical - Reply-to-interested conversion is failing. Offer/messaging mismatch. KILL this variant.
- 5% - 10%: Poor - Replies aren't converting well. Test new offer angles, refine ICP. ITERATE urgently.
- 10% - 15%: Near benchmark - Minor optimizations needed. Tweak messaging. ITERATE.
- 15% - 20%: At benchmark - Good performance. Continue monitoring. Ready to SCALE.
- > 20%: Above benchmark - Excellent conversion. SCALE immediately.

### Emails per Interested Lead Diagnostics
This measures efficiency: how many emails does it take to generate one interested lead?
- < 250: ELITE - Scale heavily, this is exceptional performance
- 250 - 500: STRONG - Scale and iterate for even better results
- 500 - 700: GOOD - Improve offer positioning, test new angles
- 700 - 1000: NEEDS WORK - Evaluate ICP and messaging
- > 1000: POOR - Kill or completely rewrite. Not viable.

### Interested → Meeting Rate Diagnostics
This measures appointment-setting effectiveness.
Benchmark: 20-30% of interested leads should convert to meetings.
- < 15%: Critical - Follow-up process is broken. Fix immediately.
- 15% - 20%: Needs improvement - Optimize speed-to-lead and follow-up scripts.
- 20% - 30%: At benchmark - Good performance.
- > 30%: Excellent - Top-tier appointment setting.

### Variant Analysis Rules
When analyzing A/B variants:
- **MINIMUM SAMPLE**: Do NOT evaluate or recommend actions for variants with < 1000 emails sent. Tell users to wait for more data.
- **WINNER**: Variant with highest IR% AND at least 1000 emails sent (statistical significance)
- **SCALE**: IR% > 15% AND emails_per_lead < 500 after 1000+ emails - recommend increasing volume immediately
- **ITERATE**: IR% between 10-15% OR emails_per_lead between 500-700 after 1000+ emails - suggest specific tweaks
- **KILL**: IR% < 5% after 1000 emails OR emails_per_lead > 1000 after 1000 emails - recommend pausing and replacing

### Campaign Scaling Rules (From SOP)
- **Minimum sample size**: 1000 emails per variant before making ANY decisions
- **Scale criteria**: IR% > 15% AND emails_per_lead < 500 (requires 1000+ emails)
- **Pause criteria**: IR% < 5% after 1000 sends OR 0 interested after 1000 sends
- **Test methodology**: Always run 2-3 variants before declaring a winner
- **Volume scaling**: Increase by 20-30% per week when metrics are healthy

${knowledgeBaseContent}

${userScriptsContent}

${appointmentSettingContent}

${salesInsightsContent}

## YOUR ROLE
1. **Focus on the user's specific question first** - understand what topic they're asking about and stay on-topic
2. Only mention infrastructure alerts if the question relates to deliverability, general performance diagnosis, or low reply/interest rates
3. Diagnose where the user is struggling based on their data
4. Compare their metrics to benchmarks and identify gaps
5. **Analyze variants** and recommend which to SCALE, ITERATE, or KILL based on IR%
6. **Reference the Knowledge Base, user's proven scripts, AND their sales call insights** to provide specific recommendations
7. When suggesting appointment setting improvements, cite examples from their winning replies
8. When discussing sales calls or objections, reference their objection playbook
9. Provide ONE clear, actionable next step with a concrete example
10. Guide them to the next step in the framework when ready

## HOW TO USE APPOINTMENT SETTING INTELLIGENCE
- When user asks "why am I not booking meetings?", reference their winning/losing reply patterns
- Compare their reply approach to proven winning patterns
- Reference appointment_setting KB materials for frameworks
- Suggest templates based on what has worked for THEIR leads

## HOW TO USE SALES CALL INTELLIGENCE  
- When user asks about closing deals, reference their call analysis scores
- Use their objection playbook to suggest responses
- Reference GAP selling missed opportunities for coaching
- Compare their performance to benchmarks

## HOW TO USE PERSONALIZED SCRIPTS
- FIRST check if the user has any winning_script assets - these are PROVEN to work for THEIR audience
- When recommending new scripts, suggest patterns similar to their winning scripts
- When the user has losing_script assets, explicitly warn against those patterns
- Personalize ALL recommendations based on what has worked and not worked for THIS user

## HOW TO USE KNOWLEDGE BASE
- Reference specific winning script examples when recommending iterations
- Cite framework docs when explaining best practices
- Use lead magnet examples when suggesting new angles to test
- When recommending ITERATE, provide a specific example from the knowledge base

## RESPONSE STYLE
- Be direct, concise, and data-driven
- Reference specific numbers from their campaigns
- When analyzing variants, clearly state: SCALE, ITERATE, or KILL for each
- Prioritize ONE clear action over multiple suggestions
- Explain WHY based on the data
- Use bullet points for clarity
- Keep responses under 250 words unless asked for detail
- **CRITICAL**: Answer the user's specific question. Do NOT mention unrelated topics (like infrastructure alerts when asked about close rate)`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body: RequestBody = await req.json();
    const { type, message, conversationHistory = [] } = body;

    console.log(`Growth Copilot request: type=${type}, user=${user.id}`);

    // Fetch all context data in parallel (including infrastructure alerts, knowledge base, user scripts, sales insights, and reply data)
    const [
      { data: growthSteps },
      { data: userProgress },
      { data: campaigns },
      { data: dailyMetrics },
      { data: infrastructureAlerts },
      { data: knowledgeBaseDocs },
      { data: userScriptAssets },
      { data: callAnalyses },
      { data: objectionAssets },
      { data: replyAssets },
      { data: leadReplies },
      { data: objectionClusters }
    ] = await Promise.all([
      supabase.from('growth_steps').select('*').order('step_number'),
      supabase.from('user_growth_progress').select('*').eq('user_id', user.id),
      supabase.from('synced_campaigns').select('*').eq('user_id', user.id),
      supabase.from('daily_campaign_metrics').select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(1),
      supabase.from('email_account_alerts').select('email_address, alert_type, severity, current_value, threshold_value, recommended_action').eq('user_id', user.id).eq('status', 'active'),
      supabase.from('knowledge_base_documents').select('title, category, extracted_content').eq('document_type', 'admin').eq('is_active', true),
      supabase.from('user_assets').select('title, content, performance_data, asset_type').eq('user_id', user.id).in('asset_type', ['winning_script', 'losing_script']).order('created_at', { ascending: false }).limit(20),
      supabase.from('call_analyses').select('title, overall_score, objections_identified, close_confidence, gap_selling, improvements, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
      supabase.from('user_assets').select('title, content').eq('user_id', user.id).eq('asset_type', 'objection').order('updated_at', { ascending: false }).limit(20),
      supabase.from('user_assets').select('title, content, performance_data, asset_type').eq('user_id', user.id).in('asset_type', ['winning_reply', 'losing_reply']).order('created_at', { ascending: false }).limit(20),
      supabase.from('lead_replies').select('id, outcome').eq('user_id', user.id).eq('status', 'replied'),
      supabase.from('objection_clusters').select('category, cluster_name, representative_objection, variations, best_response, best_response_score, total_occurrences, avg_handling_score').eq('user_id', user.id).order('total_occurrences', { ascending: false }).limit(20)
    ]);

    // Determine current step
    let currentStep: GrowthStep | null = null;
    let currentProgress: UserProgress | null = null;

    if (growthSteps && userProgress) {
      const progressMap = new Map(userProgress.map(p => [p.step_id, p]));
      for (const step of growthSteps) {
        const progress = progressMap.get(step.id);
        if (!progress || progress.status !== 'validated') {
          currentStep = step;
          currentProgress = progress || null;
          break;
        }
      }
      // If all validated, user is on the last step
      if (!currentStep && growthSteps.length > 0) {
        currentStep = growthSteps[growthSteps.length - 1];
      }
      if (currentStep) {
        currentProgress = progressMap.get(currentStep.id) || null;
      }
    }

    // Calculate total metrics
    const totalMetrics = {
      emails_sent: campaigns?.reduce((sum, c) => sum + (c.emails_sent || 0), 0) || 0,
      replies: campaigns?.reduce((sum, c) => sum + (c.unique_replies || 0), 0) || 0,
      interested: campaigns?.reduce((sum, c) => sum + (c.interested_count || 0), 0) || 0,
      reply_rate: 0,
      interested_rate: 0,
    };
    
    if (totalMetrics.emails_sent > 0) {
      totalMetrics.reply_rate = (totalMetrics.replies / totalMetrics.emails_sent) * 100;
    }
    if (totalMetrics.replies > 0) {
      totalMetrics.interested_rate = (totalMetrics.interested / totalMetrics.replies) * 100;
    }

    // Map campaigns for the prompt
    const campaignData: CampaignData[] = (campaigns || []).map(c => ({
      campaign_name: c.campaign_name || 'Unknown',
      emails_sent: c.emails_sent || 0,
      unique_replies: c.unique_replies || 0,
      interested_count: c.interested_count || 0,
      reply_rate: c.reply_rate || 0,
      interested_rate: c.interested_rate || 0,
      campaign_status: c.campaign_status || 'unknown',
    }));

    // Map infrastructure alerts
    const alertData: InfrastructureAlert[] = (infrastructureAlerts || []).map(a => ({
      email_address: a.email_address,
      alert_type: a.alert_type,
      severity: a.severity,
      current_value: a.current_value,
      threshold_value: a.threshold_value,
      recommended_action: a.recommended_action,
    }));

    // Build knowledge base section
    const knowledgeBaseContent = buildKnowledgeBaseSection(
      (knowledgeBaseDocs || []).map(doc => ({
        title: doc.title,
        category: doc.category,
        extracted_content: doc.extracted_content || ''
      }))
    );

    console.log(`Knowledge base loaded: ${knowledgeBaseDocs?.length || 0} documents`);
    console.log(`User scripts loaded: ${userScriptAssets?.length || 0} assets`);
    console.log(`Call analyses loaded: ${callAnalyses?.length || 0} analyses`);
    console.log(`Objection assets loaded: ${objectionAssets?.length || 0} objections`);
    console.log(`Reply assets loaded: ${replyAssets?.length || 0} reply assets`);

    // Build user scripts section (personalized learning)
    const userScriptsContent = buildUserScriptsSection(
      (userScriptAssets || []).map(asset => ({
        title: asset.title,
        content: asset.content,
        performance_data: asset.performance_data as UserScriptAsset['performance_data'],
        asset_type: asset.asset_type as 'winning_script' | 'losing_script'
      }))
    );

    // Build sales insights section with cluster data
    const salesInsightsContent = buildSalesInsightsSection(
      (callAnalyses || []).map(a => ({
        title: a.title,
        overall_score: a.overall_score || 0,
        objections_identified: a.objections_identified || 0,
        close_confidence: a.close_confidence || 0,
        gap_selling: a.gap_selling as CallAnalysis['gap_selling'],
        improvements: a.improvements as string[] | null,
        created_at: a.created_at
      })),
      (objectionAssets || []).map(o => ({
        title: o.title,
        content: o.content as ObjectionAsset['content']
      })),
      (objectionClusters || []).map(c => ({
        category: c.category,
        cluster_name: c.cluster_name,
        representative_objection: c.representative_objection,
        variations: c.variations || [],
        best_response: c.best_response,
        best_response_score: c.best_response_score,
        total_occurrences: c.total_occurrences,
        avg_handling_score: c.avg_handling_score
      }))
    );

    // Build appointment setting section
    const winningReplies = (replyAssets || [])
      .filter(a => a.asset_type === 'winning_reply')
      .map(a => ({
        title: a.title,
        content: a.content as ReplyAsset['content'],
        performance_data: a.performance_data as ReplyAsset['performance_data'],
        asset_type: 'winning_reply' as const
      }));

    const losingReplies = (replyAssets || [])
      .filter(a => a.asset_type === 'losing_reply')
      .map(a => ({
        title: a.title,
        content: a.content as ReplyAsset['content'],
        performance_data: a.performance_data as ReplyAsset['performance_data'],
        asset_type: 'losing_reply' as const
      }));

    const totalReplied = leadReplies?.length || 0;
    const meetingsBooked = leadReplies?.filter(r => r.outcome === 'meeting_booked').length || 0;
    const replyStats = {
      total: totalReplied,
      meetingsBooked,
      conversionRate: totalReplied > 0 ? (meetingsBooked / totalReplied) * 100 : 0
    };

    const appointmentSettingContent = buildAppointmentSettingSection(winningReplies, losingReplies, replyStats);

    // Build system prompt with full context
    const systemPrompt = buildSystemPrompt(
      growthSteps || [],
      currentStep,
      currentProgress,
      campaignData,
      totalMetrics,
      alertData,
      knowledgeBaseContent,
      userScriptsContent,
      salesInsightsContent,
      appointmentSettingContent
    );

    // Build user message based on type
    let userMessage = message || '';
    if (type === 'diagnose') {
      userMessage = 'Analyze my current campaign performance and tell me what I should focus on. Give me a specific diagnosis and one clear action.';
    } else if (type === 'recommend') {
      userMessage = 'Based on my data, what is the single most important thing I should do right now to improve my results?';
    }

    // Prepare messages for AI
    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: userMessage }
    ];

    // Call Lovable AI Gateway
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${lovableApiKey}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: messages,
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        console.error('AI Gateway rate limit exceeded');
        return new Response(
          JSON.stringify({ error: 'Rate limits exceeded, please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        console.error('AI Gateway payment required');
        return new Response(
          JSON.stringify({ error: 'AI credits depleted. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await aiResponse.text();
      console.error('AI Gateway error:', errorText);
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const assistantMessage = aiData.choices?.[0]?.message?.content || 'I apologize, but I was unable to generate a response.';

    console.log('Growth Copilot response generated successfully');

    return new Response(
      JSON.stringify({
        response: assistantMessage,
        context: {
          currentStep: currentStep?.step_number,
          currentStepName: currentStep?.name,
          status: currentProgress?.status || 'not_started',
          totalEmailsSent: totalMetrics.emails_sent,
          interestedRate: totalMetrics.interested_rate,
          campaignCount: campaigns?.length || 0,
          infrastructureAlerts: alertData.length,
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Growth Copilot error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
