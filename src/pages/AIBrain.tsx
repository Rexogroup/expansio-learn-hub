import { Navbar } from "@/components/Navbar";
import { AIBrainSection } from "@/components/growth/AIBrainSection";

const AIBrain = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <AIBrainSection />
      </main>
    </div>
  );
};

export default AIBrain;
