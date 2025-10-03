import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BookOpen, Video, FileText, Users } from "lucide-react";
import heroImage from "@/assets/hero-lms.jpg";
const Index = () => {
  return <div className="min-h-screen">
      <nav className="bg-white border-b">
        <div className="container mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xl font-bold font-inter tracking-wider">
            <BookOpen className="w-6 h-6 text-primary" />
            <span className="text-foreground">Expansio Learn Hub</span>
          </div>
          <Link to="/auth">
            <Button className="rounded-full px-6 font-inter">Login</Button>
          </Link>
        </div>
      </nav>

      <section className="relative overflow-hidden bg-[#0c2847] py-32">
        <div className="container mx-auto px-4 relative">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="inline-block">
              <span className="text-sm font-inter font-semibold text-white bg-white/10 px-4 py-2 rounded-full border border-white/20">
                PROFESSIONAL LEARNING
              </span>
            </div>
            <h1 className="text-5xl lg:text-7xl font-inter font-bold text-white leading-tight">
              Expand your knowledge on autopilot.
            </h1>
            <p className="text-xl text-white/80 font-inter max-w-2xl mx-auto">
              We build cutting-edge learning systems that scale for you
            </p>
            <div className="pt-4">
              <Link to="/auth">
                <Button size="lg" className="bg-white text-primary hover:bg-white/90 rounded-full px-8 py-6 text-lg font-inter font-medium shadow-lg">
                  Start Learning Today
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-inter font-bold mb-4 text-foreground">Everything You Need</h2>
            <p className="text-xl text-muted-foreground font-inter">
              Powerful features for effective training delivery
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center space-y-4 p-8 rounded-lg bg-white border border-border hover:shadow-xl transition-all">
              <div className="w-16 h-16 mx-auto bg-primary rounded-lg flex items-center justify-center">
                <Video className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-inter font-bold text-foreground">Rich Media Support</h3>
              <p className="text-muted-foreground font-inter">
                Host videos, images, and interactive content in your lessons
              </p>
            </div>
            <div className="text-center space-y-4 p-8 rounded-lg bg-white border border-border hover:shadow-xl transition-all">
              <div className="w-16 h-16 mx-auto bg-primary rounded-lg flex items-center justify-center">
                <FileText className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-inter font-bold text-foreground">Flexible Content</h3>
              <p className="text-muted-foreground font-inter">
                Create sections, headlines, and organize content your way
              </p>
            </div>
            <div className="text-center space-y-4 p-8 rounded-lg bg-white border border-border hover:shadow-xl transition-all">
              <div className="w-16 h-16 mx-auto bg-primary rounded-lg flex items-center justify-center">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-inter font-bold text-foreground">Client Access</h3>
              <p className="text-muted-foreground font-inter">
                Secure login for clients to access their training materials
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 bg-[#0c2847]">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-inter font-bold mb-6 text-white">Ready to Get Started?</h2>
          <p className="text-xl text-white/80 font-inter mb-8 max-w-2xl mx-auto">
            Join thousands of organizations delivering exceptional training experiences
          </p>
          <Link to="/auth">
            <Button size="lg" className="bg-white text-primary hover:bg-white/90 rounded-full px-8 py-6 text-lg font-inter font-medium shadow-lg">
              Create Your Account
            </Button>
          </Link>
        </div>
      </section>
    </div>;
};
export default Index;