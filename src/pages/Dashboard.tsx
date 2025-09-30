// src/pages/Dashboard.tsx
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, Calendar, BarChart3, Settings, LogOut, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import ContentGenerator from '@/components/ContentGenerator';
import AnalyticsDashboard from '@/components/AnalyticsDashboard';
import PostScheduler from '@/components/PostScheduler';
import { UsageProvider } from '@/hooks/useUsageTracking';
import SettingsPage from '@/pages/SettingsPage';
import OtpForm from '@/components/OtpForm';

// ---------- MAIN DASHBOARD ----------
const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('generate');
  const [scheduledContent, setScheduledContent] = useState<{
    caption: string;
    image: string;
    filename: string;
  } | null>(null);

  const sidebarItems = [
    { id: 'generate', icon: Sparkles, label: 'Generate Content' },
    { id: 'schedule', icon: Calendar, label: 'Schedule Posts' },
    { id: 'analytics', icon: BarChart3, label: 'Analytics' },
    { id: 'accounts', icon: Users, label: 'Social Accounts' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'generate':
        return (
          <ContentGenerator 
            onScheduleClick={(data) => {
              setScheduledContent(data);
              setActiveTab('schedule');
            }} 
          />
        );
      case 'schedule':
        return (
          <div className="space-y-6">
            <PostScheduler initialContent={scheduledContent} />
            <Card>
              <CardHeader>
                <CardTitle>Enter OTP to Post</CardTitle>
                <CardDescription>Verify your OTP to post on Instagram</CardDescription>
              </CardHeader>
              <CardContent>
                <OtpForm 
                  filename={scheduledContent?.filename || ''} 
                  caption={scheduledContent?.caption || ''} 
                />
              </CardContent>
            </Card>
          </div>
        );
      case 'analytics':
        return <AnalyticsDashboard />;
      case 'accounts':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Social Media Accounts</CardTitle>
              <CardDescription>Connect and manage your social media platforms</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center space-y-4">
                <Users className="w-16 h-16 text-green-600 mx-auto" />
                <p className="text-gray-600">Manage your connected social media accounts</p>
                <Link to="/social-accounts">
                  <Button className="bg-green-600 hover:bg-green-700">Manage Social Accounts</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        );
      case 'settings':
        return <SettingsPage />;
      default:
        return <ContentGenerator onScheduleClick={() => setActiveTab('schedule')} />;
    }
  };

  return (
    <UsageProvider>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-xl font-semibold text-gray-900">ContentAI Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm" className="border-red-300 text-red-600 hover:bg-red-50">
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </header>

        {/* Layout */}
        <div className="flex">
          {/* Sidebar */}
          <aside className="w-64 bg-white border-r border-gray-200 min-h-screen shadow-inner">
            <nav className="p-4 space-y-2">
              {sidebarItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                      activeTab === item.id
                        ? 'bg-gradient-to-r from-green-50 to-blue-50 text-green-700 border-l-4 border-green-500 font-medium'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1 p-6 bg-gray-50 min-h-screen">
            {renderContent()}
          </main>
        </div>
      </div>
    </UsageProvider>
  );
};

// ---------- SIMPLE DASHBOARD (just analytics) ----------
export const SimpleDashboard = () => {
  return (
    <div className="p-4">
      <AnalyticsDashboard />
    </div>
  );
};

// Main default export
export default Dashboard;
