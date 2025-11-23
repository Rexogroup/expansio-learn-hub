export interface Template {
  id: string;
  name: string;
  description: string;
  category: 'presentation' | 'content' | 'process' | 'philosophy';
  thumbnail?: string;
  content: string;
}

export const templates: Template[] = [
  {
    id: 'offer-process',
    name: 'Offer Creation Process',
    description: 'Step-by-step process layout with numbered cards',
    category: 'process',
    content: `
<div data-type="hero" data-bg-color="primary" class="hero-block">
  <h1>Offer Creation Process</h1>
  <p>A comprehensive guide to building your perfect offer</p>
</div>

<div data-type="step" data-step-number="1" class="step-card">
  <h3>Identify Your Target Market</h3>
  <p>Define your ideal customer profile and understand their pain points deeply. Research their needs, desires, and challenges.</p>
</div>

<div data-type="step" data-step-number="2" class="step-card">
  <h3>Create Your Value Proposition</h3>
  <p>Craft a compelling value proposition that clearly communicates how you solve your customer's problems better than anyone else.</p>
</div>

<div data-type="step" data-step-number="3" class="step-card">
  <h3>Design Your Offer Stack</h3>
  <p>Structure your offer with core deliverables, bonuses, and guarantees that create irresistible value.</p>
</div>

<div data-type="step" data-step-number="4" class="step-card">
  <h3>Price for Profitability</h3>
  <p>Set pricing that reflects your value while ensuring healthy margins and sustainable growth.</p>
</div>
    `.trim()
  },
  {
    id: 'philosophy-columns',
    name: 'Philosophy Section',
    description: 'Two-column layout for principles or values',
    category: 'philosophy',
    content: `
<div data-type="hero" data-bg-color="accent" class="hero-block">
  <h1>Our Philosophy</h1>
  <p>The principles that guide everything we do</p>
</div>

<div data-type="column-layout" data-columns="2" class="column-layout">
  <div data-type="column-item" class="column-item">
    <h3>Quality Over Quantity</h3>
    <p>We believe in delivering exceptional results rather than rushing through processes. Every detail matters, and we take the time to get it right.</p>
  </div>
  <div data-type="column-item" class="column-item">
    <h3>Continuous Improvement</h3>
    <p>Growth is a journey, not a destination. We constantly iterate, learn, and evolve to deliver better outcomes for our clients.</p>
  </div>
</div>

<div data-type="callout" data-variant="quote" class="callout-block">
  <p>"Success is the sum of small efforts repeated day in and day out."</p>
</div>
    `.trim()
  },
  {
    id: 'three-pillars',
    name: 'Three Pillars',
    description: 'Three-column layout for key concepts',
    category: 'content',
    content: `
<div data-type="hero" data-bg-color="secondary" class="hero-block">
  <h1>Our Approach</h1>
  <p>Three fundamental pillars of success</p>
</div>

<div data-type="column-layout" data-columns="3" class="column-layout">
  <div data-type="column-item" class="column-item">
    <h3>Strategy</h3>
    <p>Data-driven planning and execution that aligns with your business goals.</p>
  </div>
  <div data-type="column-item" class="column-item">
    <h3>Execution</h3>
    <p>Flawless implementation with attention to detail and quality.</p>
  </div>
  <div data-type="column-item" class="column-item">
    <h3>Optimization</h3>
    <p>Continuous improvement based on real-world results and feedback.</p>
  </div>
</div>
    `.trim()
  },
  {
    id: 'feature-highlight',
    name: 'Feature Highlight',
    description: 'Cards with callouts for highlighting key features',
    category: 'content',
    content: `
<div data-type="hero" data-bg-color="primary" class="hero-block">
  <h1>Key Features</h1>
  <p>Everything you need to succeed</p>
</div>

<div data-type="card" data-bg-color="primary" data-padding="large" class="card-block">
  <h2>Comprehensive Training</h2>
  <p>Access to our complete library of training materials, video courses, and live workshops designed to accelerate your growth.</p>
</div>

<div data-type="card" data-bg-color="accent" data-padding="large" class="card-block">
  <h2>Expert Support</h2>
  <p>Direct access to our team of experts who are ready to help you overcome any challenge and achieve your goals.</p>
</div>

<div data-type="callout" data-variant="info" class="callout-block">
  <p>💡 All features are designed to work seamlessly together, creating a powerful ecosystem for your success.</p>
</div>
    `.trim()
  },
  {
    id: 'problem-solution',
    name: 'Problem-Solution',
    description: 'Before/after style layout',
    category: 'presentation',
    content: `
<div data-type="hero" data-bg-color="muted" class="hero-block">
  <h1>Transform Your Business</h1>
  <p>From struggling to thriving</p>
</div>

<div data-type="column-layout" data-columns="2" class="column-layout">
  <div data-type="column-item" class="column-item">
    <h3>❌ Before</h3>
    <ul>
      <li>Inconsistent results</li>
      <li>Wasted time and resources</li>
      <li>Unclear direction</li>
      <li>Limited growth</li>
    </ul>
  </div>
  <div data-type="column-item" class="column-item">
    <h3>✅ After</h3>
    <ul>
      <li>Predictable, scalable results</li>
      <li>Optimized processes</li>
      <li>Clear strategic roadmap</li>
      <li>Exponential growth</li>
    </ul>
  </div>
</div>

<div data-type="callout" data-variant="success" class="callout-block">
  <p>✨ Ready to make the transformation? Let's get started today.</p>
</div>
    `.trim()
  },
  {
    id: 'testimonial-showcase',
    name: 'Testimonial Showcase',
    description: 'Callouts for customer testimonials',
    category: 'content',
    content: `
<div data-type="hero" data-bg-color="accent" class="hero-block">
  <h1>What Our Clients Say</h1>
  <p>Real results from real people</p>
</div>

<div data-type="callout" data-variant="quote" class="callout-block">
  <p>"This program completely transformed how we approach our business. Within 3 months, we saw a 300% increase in qualified leads."</p>
  <p><strong>— Sarah Johnson, CEO of TechStart</strong></p>
</div>

<div data-type="callout" data-variant="quote" class="callout-block">
  <p>"The step-by-step guidance and expert support made all the difference. We finally have a system that works consistently."</p>
  <p><strong>— Michael Chen, Founder of GrowthLabs</strong></p>
</div>

<div data-type="callout" data-variant="quote" class="callout-block">
  <p>"Best investment we've made in our company. The ROI has been incredible and the team is always there to help."</p>
  <p><strong>— Emma Davis, Director of Marketing</strong></p>
</div>
    `.trim()
  },
  {
    id: 'faq-section',
    name: 'FAQ Section',
    description: 'Question and answer format with callouts',
    category: 'content',
    content: `
<div data-type="hero" data-bg-color="secondary" class="hero-block">
  <h1>Frequently Asked Questions</h1>
  <p>Everything you need to know</p>
</div>

<div data-type="card" data-bg-color="muted" class="card-block">
  <h3>How long does it take to see results?</h3>
  <p>Most clients start seeing measurable improvements within the first 30 days. Significant transformations typically occur within 90 days of consistent implementation.</p>
</div>

<div data-type="card" data-bg-color="muted" class="card-block">
  <h3>What kind of support is included?</h3>
  <p>You'll have access to our expert team via email, live chat, and weekly group calls. Plus, you'll get access to our comprehensive knowledge base and video library.</p>
</div>

<div data-type="card" data-bg-color="muted" class="card-block">
  <h3>Is there a money-back guarantee?</h3>
  <p>Yes! We offer a 30-day money-back guarantee. If you're not completely satisfied, we'll refund your investment, no questions asked.</p>
</div>

<div data-type="callout" data-variant="info" class="callout-block">
  <p>💬 Have more questions? Contact our team and we'll be happy to help!</p>
</div>
    `.trim()
  },
  {
    id: 'blank-canvas',
    name: 'Blank Canvas',
    description: 'Start with a clean slate',
    category: 'presentation',
    content: `
<div data-type="hero" data-bg-color="primary" class="hero-block">
  <h1>Your Title Here</h1>
  <p>Your subtitle or description goes here</p>
</div>

<p>Start creating your content here...</p>
    `.trim()
  }
];

export const getTemplatesByCategory = (category: Template['category']) => {
  return templates.filter(t => t.category === category);
};

export const getTemplateById = (id: string) => {
  return templates.find(t => t.id === id);
};
