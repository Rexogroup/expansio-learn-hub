import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BookOpen, Video, FileText, Users } from "lucide-react";
import heroImage from "@/assets/hero-lms.jpg";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary">
      <nav className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xl font-bold">
            <BookOpen className="w-6 h-6 text-primary" />
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              LearnHub
            </span>
          </div>
          <Link to="/auth">
            <Button>Get Started</Button>
          </Link>
        </div>
      </nav>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10" />
        <div className="container mx-auto px-4 py-24 relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h1 className="text-5xl lg:text-6xl font-bold leading-tight">
                Share Knowledge,{" "}
                <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Empower Teams
                </span>
              </h1>
              <p className="text-xl text-muted-foreground">
                A modern learning management system to deliver training content and resources to your clients with ease.
              </p>
              <div className="flex gap-4">
                <Link to="/auth">
                  <Button size="lg" className="shadow-lg">
                    Start Learning
                  </Button>
                </Link>
                <Link to="/courses">
                  <Button size="lg" variant="outline">
                    Browse Courses
                  </Button>
                </Link>
              </div>
            </div>
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-primary to-accent opacity-20 blur-3xl rounded-full" />
              <img
                src={heroImage}
                alt="Learning platform"
                className="relative rounded-2xl shadow-2xl"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 bg-card/30 backdrop-blur-sm">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Everything You Need</h2>
            <p className="text-xl text-muted-foreground">
              Powerful features for effective training delivery
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center space-y-4 p-6 rounded-xl bg-card/50 border border-border/50 hover:shadow-lg transition-all">
              <div className="w-16 h-16 mx-auto bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center">
                <Video className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold">Rich Media Support</h3>
              <p className="text-muted-foreground">
                Host videos, images, and interactive content in your lessons
              </p>
            </div>
            <div className="text-center space-y-4 p-6 rounded-xl bg-card/50 border border-border/50 hover:shadow-lg transition-all">
              <div className="w-16 h-16 mx-auto bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center">
                <FileText className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold">Flexible Content</h3>
              <p className="text-muted-foreground">
                Create sections, headlines, and organize content your way
              </p>
            </div>
            <div className="text-center space-y-4 p-6 rounded-xl bg-card/50 border border-border/50 hover:shadow-lg transition-all">
              <div className="w-16 h-16 mx-auto bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold">Client Access</h3>
              <p className="text-muted-foreground">
                Secure login for clients to access their training materials
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6">Ready to Get Started?</h2>
          <p className="text-xl text-muted-foreground mb-8">
            Join thousands of organizations delivering exceptional training experiences
          </p>
          <Link to="/auth">
            <Button size="lg" className="shadow-lg">
              Create Your Account
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Index;
