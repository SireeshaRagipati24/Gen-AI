import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// UI Components
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";

// Pages
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import SocialAccounts from "./pages/SocialAccounts";
import NotFound from "./pages/NotFound";
import SignupPage from "./pages/Signup";
import LoginPage from "./pages/Login";
import SettingsPage from "./pages/SettingsPage";
import PaymentButton from './components/PaymentButton';

// Components
import PostScheduler from "./components/PostScheduler";
import ContentGenerator from "./components/ContentGenerator";
import AnalyticsDashboard from "@/components/AnalyticsDashboard";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <Router>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />

            {/* Protected/Main Routes */}
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/schedule" element={<PostScheduler />} />
            <Route path="/post-scheduler" element={<PostScheduler />} />
            <Route path="/social-accounts" element={<SocialAccounts />} />

            {/* Extra Tools */}
            <Route path="/generate" element={<ContentGenerator />} />
            <Route
              path="/analytics"
              element={
                <div>
                  <h1 className="text-2xl font-bold p-4">
                    📊 Instagram Analytics Dashboard
                  </h1>
                  <AnalyticsDashboard />
                </div>
              }
            />

            {/* Fallback Route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Router>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;