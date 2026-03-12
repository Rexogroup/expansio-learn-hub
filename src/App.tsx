import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import { AppLayout } from "@/components/layout/AppLayout";
import Auth from "./pages/Auth";
import Signup from "./pages/Signup";
import Courses from "./pages/Courses";
import CourseView from "./pages/CourseView";
import SalesVault from "./pages/SalesVault";
import SalesCallView from "./pages/SalesCallView";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";

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

            <Route path="/courses" element={<AppLayout><Courses /></AppLayout>} />
            <Route path="/course/:id" element={<AppLayout><CourseView /></AppLayout>} />
            <Route path="/sales-vault" element={<AppLayout><SalesVault /></AppLayout>} />
            <Route path="/sales-call/:id" element={<AppLayout><SalesCallView /></AppLayout>} />
            <Route path="/admin" element={<AppLayout><Admin /></AppLayout>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
