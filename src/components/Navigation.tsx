import { Dispatch, SetStateAction, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  BarChart3,
  TrendingUp,
  Bell,
  Download,
  Instagram,
  Menu,
  X
} from "lucide-react";

type View = "dashboard" | "analytics" | "alerts" | "export";

interface NavigationProps {
  activeTab: View;
  setActiveTab: Dispatch<SetStateAction<View>>;
}

export default function Navigation({ activeTab, setActiveTab }: NavigationProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigationItems = [
    { id: "dashboard" as View, label: "Dashboard", icon: BarChart3, description: "Main analytics overview" },
    { id: "analytics" as View, label: "Advanced Analytics", icon: TrendingUp, description: "Deep content insights" },
    { id: "alerts" as View, label: "Alerts & Notifications", icon: Bell, description: "Account monitoring" },
    { id: "export" as View, label: "Export Data", icon: Download, description: "Download reports" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <div className="lg:hidden bg-card border-b border-border/50 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
              <Instagram className="w-5 h-5 text-white" />
            </div>
            <h1 className="font-bold text-lg bg-gradient-to-br from-purple-500 to-pink-500 bg-clip-text text-transparent">
              Instagram Analytics
            </h1>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="mt-4 pb-4 border-t border-border/50 pt-4">
            <div className="space-y-2">
              {navigationItems.map((item) => (
                <Button
                  key={item.id}
                  variant={activeTab === item.id ? "default" : "ghost"}
                  className="w-full justify-start gap-3"
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden lg:block w-80 bg-card border-r border-border/50 min-h-screen">
        <div className="p-6">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500">
              <Instagram className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-br from-purple-500 to-pink-500 bg-clip-text text-transparent">
                Instagram Analytics
              </h1>
              <p className="text-xs text-muted-foreground">Professional Dashboard</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="space-y-2">
            {navigationItems.map((item) => (
              <Button
                key={item.id}
                variant={activeTab === item.id ? "default" : "ghost"}
                className={`w-full justify-start gap-3 h-auto p-4 ${
                  activeTab === item.id
                    ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg"
                    : "hover:bg-muted/50"
                }`}
                onClick={() => setActiveTab(item.id)}
              >
                <div
                  className={`p-2 rounded-lg ${
                    activeTab === item.id ? "bg-white/20" : "bg-muted/30"
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <p className="font-medium">{item.label}</p>
                  <p
                    className={`text-xs ${
                      activeTab === item.id ? "text-white/70" : "text-muted-foreground"
                    }`}
                  >
                    {item.description}
                  </p>
                </div>
              </Button>
            ))}
          </nav>

          {/* Quick Stats */}
          <Card className="mt-8 bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3 text-sm">Quick Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Followers</span>
                  <span className="text-sm font-medium">15.4K</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Engagement</span>
                  <span className="text-sm font-medium text-green-600">+12.4%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Reach</span>
                  <span className="text-sm font-medium">28.7K</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
