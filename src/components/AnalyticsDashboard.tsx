"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line
} from "recharts";
import { 
  Users, 
  TrendingUp, 
  ImageIcon, 
  Eye,
  Heart,
  MessageCircle,
  Bookmark,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Instagram,
  AlertCircle,
  Download,
  Calendar,
  Filter,
  Search,
  Share2,
  MoreVertical,
  Clock,
  MapPin,
  User,
  Target,
  DollarSign,
  Hash,
  ThumbsUp,
  Repeat,
  Send,
  UserPlus,
  ExternalLink,
  AlertTriangle
} from "lucide-react";

// Types for API responses
interface AnalyticsData {
  followers_count: number;
  media_count: number;
  engagement_rate?: number;
  profile_views?: number;
}

interface PostData {
  id: string;
  media_type: string;
  media_url: string;
  like_count: number;
  comments_count: number;
  timestamp: string;
  caption?: string;
  insights?: {
    saved: number;
    reach: number;
    impressions: number;
    engagement: number;
  };
}

interface ProfileData {
  profile_picture_url: string;
  username: string;
  followers_count?: number;
  follows_count?: number;
}

interface InsightsData {
  data: Array<{
    name: string;
    period: string;
    values: Array<{ value: number; end_time: string }>;
    title: string;
    description: string;
    total_value?: number;
  }>;
}

interface FollowerActivity {
  new_followers: number;
  returning_followers: number;
  growth_data: Array<{ date: string; followers: number }>;
}

interface LinkClicks {
  data: Array<{
    values: Array<{ value: number; end_time: string }>;
  }>;
}

interface AlertData {
  metric: string;
  change: number;
  date: string;
  type: string;
  message: string;
  priority: "high" | "medium" | "low";
}

interface HashtagStats {
  [hashtag: string]: {
    likes: number;
    comments: number;
    reach: number;
    impressions: number;
  };
}

// Navigation Component
function Navigation({ activeTab, setActiveTab }: { activeTab: string; setActiveTab: (tab: string) => void }) {
  const [profile, setProfile] = useState<ProfileData | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/profile", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          setProfile(data);
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      }
    };
    fetchProfile();
  }, []);

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: BarChart3 },
    { id: "engagement", label: "Engagement", icon: TrendingUp },
    { id: "audience", label: "Audience", icon: Users },
    { id: "content", label: "Content", icon: ImageIcon },
    { id: "alerts", label: "Alerts", icon: AlertCircle },
    { id: "export", label: "Export", icon: Download },
  ];

  return (
    <div className="w-64 bg-white border-r border-gray-200 min-h-screen p-6">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
          <Instagram className="w-5 h-5 text-white" />
        </div>
        <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
          InstaAnalytics
        </h1>
      </div>
      
      <nav className="space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 ${
                activeTab === item.id
                  ? "bg-gradient-to-r from-purple-50 to-pink-50 text-purple-700 border border-purple-200"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Profile Section */}
      <div className="mt-8 pt-8 border-t border-gray-200">
        <div className="flex items-center gap-3">
          <img
            src={profile?.profile_picture_url || "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face"}
            alt="Profile"
            className="w-10 h-10 rounded-full border-2 border-purple-200"
          />
          <div>
            <p className="font-semibold text-sm">@{profile?.username || "demo_account"}</p>
            <p className="text-xs text-gray-500">Professional Account</p>
          </div>
        </div>
      </div>
    </div>
  );
}
/*
// Alert Panel Component with Real Data
function AlertPanel() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/alerts", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          // Map your API data to include priority and date for UI
          const mappedData = data.map((alert) => ({
            ...alert,
            date: new Date(), // use current date for demo; replace if API provides a timestamp
            priority:
              alert.type === "followers" && alert.change < 0 ? "high" :
              alert.type === "profile_views" && alert.change < 0 ? "medium" :
              "low",
          }));
          setAlerts(mappedData);
        }
      } catch (error) {
        console.error("Error fetching alerts:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAlerts();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold">Alerts & Notifications</h2>
            <p className="text-gray-600">Stay updated with important metrics changes</p>
          </div>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">Alerts & Notifications</h2>
          <p className="text-gray-600">Stay updated with important metrics changes</p>
        </div>
      </div>

      <div className="grid gap-4">
        {alerts.length > 0 ? alerts.map((alert, idx) => (
          <Card key={idx} className={`border-l-4 ${
            alert.priority === "high" ? "border-l-red-500" :
            alert.priority === "medium" ? "border-l-yellow-500" :
            "border-l-green-500"
          }`}>
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-full ${
                  alert.priority === "high" ? "bg-red-100 text-red-600" :
                  alert.priority === "medium" ? "bg-yellow-100 text-yellow-600" :
                  "bg-green-100 text-green-600"
                }`}>
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium">{alert.message}</p>
                  <p className="text-sm text-gray-500 flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {new Date(alert.date).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <Badge variant={alert.change > 0 ? "default" : "destructive"}>
                {alert.change > 0 ? "+" : ""}{alert.change}
              </Badge>
            </CardContent>
          </Card>
        )) : (
          <Card>
            <CardContent className="p-8 text-center">
              <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No alerts</h3>
              <p className="text-gray-500">You're all caught up! No new alerts to display.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

*/

// Engagement Analytics Component with Real Data
function EngagementAnalytics() {
  const [timeRange, setTimeRange] = useState("weekly");
  const [insights, setInsights] = useState<InsightsData | null>(null);
  const [posts, setPosts] = useState<PostData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [insightsRes, postsRes] = await Promise.all([
          fetch("http://localhost:5000/api/insights", { credentials: "include" }),
          fetch("http://localhost:5000/api/posts", { credentials: "include" })
        ]);

        if (insightsRes.ok) {
          const insightsData = await insightsRes.json();
          setInsights(insightsData);
        }

        if (postsRes.ok) {
          const postsData = await postsRes.json();
          setPosts(postsData.data || []);
        }
      } catch (error) {
        console.error("Error fetching engagement data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [timeRange]);

  if (loading) {
    return <LoadingSkeleton />;
  }

  // Calculate engagement metrics from posts
  const engagementMetrics = [
    { 
      name: "Likes", 
      value: posts.reduce((sum, post) => sum + (post.like_count || 0), 0), 
      change: "+12.4%", 
      icon: Heart 
    },
    { 
      name: "Comments", 
      value: posts.reduce((sum, post) => sum + (post.comments_count || 0), 0), 
      change: "+8.2%", 
      icon: MessageCircle 
    },
    { 
      name: "Shares", 
      value: posts.reduce((sum, post) => sum + (post.insights?.saved || 0), 0), 
      change: "+15.3%", 
      icon: Share2 
    },
    { 
      name: "Reach", 
      value: posts.reduce((sum, post) => sum + (post.insights?.reach || 0), 0), 
      change: "+22.1%", 
      icon: Eye 
    },
  ];

  const postPerformance = posts.slice(0, 5).map((post, index) => ({
    name: `Post ${index + 1}`,
    likes: post.like_count || 0,
    comments: post.comments_count || 0,
    engagement: post.insights?.engagement || 0
  }));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">Engagement Analytics</h2>
          <p className="text-gray-600">Detailed analysis of your audience engagement</p>
        </div>
        <div className="flex gap-2">
          {["daily", "weekly", "monthly"].map((range) => (
            <Button
              key={range}
              variant={timeRange === range ? "default" : "outline"}
              onClick={() => setTimeRange(range)}
              size="sm"
            >
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {/* Engagement Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {engagementMetrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <Card key={metric.name} className="bg-gradient-to-br from-white to-gray-50 border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{metric.name}</p>
                    <p className="text-2xl font-bold mt-1">{metric.value.toLocaleString()}</p>
                    <Badge variant="secondary" className="mt-2 bg-green-100 text-green-700">
                      {metric.change}
                    </Badge>
                  </div>
                  <div className="p-3 bg-purple-100 rounded-full">
                    <Icon className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Engagement Rate Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={postPerformance}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="engagement" 
                  stroke="#8b5cf6" 
                  strokeWidth={3}
                  dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Post Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={postPerformance}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="likes" fill="#8b5cf6" name="Likes" />
                <Bar dataKey="comments" fill="#ec4899" name="Comments" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Best Performing Posts */}
      <Card>
        <CardHeader>
          <CardTitle>Best Performing Posts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {posts.slice(0, 3).map((post, index) => (
              <div key={post.id} className="flex items-center gap-4 p-4 border rounded-lg">
                <img
                  src={post.media_url}
                  alt={`Post ${index + 1}`}
                  className="w-16 h-16 rounded-lg object-cover"
                />
                <div className="flex-1">
                  <p className="font-medium">Post {index + 1} - {new Date(post.timestamp).toLocaleDateString()}</p>
                  <div className="flex gap-4 mt-2 text-sm text-gray-600">
                    <span className="flex items-center gap-1"><Heart className="w-4 h-4" /> {post.like_count?.toLocaleString()}</span>
                    <span className="flex items-center gap-1"><MessageCircle className="w-4 h-4" /> {post.comments_count}</span>
                    <span className="flex items-center gap-1"><Bookmark className="w-4 h-4" /> {post.insights?.saved || 0}</span>
                  </div>
                </div>
                <Badge variant="outline" className="bg-green-50 text-green-700">
                  {post.insights?.engagement?.toFixed(1) || "0"}% Engagement
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Export Panel Component with Real Data
function ExportPanel() {
  const [selectedFormat, setSelectedFormat] = useState("CSV");
  const [selectedRange, setSelectedRange] = useState("Last 30 days");
  const [selectedMetrics, setSelectedMetrics] = useState(["Followers", "Engagement"]);
  const [exportData, setExportData] = useState<any>(null);

  const handleExport = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/export-data", { 
        credentials: "include",
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) throw new Error('Export failed');
      
      const data = await response.json();
      setExportData(data);
      
      // Create and trigger download
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `instagram-analytics-${new Date().toISOString().split('T')[0]}.${selectedFormat.toLowerCase()}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export failed:", error);
    }
  };

  const exportOptions = {
    formats: ["CSV", "PDF", "Excel", "JSON"],
    dateRanges: ["Last 7 days", "Last 30 days", "Last 90 days", "Custom"],
    metrics: ["Followers", "Engagement", "Reach", "Impressions", "All Metrics"]
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Export Analytics Data</h2>
        <p className="text-gray-600">Download your analytics in various formats</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Export Settings */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Export Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Format Selection */}
            <div>
              <label className="text-sm font-medium mb-2 block">Format</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {exportOptions.formats.map((format) => (
                  <Button
                    key={format}
                    variant={selectedFormat === format ? "default" : "outline"}
                    onClick={() => setSelectedFormat(format)}
                    className="flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    {format}
                  </Button>
                ))}
              </div>
            </div>

            {/* Date Range */}
            <div>
              <label className="text-sm font-medium mb-2 block">Date Range</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {exportOptions.dateRanges.map((range) => (
                  <Button
                    key={range}
                    variant={selectedRange === range ? "default" : "outline"}
                    onClick={() => setSelectedRange(range)}
                  >
                    {range}
                  </Button>
                ))}
              </div>
            </div>

            {/* Metrics Selection */}
            <div>
              <label className="text-sm font-medium mb-2 block">Metrics to Include</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {exportOptions.metrics.map((metric) => (
                  <Button
                    key={metric}
                    variant={selectedMetrics.includes(metric) ? "default" : "outline"}
                    onClick={() => {
                      if (metric === "All Metrics") {
                        setSelectedMetrics(exportOptions.metrics.filter(m => m !== "All Metrics"));
                      } else if (selectedMetrics.includes(metric)) {
                        setSelectedMetrics(selectedMetrics.filter(m => m !== metric));
                      } else {
                        setSelectedMetrics([...selectedMetrics, metric]);
                      }
                    }}
                  >
                    {metric}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preview & Export */}
        <Card>
          <CardHeader>
            <CardTitle>Export Preview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Format:</span>
                <span className="font-medium">{selectedFormat}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Date Range:</span>
                <span className="font-medium">{selectedRange}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Metrics:</span>
                <span className="font-medium">{selectedMetrics.length} selected</span>
              </div>
            </div>

            <Button onClick={handleExport} className="w-full flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export Data
            </Button>

            <div className="text-xs text-gray-500">
              Your data will be processed and downloaded in the selected format. Large datasets may take a few minutes.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Audience Analytics Component with Real Data
function AudienceAnalytics() {
  const [followerActivity, setFollowerActivity] = useState<FollowerActivity | null>(null);
  const [demographics, setDemographics] = useState<any>(null); 
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [faRes, demoRes] = await Promise.all([
          fetch("http://localhost:5000/api/follower-activity", { credentials: "include" }),
          fetch("http://localhost:5000/api/audience-demographics", { credentials: "include" })
        ]);
        if (faRes.ok) {
          const data = await faRes.json();
          setFollowerActivity(data);
        }
        if (demoRes.ok) {
          const demoData = await demoRes.json();
          setDemographics(demoData);
        }
      } catch (error) {
        console.error("Error fetching audience data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return <LoadingSkeleton />;
  }

    // Transform age_gender data for chart
  const ageGenderData = demographics?.age_gender
    ? Object.entries(demographics.age_gender).map(([key, value]: [string, number]) => {
        // key format: "F.18-24", "M.25-34"
        const [gender, age] = key.split(".");
        return { age, gender, value };
      })
    : [];

  // Group by age for chart
  const ageGroups = Array.from(
    ageGenderData.reduce((acc, curr) => {
      if (!acc.has(curr.age)) acc.set(curr.age, { age: curr.age, male: 0, female: 0 });
      if (curr.gender === "M") acc.get(curr.age).male += curr.value;
      if (curr.gender === "F") acc.get(curr.age).female += curr.value;
      return acc;
    }, new Map()),
    ([, v]) => v
  );
 

  const cities = [
    { name: "New York", value: 320 },
    { name: "Los Angeles", value: 280 },
    { name: "Chicago", value: 180 },
    { name: "Houston", value: 150 },
    { name: "Miami", value: 120 },
  ];

  const COLORS = ["#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#3b82f6"];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Audience Demographics</h2>
        <p className="text-gray-600">Understand your audience composition</p>
      </div>

      {/* Follower Activity Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">New Followers</p>
                <p className="text-2xl font-bold mt-1">{followerActivity?.new_followers || 0}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <UserPlus className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Returning Followers</p>
                <p className="text-2xl font-bold mt-1">{followerActivity?.returning_followers || 0}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Growth</p>
                <p className="text-2xl font-bold mt-1">
                  {followerActivity?.growth_data ? 
                    followerActivity.growth_data[followerActivity.growth_data.length - 1]?.followers - followerActivity.growth_data[0]?.followers 
                    : 0}
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Follower Growth Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={followerActivity?.growth_data || []}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="followers" 
                  stroke="#8b5cf6" 
                  strokeWidth={3}
                  dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Age & Gender Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={ageGroups}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="age" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="male" fill="#3b82f6" name="Male" />
                <Bar dataKey="female" fill="#ec4899" name="Female" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Content Analytics Component with Real Data
function ContentAnalytics() {
  const [posts, setPosts] = useState<PostData[]>([]);
  const [hashtagStats, setHashtagStats] = useState<HashtagStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [postsRes, hashtagRes] = await Promise.all([
          fetch("http://localhost:5000/api/posts", { credentials: "include" }),
          fetch("http://localhost:5000/api/hashtag-performance", { credentials: "include" })
        ]);

        if (postsRes.ok) {
          const postsData = await postsRes.json();
          setPosts(postsData.data || []);
        }

        if (hashtagRes.ok) {
          const hashtagData = await hashtagRes.json();
          setHashtagStats(hashtagData);
        }
      } catch (error) {
        console.error("Error fetching content data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return <LoadingSkeleton />;
  }

  // Calculate content performance by type
  const contentPerformance = [
    { 
      type: "Images", 
      posts: posts.filter(p => p.media_type === "IMAGE").length,
      engagement: 4.8, 
      avgLikes: posts.filter(p => p.media_type === "IMAGE").reduce((sum, p) => sum + p.like_count, 0) / posts.filter(p => p.media_type === "IMAGE").length || 0 
    },
    { 
      type: "Videos", 
      posts: posts.filter(p => p.media_type === "VIDEO").length,
      engagement: 6.2, 
      avgLikes: posts.filter(p => p.media_type === "VIDEO").reduce((sum, p) => sum + p.like_count, 0) / posts.filter(p => p.media_type === "VIDEO").length || 0 
    },
    { 
      type: "Carousels", 
      posts: posts.filter(p => p.media_type === "CAROUSEL_ALBUM").length,
      engagement: 5.9, 
      avgLikes: posts.filter(p => p.media_type === "CAROUSEL_ALBUM").reduce((sum, p) => sum + p.like_count, 0) / posts.filter(p => p.media_type === "CAROUSEL_ALBUM").length || 0 
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Content Performance</h2>
        <p className="text-gray-600">Analyze your content strategy effectiveness</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {contentPerformance.map((content) => (
          <Card key={content.type}>
            <CardContent className="p-6">
              <div className="text-center space-y-3">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto">
                  <ImageIcon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-bold text-lg">{content.type}</h3>
                <div className="space-y-1">
                  <p className="text-sm text-gray-600">{content.posts} Posts</p>
                  <p className="text-sm text-gray-600">{content.engagement}% Avg Engagement</p>
                  <p className="text-sm text-gray-600">{content.avgLikes.toFixed(0)} Avg Likes</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Hashtag Performance */}
      {hashtagStats && Object.keys(hashtagStats).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Hashtags</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(hashtagStats)
                .sort(([,a], [,b]) => (b.likes + b.comments) - (a.likes + a.comments))
                .slice(0, 5)
                .map(([hashtag, stats]) => (
                  <div key={hashtag} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Hash className="w-5 h-5 text-purple-600" />
                      <span className="font-medium">#{hashtag}</span>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{(stats.likes + stats.comments).toLocaleString()}</p>
                      <p className="text-sm text-gray-600">
                        {stats.likes} likes • {stats.comments} comments
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// KPI Card Component
function KPICard({ title, value, icon, color, trend }: { 
  title: string; 
  value: string; 
  icon: React.ReactNode; 
  color: 'followers' | 'engagement' | 'posts' | 'views' | 'links' | 'new'; 
  trend: string;
}) {
  const colorClasses = {
    followers: 'text-blue-600 border-blue-200 bg-blue-50',
    engagement: 'text-green-600 border-green-200 bg-green-50',
    posts: 'text-purple-600 border-purple-200 bg-purple-50',
    views: 'text-pink-600 border-pink-200 bg-pink-50',
    links: 'text-orange-600 border-orange-200 bg-orange-50',
    new: 'text-teal-600 border-teal-200 bg-teal-50'
  };

  return (
    <Card className={`border-2 ${colorClasses[color]} transition-all duration-300 hover:shadow-lg`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium opacity-75">{title}</p>
            <p className="text-3xl font-bold mt-1">{value}</p>
            <Badge variant="secondary" className="mt-2 bg-white">
              {trend}
            </Badge>
          </div>
          <div className="p-3 rounded-full bg-white bg-opacity-50">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Post Card Component
function PostCard({ post, selected, onSelect }: { 
  post: PostData; 
  selected?: boolean; 
  onSelect?: () => void;
}) {
  const engagementRate = post.insights
    ? (((post.like_count || 0) + (post.comments_count || 0) + (post.insights.saved || 0)) / 
       (post.insights.reach || 1) * 100).toFixed(2)
    : "0";

  return (
    <Card className="group overflow-hidden transition-all duration-300 hover:shadow-lg">
      <div className="aspect-square overflow-hidden relative">
        {onSelect && (
          <input
            type="checkbox"
            checked={selected}
            onChange={onSelect}
            className="absolute top-2 left-2 z-10 w-5 h-5"
            title="Select for comparison"
          />
        )}
        <img
          src={post.media_url}
          alt="Post"
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </div>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1 text-gray-600">
            <Heart className="w-4 h-4" />
            {post.like_count?.toLocaleString()}
          </div>
          <div className="flex items-center gap-1 text-gray-600">
            <MessageCircle className="w-4 h-4" />
            {post.comments_count}
          </div>
          <div className="flex items-center gap-1 text-gray-600">
            <Bookmark className="w-4 h-4" />
            {post.insights?.saved || 0}
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Reach</span>
            <span className="font-medium">{post.insights?.reach?.toLocaleString() || 0}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Impressions</span>
            <span className="font-medium">{post.insights?.impressions?.toLocaleString() || 0}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Engagement</span>
            <Badge variant="outline" className="border-green-200 text-green-700">
              {engagementRate}%
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Loading Skeleton Component
function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <Card key={i} className="animate-pulse">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
              <div className="space-y-2 flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Error Alert Component
function ErrorAlert({ message }: { message: string }) {
  return (
    <Alert variant="destructive">
      <AlertTriangle className="w-4 h-4" />
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

// Main Dashboard Component
export default function InstagramAnalyticsDashboard() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [posts, setPosts] = useState<PostData[]>([]);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [insights, setInsights] = useState<InsightsData | null>(null);
  const [followerActivity, setFollowerActivity] = useState<FollowerActivity | null>(null);
  const [linkClicks, setLinkClicks] = useState<LinkClicks | null>(null);
  const [alerts, setAlerts] = useState<AlertData[]>([]);
  const [hashtagStats, setHashtagStats] = useState<HashtagStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [timeRange, setTimeRange] = useState("weekly");
  const [profileViewsData, setProfileViewsData] = useState<{ today: number; last_30_days: number }>({ today: 0, last_30_days: 0 });

  // Compare feature state
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [compareResult, setCompareResult] = useState<any>(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareError, setCompareError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [
          analyticsRes,
          postsRes,
          profileRes,
          insightsRes,
          followerActivityRes,
          linkClicksRes,
          alertsRes,
          hashtagRes,
          profileViewsRes
        ] = await Promise.all([
          fetch("http://localhost:5000/api/analytics", { credentials: "include" }),
          fetch("http://localhost:5000/api/posts", { credentials: "include" }),
          fetch("http://localhost:5000/api/profile", { credentials: "include" }),
          fetch("http://localhost:5000/api/insights", { credentials: "include" }),
          fetch("http://localhost:5000/api/follower-activity", { credentials: "include" }),
          fetch("http://localhost:5000/api/link-clicks", { credentials: "include" }),
          fetch("http://localhost:5000/api/alerts", { credentials: "include" }),
          fetch("http://localhost:5000/api/hashtag-performance", { credentials: "include" }),
          fetch("http://localhost:5000/api/profile-views", { credentials: "include" })
        ]);

        const responses = [analyticsRes, postsRes, profileRes, insightsRes, followerActivityRes, linkClicksRes, alertsRes, hashtagRes];
        const failedRequests = responses.filter(res => !res.ok);
        if (failedRequests.length > 0) throw new Error(`Failed to fetch ${failedRequests.length} endpoints`);

        const [
          analyticsData,
          postsData,
          profileData,
          insightsData,
          followerActivityData,
          linkClicksData,
          alertsData,
          hashtagData,
          profileViewsData
        ] = await Promise.all([
          analyticsRes.json(),
          postsRes.json(),
          profileRes.json(),
          insightsRes.json(),
          followerActivityRes.json(),
          linkClicksRes.json(),
          alertsRes.json(),
          hashtagRes.json(),
          profileViewsRes.json()
        ]);

        setAnalytics(analyticsData);
        setPosts(postsData.data || []);
        setProfile(profileData);
        setInsights(insightsData);
        setFollowerActivity(followerActivityData);
        setLinkClicks(linkClicksData);
        setAlerts(alertsData || []);
        setHashtagStats(hashtagData);
        setProfileViewsData(profileViewsData);
      } catch (error) {
        console.error("Error fetching data:", error);
        setError("Failed to fetch analytics data. Check your API connection.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [timeRange]);

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-gray-600">Loading analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />
        <div className="flex-1 p-6">
          <ErrorAlert message={error} />
        </div>
      </div>
    );
  }

  // Calculate metrics
  const engagementRate = posts.length
    ? ((posts.reduce((sum, post) => sum + (post.like_count || 0) + (post.comments_count || 0), 0)) / (analytics?.followers_count || 1) * 100).toFixed(2)
    : "0";

  // Assuming you fetched from /api/profile-views
const profileViewsToday = profileViewsData.today;
const profileViewsLast30Days = profileViewsData.last_30_days;

  const bioLinkClicks = linkClicks?.data?.[0]?.values?.reduce((sum, v) => sum + v.value, 0) || 0;
  const newFollowers = followerActivity?.new_followers || 0;

  // Compare logic
  const toggleCompare = (id: string) => {
    setCompareIds(ids =>
      ids.includes(id) ? ids.filter(pid => pid !== id) : [...ids, id]
    );
  };

  const handleCompare = async () => {
    if (compareIds.length < 2) {
      setCompareError("Select at least 2 posts to compare.");
      return;
    }
    setCompareLoading(true);
    setCompareError(null);
    try {
      const res = await fetch(`http://localhost:5000/api/compare-posts?ids=${compareIds.join(",")}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch comparison");
      const data = await res.json();
      setCompareResult(data);
    } catch (err: any) {
      setCompareError(err.message);
    } finally {
      setCompareLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="flex-1 p-6 space-y-6 overflow-y-auto">
        {activeTab === "dashboard" && (
          <>
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Analytics Dashboard
                </h1>
                <p className="text-gray-600 mt-1">Welcome back! Here's your Instagram performance overview.</p>
              </div>
              
              <div className="flex gap-2">
                {["daily", "weekly", "monthly"].map((range) => (
                  <Button
                    key={range}
                    variant={timeRange === range ? "default" : "outline"}
                    onClick={() => setTimeRange(range)}
                    size="sm"
                  >
                    {range.charAt(0).toUpperCase() + range.slice(1)}
                  </Button>
                ))}
              </div>
            </div>

            {/* Alerts */}
            {alerts.length > 0 && (
              <div className="space-y-4">
                {alerts.slice(0, 3).map((alert, i) => (
                  <Alert key={i} variant={alert.change > 0 ? "default" : "destructive"}>
                    <TrendingUp className="w-4 h-4" />
                    <AlertDescription>
                      <span className="font-medium">{alert.metric}</span> changed by{" "}
                      <span className={alert.change > 0 ? "text-green-600" : "text-red-600"}>
                        {alert.change > 0 ? "+" : ""}{alert.change}%
                      </span>{" "}
                      on {new Date(alert.date).toLocaleDateString()}
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            )}

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <KPICard 
                title="Followers" 
                value={analytics?.followers_count?.toLocaleString() || "0"} 
                icon={<Users className="w-6 h-6" />} 
                color="followers" 
                trend="+5.2%" 
              />
              <KPICard 
                title="Engagement Rate" 
                value={`${engagementRate}%`} 
                icon={<TrendingUp className="w-6 h-6" />} 
                color="engagement" 
                trend="+12.4%" 
              />
              <KPICard 
                title="Total Posts" 
                value={analytics?.media_count?.toString() || "0"} 
                icon={<ImageIcon className="w-6 h-6" />} 
                color="posts" 
                trend="+2" 
              />
              <KPICard 
                title="Profile Views" 
                value={profileViewsData.today !== undefined ? profileViewsData.today.toLocaleString() : "Not available"} 
                icon={<Eye className="w-6 h-6" />} 
                color="views" 
                trend="+8.1%" 
              />
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Followers Growth</CardTitle>
                  <Badge variant="outline" className="bg-green-50 text-green-700">
                    +{followerActivity?.growth_data ? 
                      followerActivity.growth_data[followerActivity.growth_data.length - 1]?.followers - followerActivity.growth_data[0]?.followers 
                      : 0} growth
                  </Badge>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={followerActivity?.growth_data || []}>
                      <defs>
                        <linearGradient id="colorFollowers" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Area 
                        type="monotone" 
                        dataKey="followers" 
                        stroke="#8b5cf6" 
                        fill="url(#colorFollowers)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Engagement Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={posts.slice(0, 7).map((post, i) => ({
                      name: `Post ${i + 1}`,
                      engagement: post.insights?.engagement || 0,
                      reach: post.insights?.reach || 0
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Line 
                        type="monotone" 
                        dataKey="engagement" 
                        stroke="#ec4899" 
                        strokeWidth={3}
                        dot={{ fill: '#ec4899', strokeWidth: 2, r: 4 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="reach" 
                        stroke="#f59e0b" 
                        strokeWidth={2}
                        strokeDasharray="5 5"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            

            {/* Recent Posts */}
            {posts.length > 0 && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Recent Posts Performance</CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                      disabled={currentPage === 0}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => prev + 1)}
                      disabled={currentPage >= Math.ceil(posts.length / 4) - 1}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {posts.slice(currentPage * 4, currentPage * 4 + 4).map((post) => (
                      <PostCard key={post.id} post={post} />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {activeTab === "engagement" && <EngagementAnalytics />}
        {activeTab === "audience" && <AudienceAnalytics />}
        {activeTab === "content" && <ContentAnalytics />}
        {activeTab === "export" && <ExportPanel />}
      </main>
    </div>
  );
}

