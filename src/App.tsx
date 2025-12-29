import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ImpersonationProvider } from "@/contexts/ImpersonationContext";
import { AppLayout } from "@/components/layout/AppLayout";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Tickets from "./pages/Tickets";
import CreateTicket from "./pages/CreateTicket";
import TicketDetail from "./pages/TicketDetail";
import Statistics from "./pages/Statistics";
import Users from "./pages/Users";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import AuditLogs from "./pages/AuditLogs";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ImpersonationProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route
              path="/dashboard"
              element={
                <AppLayout>
                  <Dashboard />
                </AppLayout>
              }
            />
            <Route
              path="/tickets"
              element={
                <AppLayout>
                  <Tickets />
                </AppLayout>
              }
            />
            <Route
              path="/tickets/new"
              element={
                <AppLayout>
                  <CreateTicket />
                </AppLayout>
              }
            />
            <Route
              path="/tickets/:id"
              element={
                <AppLayout>
                  <TicketDetail />
                </AppLayout>
              }
            />
            <Route
              path="/statistics"
              element={
                <AppLayout>
                  <Statistics />
                </AppLayout>
              }
            />
            <Route
              path="/users"
              element={
                <AppLayout>
                  <Users />
                </AppLayout>
              }
            />
            <Route
              path="/profile"
              element={
                <AppLayout>
                  <Profile />
                </AppLayout>
              }
            />
            <Route
              path="/settings"
              element={
                <AppLayout>
                  <Settings />
                </AppLayout>
              }
            />
            <Route
              path="/audit-logs"
              element={
                <AppLayout>
                  <AuditLogs />
                </AppLayout>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
          </ImpersonationProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
