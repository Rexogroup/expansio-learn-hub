import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import Auth from "./pages/Auth";
import Courses from "./pages/Courses";
import CourseView from "./pages/CourseView";
import SalesVault from "./pages/SalesVault";
import SalesCallView from "./pages/SalesCallView";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";

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
            <Route path="/courses" element={<AuthenticatedLayout><Courses /></AuthenticatedLayout>} />
            <Route path="/course/:id" element={<AuthenticatedLayout><CourseView /></AuthenticatedLayout>} />
            <Route path="/sales-vault" element={<AuthenticatedLayout><SalesVault /></AuthenticatedLayout>} />
            <Route path="/sales-call/:id" element={<AuthenticatedLayout><SalesCallView /></AuthenticatedLayout>} />
            <Route path="/admin" element={<AuthenticatedLayout><Admin /></AuthenticatedLayout>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
