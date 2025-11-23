import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/authenticated/user/Login";
import AdminDashboard from "./pages/authenticated/admin/AdminDashboard";
import UserProfile from "./pages/authenticated/user/UserProfile";
import MemberDetails from "./pages/MemberDetails";
import ProtectedRoute from "./components/ProtectedRoute";
import UserEdit from "./pages/authenticated/user/UserEdit";
import StatusManager from "./pages/authenticated/admin/StatusManager";
import SwitchManager from "./pages/authenticated/admin/SwitchManager";
import MentalHealthManager from "./pages/authenticated/admin/MentalHealthManager";
import Metrics from "./pages/authenticated/user/Metrics";
import TagManager from "./pages/authenticated/admin/TagManager";
import Endpoints from "./pages/authenticated/admin/Endpoints";
import UserManager from "./pages/authenticated/admin/UserManager";
import { Switch } from "@radix-ui/react-switch";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/fronting" element={<Index />} />
          <Route path="/" element={<Index />} />
          <Route path="/:member_id" element={<MemberDetails />} />
          <Route path="/user/login" element={<Login />} />
          <Route path="/admin/dash" element={
            <ProtectedRoute adminRequired={true}>
              <AdminDashboard />
            </ProtectedRoute>
          } />
          <Route path="/admin/status" element={
            <ProtectedRoute adminRequired={true}>
              <StatusManager />
            </ProtectedRoute>
          } />
          <Route path="/admin/mental" element={
            <ProtectedRoute adminRequired={true}>
              <MentalHealthManager />
            </ProtectedRoute>
          } />
          <Route path="/admin/switch" element={
            <ProtectedRoute adminRequired={true}>
              <SwitchManager />
            </ProtectedRoute>
          } />
          <Route path="/admin/tags" element={
            <ProtectedRoute adminRequired={true}>
              <TagManager />
            </ProtectedRoute>
          } />
          <Route path="/admin/endpoints" element={
            <ProtectedRoute adminRequired={true}>
              <Endpoints />
            </ProtectedRoute>
          } />
          <Route path="/owner/users" element={
            <ProtectedRoute adminRequired={true}>
              <UserManager />
            </ProtectedRoute>
          } />
          <Route path="/user/profile" element={
            <ProtectedRoute adminRequired={false}>
              <UserProfile />
            </ProtectedRoute>
          } />
          <Route path="/user/metrics" element={
            <ProtectedRoute adminRequired={false}>
              <Metrics />
            </ProtectedRoute>
          } />
          <Route path="/user/profile/edit" element={
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
