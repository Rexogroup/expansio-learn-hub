import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import Auth from "./pages/Auth";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import CommandCenter from "./pages/CommandCenter";
import AIBrain from "./pages/AIBrain";
import Onboarding from "./pages/Onboarding";
import OnboardingStep from "./pages/OnboardingStep";
import Courses from "./pages/Courses";
import CourseView from "./pages/CourseView";
import SalesVault from "./pages/SalesVault";
import SalesCallView from "./pages/SalesCallView";
import Admin from "./pages/Admin";
import ScriptBuilder from "./pages/ScriptBuilder";
import ImplementationGuide from "./pages/ImplementationGuide";
import IntegrationSettings from "./pages/IntegrationSettings";
import AffiliatePortal from "./pages/AffiliatePortal";
import AgencyProfile from "./pages/AgencyProfile";
import Tools from "./pages/Tools";
import NotFound from "./pages/NotFound";
import MasterInbox from "./pages/MasterInbox";
import SalesCoach from "./pages/SalesCoach";
import CRM from "./pages/CRM";
import ExpansioCopilot from "./pages/ExpansioCopilot";

const queryClient = new QueryClient();

const AuthenticatedLayout = ({ children }: { children: React.ReactNode }) => (
  <>
    <ThemeToggle />
    {children}
  </>
);

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Auth />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/dashboard" element={<AuthenticatedLayout><CommandCenter /></AuthenticatedLayout>} />
            <Route path="/ai-brain" element={<AuthenticatedLayout><AIBrain /></AuthenticatedLayout>} />
            <Route path="/onboarding" element={<AuthenticatedLayout><Onboarding /></AuthenticatedLayout>} />
            <Route path="/onboarding/step/:stepNumber" element={<AuthenticatedLayout><OnboardingStep /></AuthenticatedLayout>} />
            <Route path="/courses" element={<AuthenticatedLayout><Courses /></AuthenticatedLayout>} />
            <Route path="/course/:id" element={<AuthenticatedLayout><CourseView /></AuthenticatedLayout>} />
            <Route path="/sales-vault" element={<AuthenticatedLayout><SalesVault /></AuthenticatedLayout>} />
            <Route path="/sales-call/:id" element={<AuthenticatedLayout><SalesCallView /></AuthenticatedLayout>} />
            <Route path="/script-builder" element={<AuthenticatedLayout><ScriptBuilder /></AuthenticatedLayout>} />
            <Route path="/implementation-guide" element={<ImplementationGuide />} />
            <Route path="/integrations" element={<AuthenticatedLayout><IntegrationSettings /></AuthenticatedLayout>} />
            <Route path="/network" element={<AuthenticatedLayout><AffiliatePortal /></AuthenticatedLayout>} />
            <Route path="/agency/:id" element={<AuthenticatedLayout><AgencyProfile /></AuthenticatedLayout>} />
            <Route path="/tools" element={<AuthenticatedLayout><Tools /></AuthenticatedLayout>} />
            <Route path="/inbox" element={<AuthenticatedLayout><MasterInbox /></AuthenticatedLayout>} />
            <Route path="/crm" element={<AuthenticatedLayout><CRM /></AuthenticatedLayout>} />
            <Route path="/sales-coach" element={<AuthenticatedLayout><SalesCoach /></AuthenticatedLayout>} />
            <Route path="/copilot" element={<ExpansioCopilot />} />
            <Route path="/admin" element={<AuthenticatedLayout><Admin /></AuthenticatedLayout>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
