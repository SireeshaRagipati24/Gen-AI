import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  Legend
} from "recharts";
import { 
  TrendingUp, 
  Clock, 
  Hash, 
  Image, 
  Video, 
  Calendar,
  Users
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

interface GrowthData {
  date: string;
  followers: number;
}

interface AudienceDemographics {
  age_gender: Record<string, number>;
  location: { cities: Record<string, number>; countries: Record<string, number> };
  gender: Record<string, number>;
}

export default function AdvancedCharts() {
  const [engagementByType, setEngagementByType] = useState<EngagementByType>({});
  const [bestTime, setBestTime] = useState<BestTimeData>({ by_hour: {}, by_day: {} });
  const [hashtagData, setHashtagData] = useState<HashtagData>({});
  const [growth, setGrowth] = useState<GrowthData[]>([]);
  const [audience, setAudience] = useState<AudienceDemographics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [engagementRes, bestTimeRes, hashtagRes, growthRes, audienceRes] = await Promise.all([
          fetch("/api/engagement-by-type"),
          fetch("/api/best-time-post"),
          fetch("/api/hashtag-performance"),
          fetch("/api/followers-growth"),
          fetch("/api/audience-demographics")
        ]);

        const responses = [engagementRes, bestTimeRes, hashtagRes, growthRes, audienceRes];
        const failedRequests = responses.filter(res => !res.ok);
        
        if (failedRequests.length > 0) {
          throw new Error(`Failed to fetch data from ${failedRequests.length} endpoint(s)`);
        }

        const [engagementData, bestTimeData, hashtagDataRes, growthData, audienceData] = await Promise.all([
          engagementRes.json(),
          bestTimeRes.json(),
          hashtagRes.json(),
          growthRes.json(),
          audienceRes.json()
        ]);

        setEngagementByType(engagementData);
        setBestTime(bestTimeData);
        setHashtagData(hashtagDataRes);
        setAudience(audienceData);

        // Format growth data
        const formatted = growthData.data?.[0]?.values?.length
          ? growthData.data[0].values.map((d: any) => ({
              date: new Date(d.end_time).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              }),
              followers: d.value,
            }))
          : [];
        setGrowth(formatted);

      } catch (error) {
        console.error("Error fetching advanced analytics:", error);
        setError("Failed to fetch advanced analytics data");
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

  if (error) {
    return (
      <div className="p-8">
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-4">
            <p className="text-destructive text-sm">{error}</p>
          </CardContent>
        </Card>
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

  const ageGenderData = audience?.age_gender
    ? Object.entries(audience.age_gender).reduce((acc: any[], [key, value]) => {
        const [age, gender] = key.split("_");
        let item = acc.find(d => d.age === age);
        if (item) {
          item[gender] = value;
        } else {
          acc.push({ age, [gender]: value });
        }
        return acc;
      }, [])
    : [];

  const cityData = audience?.location?.cities
    ? Object.entries(audience.location.cities).map(([name, value]) => ({ name, value })).slice(0, 5)
    : [];

  const genderData = audience?.gender
    ? Object.entries(audience.gender).map(([name, value]) => ({ name, value }))
    : [];

  const COLORS = ["#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#3b82f6"];

  return (
    <div className="space-y-8 p-8">
      {/* Engagement by Content Type & Best Hours */}
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
          </CardContent>
        </Card>

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
          </CardContent>
        </Card>
      </div>

      {/* Followers Growth & Best Days */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="shadow-card hover:shadow-soft transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-chart-primary/10 text-chart-primary">
                <TrendingUp className="w-5 h-5" />
              </div>
              Followers Growth
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={growth}>
                <defs>
                  <linearGradient id="colorFollowers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-primary))" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="hsl(var(--chart-primary))" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 'var(--radius)'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="followers" 
                  stroke="hsl(var(--chart-primary))" 
                  fill="url(#colorFollowers)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

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
      </div>

      {/* Audience Demographics & Top Hashtags */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="shadow-card hover:shadow-soft transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-chart-secondary/10 text-chart-secondary">
                <Users className="w-5 h-5" />
              </div>
              Audience Demographics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={ageGenderData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="age" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 'var(--radius)'
                  }}
                />
                <Legend />
                <Bar dataKey="male" fill="hsl(var(--chart-primary))" name="Male" />
                <Bar dataKey="female" fill="hsl(var(--chart-secondary))" name="Female" />
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
          </CardContent>
        </Card>
      </div>

      {/* Location Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="shadow-card hover:shadow-soft transition-all duration-300">
          <CardHeader>
            <CardTitle>Top Cities</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie 
                  data={cityData} 
                  dataKey="value" 
                  nameKey="name" 
                  cx="50%" 
                  cy="50%" 
                  outerRadius={80} 
                  label
                >
                  {cityData.map((_, index) => (
                    <Cell key={`city-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-card hover:shadow-soft transition-all duration-300">
          <CardHeader>
            <CardTitle>Gender Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie 
                  data={genderData} 
                  dataKey="value" 
                  nameKey="name" 
                  cx="50%" 
                  cy="50%" 
                  outerRadius={80} 
                  label
                >
                  {genderData.map((_, index) => (
                    <Cell key={`gender-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}