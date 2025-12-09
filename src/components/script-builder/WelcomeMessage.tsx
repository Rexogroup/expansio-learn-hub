import { Card } from "@/components/ui/card";
import { Sparkles, Target, Zap } from "lucide-react";
const WelcomeMessage = () => {
  return <div className="space-y-6">
      <div className="text-center space-y-2">
        <h3 className="text-2xl font-bold flex items-center justify-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          Start building your Lead Magnets based on our proven frameworks
        </h3>
        <p className="text-muted-foreground max-w-2xl mx-auto">I'll help you create high-converting lead magnet scripts using our proven value-first scriptwriting framework.  </p>
      </div>

      <div className="grid md:grid-cols-3 gap-4 max-w-4xl mx-auto">
        <Card className="p-4 space-y-2">
          <div className="flex items-center gap-2 text-primary">
            <Target className="h-5 w-5" />
            <h4 className="font-semibold">Define Your ICP</h4>
          </div>
          <p className="text-sm text-muted-foreground">
            Tell me about your ideal customer - revenue, location, tech stack, and team size.
          </p>
        </Card>

        <Card className="p-4 space-y-2">
          <div className="flex items-center gap-2 text-primary">
            <Zap className="h-5 w-5" />
            <h4 className="font-semibold">Share Your Services</h4>
          </div>
          <p className="text-sm text-muted-foreground">
            Describe what services you offer and the pain points you solve for clients.
          </p>
        </Card>

        <Card className="p-4 space-y-2">
          <div className="flex items-center gap-2 text-primary">
            <Sparkles className="h-5 w-5" />
            <h4 className="font-semibold">Get Lead Magnets</h4>
          </div>
          <p className="text-sm text-muted-foreground">
            Receive 5-10 irresistible lead magnet offers ready to use in your outreach.
          </p>
        </Card>
      </div>

      <Card className="p-6 bg-primary/5 border-primary/20 max-w-2xl mx-auto">
        <h4 className="font-semibold mb-3 flex items-center gap-2">
          💡 Example Questions to Get You Started:
        </h4>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>"I help DTC brands scale their ad creative. Can you help me create lead magnets?"</li>
          <li>"My ideal customers are $3M+ SaaS companies. What info do you need?"</li>
          <li>"I offer conversion rate optimization. Let's build some lead magnets!"</li>
        </ul>
      </Card>
    </div>;
};
export default WelcomeMessage;