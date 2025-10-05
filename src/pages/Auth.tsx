import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { BookOpen } from "lucide-react";

export default function Auth() {
  const [isLoading, setIsLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const inviteCode = searchParams.get("invite");
  const [inviteData, setInviteData] = useState<{
    firstName: string;
    lastName: string;
    email: string;
    id: string;
  } | null>(null);
  const [inviteValidated, setInviteValidated] = useState(false);
  const [showSignIn, setShowSignIn] = useState(false);

  // Sign in form state
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");

  useEffect(() => {
    // Check existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/courses");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        navigate("/courses");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (inviteCode) {
      // Redirect to signup page with invite code
      navigate(`/signup?invite=${inviteCode}`);
    } else {
      setInviteValidated(true);
    }
  }, [inviteCode, navigate]);

  const validateInvite = async () => {
    try {
      const { data: invite, error } = await supabase
        .from("invites")
        .select("id, first_name, last_name, email, is_active, expires_at, used_at")
        .eq("invite_code", inviteCode)
        .maybeSingle();

      if (error) throw error;

      if (!invite) {
        toast.error("Invalid invite code");
        return;
      }

      if (!invite.is_active) {
        toast.error("This invite has been revoked");
        return;
      }

      if (invite.used_at) {
        toast.error("This invite has already been used");
        return;
      }

      if (new Date(invite.expires_at) < new Date()) {
        toast.error("This invite has expired");
        return;
      }

      setInviteData({
        id: invite.id,
        firstName: invite.first_name,
        lastName: invite.last_name,
        email: invite.email,
      });
      setInviteValidated(true);
    } catch (error: any) {
      console.error("Error validating invite:", error);
      toast.error("Failed to validate invite code");
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteData) return;

    setIsLoading(true);

    try {
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: inviteData.email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/courses`,
          data: {
            full_name: `${inviteData.firstName} ${inviteData.lastName}`,
          },
        },
      });

      if (signUpError) throw signUpError;

      if (authData.user) {
        // Mark invite as used
        const { error: updateError } = await supabase
          .from("invites")
          .update({
            used_at: new Date().toISOString(),
            used_by: authData.user.id,
          })
          .eq("id", inviteData.id);

        if (updateError) {
          console.error("Error marking invite as used:", updateError);
        }

        toast.success("Account created! Please check your email to verify your account.");
      }
    } catch (error: any) {
      toast.error(error.message || "An error occurred during sign up");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: signInEmail,
        password: signInPassword,
      });

      if (error) throw error;
      toast.success("Welcome back!");
    } catch (error: any) {
      toast.error(error.message || "An error occurred during sign in");
    } finally {
      setIsLoading(false);
    }
  };

  if (!inviteValidated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-secondary p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Validating invite...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show sign-in form if no invite code or user clicked to sign in
  if (!inviteCode || showSignIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-secondary p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="space-y-1 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <BookOpen className="w-8 h-8 text-primary" />
              <span className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Expansio Learning
              </span>
            </div>
            <CardTitle className="text-2xl">Sign In</CardTitle>
            <CardDescription>
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={signInEmail}
                  onChange={(e) => setSignInEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={signInPassword}
                  onChange={(e) => setSignInPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
            
            {!inviteCode && (
              <div className="mt-6 p-4 bg-muted rounded-lg text-center">
                <p className="text-sm text-muted-foreground mb-2">
                  This platform is invite-only.
                </p>
                <p className="text-sm text-muted-foreground">
                  Please check your email for your invite link or contact us to request access.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show sign-up form with pre-filled data from invite
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-secondary p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <BookOpen className="w-8 h-8 text-primary" />
            <span className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Expansio Learning
            </span>
          </div>
          <CardTitle className="text-2xl">Create Your Account</CardTitle>
          <CardDescription>
            You've been invited! Complete your registration below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignUp} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                value={inviteData?.firstName || ""}
                disabled
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={inviteData?.lastName || ""}
                disabled
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={inviteData?.email || ""}
                disabled
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Create a secure password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
              <p className="text-xs text-muted-foreground">
                Must be at least 6 characters
              </p>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Creating account..." : "Create Account"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => setShowSignIn(true)}
            >
              Already have an account? Sign in
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
