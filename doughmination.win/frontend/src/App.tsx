import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/admin/Login";
import AdminDashboard from "./pages/admin/is/AdminDashboard";
import UserProfile from "./pages/admin/UserProfile";
import MemberDetails from "./pages/MemberDetails";
import ProtectedRoute from "./components/ProtectedRoute";
import UserEdit from "./pages/admin/UserEdit";
import StatusManager from "./pages/admin/is/StatusManager";
import SwitchManager from "./pages/admin/is/SwitchManager";
import MentalHealthManager from "./pages/admin/is/MentalHealthManager";
import { Switch } from "@radix-ui/react-switch";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/:member_id" element={<MemberDetails />} />
          <Route path="/admin/login" element={<Login />} />
          <Route path="/admin/dashboard" element={
            <ProtectedRoute adminRequired={true}>
              <AdminDashboard />
            </ProtectedRoute>
          } />
          <Route path="/admin/status" element={
            <ProtectedRoute adminRequired={true}>
              <StatusManager />
            </ProtectedRoute>
          } />
          <Route path="/admin/switch" element={
            <ProtectedRoute adminRequired={true}>
              <SwitchManager />
            </ProtectedRoute>
          } />
          <Route path="/admin/mental" element={
            <ProtectedRoute adminRequired={true}>
              <MentalHealthManager />
            </ProtectedRoute>
          } />
          <Route path="/admin/user" element={
            <ProtectedRoute adminRequired={false}>
              <UserProfile />
            </ProtectedRoute>
          } />
          <Route path="/admin/user/edit" element={
            <ProtectedRoute adminRequired={false}>
              <UserEdit />
            </ProtectedRoute>
          } />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
