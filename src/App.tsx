import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import { AppLayout } from "@/components/layout/AppLayout";
import Auth from "./pages/Auth";
import Signup from "./pages/Signup";
import CommandCenter from "./pages/CommandCenter";
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
import EmailAccounts from "./pages/EmailAccounts";
import AffiliatePortal from "./pages/AffiliatePortal";
import AgencyProfile from "./pages/AgencyProfile";
import Tools from "./pages/Tools";
import NotFound from "./pages/NotFound";
import MasterInbox from "./pages/MasterInbox";
import SalesCoach from "./pages/SalesCoach";
import CRM from "./pages/CRM";
import ColdEmailCRM from "./pages/ColdEmailCRM";
import ExpansioCopilot from "./pages/ExpansioCopilot";
import ProjectManagement from "./pages/ProjectManagement";

const queryClient = new QueryClient();

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
            <Route path="/implementation-guide" element={<ImplementationGuide />} />
            
            {/* Copilot has its own full-page layout */}
            <Route path="/copilot" element={<ExpansioCopilot />} />
            
            {/* Redirect AI Brain to Copilot Memory tab */}
            <Route path="/ai-brain" element={<Navigate to="/copilot" replace />} />
            
            {/* All authenticated routes use AppLayout with sidebar */}
            <Route path="/dashboard" element={<AppLayout><CommandCenter /></AppLayout>} />
            <Route path="/onboarding" element={<AppLayout><Onboarding /></AppLayout>} />
            <Route path="/onboarding/step/:stepNumber" element={<AppLayout><OnboardingStep /></AppLayout>} />
            <Route path="/courses" element={<AppLayout><Courses /></AppLayout>} />
            <Route path="/course/:id" element={<AppLayout><CourseView /></AppLayout>} />
            <Route path="/sales-vault" element={<AppLayout><SalesVault /></AppLayout>} />
            <Route path="/sales-call/:id" element={<AppLayout><SalesCallView /></AppLayout>} />
            <Route path="/script-builder" element={<AppLayout><ScriptBuilder /></AppLayout>} />
            <Route path="/integrations" element={<AppLayout><IntegrationSettings /></AppLayout>} />
            <Route path="/email-accounts" element={<AppLayout><EmailAccounts /></AppLayout>} />
            <Route path="/network" element={<AppLayout><AffiliatePortal /></AppLayout>} />
            <Route path="/agency/:id" element={<AppLayout><AgencyProfile /></AppLayout>} />
            <Route path="/tools" element={<AppLayout><Tools /></AppLayout>} />
            <Route path="/inbox" element={<AppLayout><MasterInbox /></AppLayout>} />
            <Route path="/crm" element={<AppLayout><CRM /></AppLayout>} />
            <Route path="/cold-email-crm" element={<AppLayout><ColdEmailCRM /></AppLayout>} />
            <Route path="/sales-coach" element={<AppLayout><SalesCoach /></AppLayout>} />
            <Route path="/admin" element={<AppLayout><Admin /></AppLayout>} />
            <Route path="/projects" element={<AppLayout><ProjectManagement /></AppLayout>} />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
