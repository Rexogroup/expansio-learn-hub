import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { BookOpen } from "lucide-react";

export default function Signup() {
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

  console.log("Signup page loaded with invite code:", inviteCode);

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
      validateInvite();
    } else {
      // Redirect to auth if no invite code
      navigate("/auth");
    }
  }, [inviteCode, navigate]);

  const validateInvite = async () => {
    try {
      console.log("Validating invite code:", inviteCode);
      const { data: invite, error } = await supabase
        .from("invites")
        .select("id, first_name, last_name, email, is_active, expires_at, used_at")
        .eq("invite_code", inviteCode)
        .maybeSingle();

      if (error) {
        console.error("Database error validating invite:", error);
        throw error;
      }

      console.log("Invite data retrieved:", invite);

      if (!invite) {
        console.error("No invite found with code:", inviteCode);
        toast.error("Invalid invite code");
        navigate("/auth");
        return;
      }

      if (!invite.is_active) {
        toast.error("This invite has been revoked");
        navigate("/auth");
        return;
      }

      if (invite.used_at) {
        toast.error("This invite has already been used");
        navigate("/auth");
        return;
      }

      if (new Date(invite.expires_at) < new Date()) {
        toast.error("This invite has expired");
        navigate("/auth");
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
      navigate("/auth");
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

        toast.success("Account created! Redirecting to courses...");
      }
    } catch (error: any) {
      toast.error(error.message || "An error occurred during sign up");
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
              onClick={() => navigate("/auth")}
            >
              Already have an account? Sign in
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
