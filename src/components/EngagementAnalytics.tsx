import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";
import { 
  TrendingUp, 
  Clock, 
  Hash, 
  Image, 
  Video, 
  Calendar
} from "lucide-react";

interface EngagementByType {
  [key: string]: {
    likes: number;
    comments: number;
  };
}

interface BestTimeData {
  by_hour: { [hour: string]: number };
  by_day: { [day: string]: number };
}

interface HashtagData {
  [tag: string]: {
    likes: number;
    comments: number;
  };
}

export default function EngagementAnalytics() {
  const [engagementByType, setEngagementByType] = useState<EngagementByType>({});
  const [bestTime, setBestTime] = useState<BestTimeData>({ by_hour: {}, by_day: {} });
  const [hashtagData, setHashtagData] = useState<HashtagData>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Mock data for demonstration - replace with real API calls when Flask server is running
        setEngagementByType({
          "IMAGE": { likes: 3240, comments: 156 },
          "VIDEO": { likes: 1890, comments: 89 },
          "CAROUSEL_ALBUM": { likes: 2150, comments: 112 }
        });

        setBestTime({
          by_hour: {
            "9": 450, "10": 620, "11": 580, "12": 720,
            "13": 890, "14": 640, "15": 780, "16": 920,
            "17": 1200, "18": 1450, "19": 1680, "20": 1320,
            "21": 980
          },
          by_day: {
            "Monday": 2450, "Tuesday": 2680, "Wednesday": 2890,
            "Thursday": 3120, "Friday": 3450, "Saturday": 2980,
            "Sunday": 2640
          }
        });

        setHashtagData({
          "socialmedia": { likes: 1250, comments: 45 },
          "marketing": { likes: 980, comments: 38 },
          "analytics": { likes: 760, comments: 28 },
          "growth": { likes: 640, comments: 22 },
          "engagement": { likes: 520, comments: 18 }
        });

        const [engagementRes, bestTimeRes, hashtagRes] = await Promise.all([
          fetch("http://localhost:5000/api/engagement-by-type"),
          fetch("http://localhost:5000/api/best-time-post"),
          fetch("http://localhost:5000/api/hashtag-performance")
        ]);

        const [engagementData, bestTimeData, hashtagDataRes] = await Promise.all([
          engagementRes.json(),
          bestTimeRes.json(),
          hashtagRes.json()
        ]);

        setEngagementByType(engagementData);
        setBestTime(bestTimeData);
        setHashtagData(hashtagDataRes);
        

      } catch (error) {
        console.error("Error fetching engagement data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-8 p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="h-20 bg-muted"></CardHeader>
              <CardContent className="h-64 bg-muted/50"></CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Transform data for charts
  const engagementTypeData = Object.entries(engagementByType).map(([type, data]) => ({
    type: type.replace('_', ' '),
    likes: data.likes,
    comments: data.comments,
    total: data.likes + data.comments
  }));

  const hourlyData = Object.entries(bestTime.by_hour).map(([hour, engagement]) => ({
    hour: `${hour}:00`,
    engagement
  }));

  const dailyData = Object.entries(bestTime.by_day).map(([day, engagement]) => ({
    day: day.substring(0, 3),
    engagement
  }));

  const topHashtags = Object.entries(hashtagData)
    .map(([tag, data]) => ({
      tag: `#${tag}`,
      likes: data.likes,
      comments: data.comments,
      total: data.likes + data.comments
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  const COLORS = ["#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#3b82f6"];

  return (
    <div className="space-y-8 p-8">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          Advanced Analytics
        </h2>
        <p className="text-muted-foreground mt-2">Deep insights into your content performance</p>
      </div>

      {/* Engagement by Content Type */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="shadow-card hover:shadow-soft transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-chart-primary/10 text-chart-primary">
                <TrendingUp className="w-5 h-5" />
              </div>
              Engagement by Content Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={engagementTypeData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="type" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 'var(--radius)'
                  }}
                />
                <Legend />
                <Bar dataKey="likes" fill="hsl(var(--chart-primary))" name="Likes" />
                <Bar dataKey="comments" fill="hsl(var(--chart-secondary))" name="Comments" />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 grid grid-cols-3 gap-4">
              {engagementTypeData.map((item, index) => (
                <div key={item.type} className="text-center p-3 bg-muted/30 rounded-lg">
                  <div className="flex justify-center mb-2">
                    {item.type.includes('VIDEO') ? 
                      <Video className="w-5 h-5 text-chart-secondary" /> :
                      <Image className="w-5 h-5 text-chart-primary" />
                    }
                  </div>
                  <p className="text-sm font-medium">{item.type}</p>
                  <p className="text-xs text-muted-foreground">{item.total} total</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Best Time to Post - Hourly */}
        <Card className="shadow-card hover:shadow-soft transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-chart-accent/10 text-chart-accent">
                <Clock className="w-5 h-5" />
              </div>
              Best Hours to Post
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={hourlyData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="hour" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 'var(--radius)'
                  }}
                />
                <Bar 
                  dataKey="engagement" 
                  fill="hsl(var(--chart-accent))"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 p-3 bg-chart-accent/5 rounded-lg">
              <p className="text-sm font-medium text-chart-accent">💡 Peak engagement: 6-8 PM</p>
              <p className="text-xs text-muted-foreground mt-1">
                Your audience is most active during evening hours
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Best Days and Top Hashtags */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="shadow-card hover:shadow-soft transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-chart-success/10 text-chart-success">
                <Calendar className="w-5 h-5" />
              </div>
              Best Days to Post
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailyData} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis type="number" className="text-xs" />
                <YAxis dataKey="day" type="category" className="text-xs" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 'var(--radius)'
                  }}
                />
                <Bar 
                  dataKey="engagement" 
                  fill="hsl(var(--chart-success))"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-card hover:shadow-soft transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-chart-warning/10 text-chart-warning">
                <Hash className="w-5 h-5" />
              </div>
              Top Performing Hashtags
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topHashtags.slice(0, 8).map((hashtag, index) => (
                <div key={hashtag.tag} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <Badge 
                      variant="outline" 
                      className="font-mono text-chart-warning border-chart-warning/30"
                    >
                      #{index + 1}
                    </Badge>
                    <span className="font-medium">{hashtag.tag}</span>
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-medium">{hashtag.total.toLocaleString()}</p>
                    <p className="text-muted-foreground text-xs">
                      {hashtag.likes} likes • {hashtag.comments} comments
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 bg-chart-warning/5 rounded-lg">
              <p className="text-sm font-medium text-chart-warning">
                💡 Use #{topHashtags[0]?.tag.slice(1)} for best reach
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                This hashtag generates {Math.round(topHashtags[0]?.total / topHashtags[topHashtags.length - 1]?.total || 1)}x more engagement
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}