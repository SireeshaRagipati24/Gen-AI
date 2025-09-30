import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from "recharts";
import { 
  Heart, 
  MessageCircle, 
  Eye, 
  Bookmark, 
  Share, 
  BarChart3,
  ImageIcon
} from "lucide-react";

interface PostComparisonData {
  [postId: string]: {
    id: string;
    like_count: number;
    comments_count: number;
    insights: {
      reach: number;
      impressions: number;
      saved: number;
    };
    media_url?: string;
    timestamp: string;
  };
}

export default function PostComparison() {
  const [postId1, setPostId1] = useState("");
  const [postId2, setPostId2] = useState("");
  const [comparisonData, setComparisonData] = useState<PostComparisonData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCompare = async () => {
    if (!postId1 || !postId2) {
      setError("Please enter both post IDs");
      return;
    }

    if (postId1 === postId2) {
      setError("Please enter different post IDs");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/compare-posts?ids=${postId1},${postId2}`);
      if (!response.ok) {
        throw new Error("Failed to fetch comparison data");
      }
      
      const data = await response.json();
      setComparisonData(data);
    } catch (error) {
      console.error("Error comparing posts:", error);
      setError("Failed to compare posts. Please check the post IDs.");
    } finally {
      setLoading(false);
    }
  };

  const resetComparison = () => {
    setPostId1("");
    setPostId2("");
    setComparisonData(null);
    setError(null);
  };

  if (!comparisonData) {
    return (
      <div className="space-y-6 p-8">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Post Comparison
          </h2>
          <p className="text-muted-foreground mt-2">Compare performance metrics between two posts</p>
        </div>

        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-chart-primary/10 text-chart-primary">
                <BarChart3 className="w-5 h-5" />
              </div>
              Enter Post IDs
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">First Post ID</label>
              <Input
                placeholder="Enter first post ID"
                value={postId1}
                onChange={(e) => setPostId1(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Second Post ID</label>
              <Input
                placeholder="Enter second post ID"
                value={postId2}
                onChange={(e) => setPostId2(e.target.value)}
              />
            </div>
            
            {error && (
              <div className="text-destructive text-sm">{error}</div>
            )}

            <Button 
              onClick={handleCompare} 
              disabled={loading}
              className="w-full"
            >
              {loading ? "Comparing..." : "Compare Posts"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const posts = Object.values(comparisonData);
  const [post1, post2] = posts;

  // Prepare data for charts
  const barChartData = [
    {
      metric: "Likes",
      post1: post1.like_count,
      post2: post2.like_count
    },
    {
      metric: "Comments", 
      post1: post1.comments_count,
      post2: post2.comments_count
    },
    {
      metric: "Reach",
      post1: post1.insights.reach,
      post2: post2.insights.reach
    },
    {
      metric: "Impressions",
      post1: post1.insights.impressions,
      post2: post2.insights.impressions
    },
    {
      metric: "Saves",
      post1: post1.insights.saved,
      post2: post2.insights.saved
    }
  ];

  const radarData = [
    {
      subject: 'Likes',
      post1: (post1.like_count / Math.max(post1.like_count, post2.like_count)) * 100,
      post2: (post2.like_count / Math.max(post1.like_count, post2.like_count)) * 100
    },
    {
      subject: 'Comments',
      post1: (post1.comments_count / Math.max(post1.comments_count, post2.comments_count)) * 100,
      post2: (post2.comments_count / Math.max(post1.comments_count, post2.comments_count)) * 100
    },
    {
      subject: 'Reach',
      post1: (post1.insights.reach / Math.max(post1.insights.reach, post2.insights.reach)) * 100,
      post2: (post2.insights.reach / Math.max(post1.insights.reach, post2.insights.reach)) * 100
    },
    {
      subject: 'Impressions',
      post1: (post1.insights.impressions / Math.max(post1.insights.impressions, post2.insights.impressions)) * 100,
      post2: (post2.insights.impressions / Math.max(post1.insights.impressions, post2.insights.impressions)) * 100
    },
    {
      subject: 'Saves',
      post1: (post1.insights.saved / Math.max(post1.insights.saved, post2.insights.saved)) * 100,
      post2: (post2.insights.saved / Math.max(post1.insights.saved, post2.insights.saved)) * 100
    }
  ];

  const calculateEngagementRate = (post: any) => {
    const totalEngagement = post.like_count + post.comments_count + post.insights.saved;
    return ((totalEngagement / post.insights.reach) * 100).toFixed(2);
  };

  return (
    <div className="space-y-8 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Post Comparison Results
          </h2>
          <p className="text-muted-foreground mt-2">Side-by-side performance analysis</p>
        </div>
        <Button onClick={resetComparison} variant="outline">
          New Comparison
        </Button>
      </div>

      {/* Post Overview Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <PostOverviewCard 
          post={post1} 
          title="Post 1" 
          postId={postId1}
          engagementRate={calculateEngagementRate(post1)}
        />
        <PostOverviewCard 
          post={post2} 
          title="Post 2" 
          postId={postId2}
          engagementRate={calculateEngagementRate(post2)}
        />
      </div>

      {/* Comparison Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="shadow-card hover:shadow-soft transition-all duration-300">
          <CardHeader>
            <CardTitle>Metrics Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barChartData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="metric" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 'var(--radius)'
                  }}
                />
                <Bar dataKey="post1" fill="hsl(var(--chart-primary))" name="Post 1" />
                <Bar dataKey="post2" fill="hsl(var(--chart-secondary))" name="Post 2" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-card hover:shadow-soft transition-all duration-300">
          <CardHeader>
            <CardTitle>Performance Radar</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="subject" />
                <PolarRadiusAxis angle={90} domain={[0, 100]} />
                <Radar
                  name="Post 1"
                  dataKey="post1"
                  stroke="hsl(var(--chart-primary))"
                  fill="hsl(var(--chart-primary))"
                  fillOpacity={0.3}
                />
                <Radar
                  name="Post 2"
                  dataKey="post2"
                  stroke="hsl(var(--chart-secondary))"
                  fill="hsl(var(--chart-secondary))"
                  fillOpacity={0.3}
                />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Winner Analysis */}
      <Card className="bg-gradient-to-r from-chart-primary/5 to-chart-secondary/5 border-chart-primary/20">
        <CardHeader>
          <CardTitle>Analysis Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <h3 className="font-semibold text-chart-primary">Best Engagement Rate</h3>
              <p className="text-2xl font-bold mt-2">
                Post {calculateEngagementRate(post1) > calculateEngagementRate(post2) ? "1" : "2"}
              </p>
              <p className="text-sm text-muted-foreground">
                {Math.max(parseFloat(calculateEngagementRate(post1)), parseFloat(calculateEngagementRate(post2)))}%
              </p>
            </div>
            <div className="text-center">
              <h3 className="font-semibold text-chart-secondary">Highest Reach</h3>
              <p className="text-2xl font-bold mt-2">
                Post {post1.insights.reach > post2.insights.reach ? "1" : "2"}
              </p>
              <p className="text-sm text-muted-foreground">
                {Math.max(post1.insights.reach, post2.insights.reach).toLocaleString()}
              </p>
            </div>
            <div className="text-center">
              <h3 className="font-semibold text-chart-accent">Most Saves</h3>
              <p className="text-2xl font-bold mt-2">
                Post {post1.insights.saved > post2.insights.saved ? "1" : "2"}
              </p>
              <p className="text-sm text-muted-foreground">
                {Math.max(post1.insights.saved, post2.insights.saved).toLocaleString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PostOverviewCard({ 
  post, 
  title, 
  postId, 
  engagementRate 
}: { 
  post: any; 
  title: string; 
  postId: string; 
  engagementRate: string;
}) {
  return (
    <Card className="shadow-card hover:shadow-soft transition-all duration-300">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-primary text-primary-foreground">
            <ImageIcon className="w-5 h-5" />
          </div>
          {title}
        </CardTitle>
        <p className="text-sm text-muted-foreground">ID: {postId}</p>
      </CardHeader>
      <CardContent>
        {post.media_url && (
          <div className="aspect-square overflow-hidden rounded-lg mb-4">
            <img
              src={post.media_url}
              alt="Post"
              className="w-full h-full object-cover"
            />
          </div>
        )}
        
        <div className="grid grid-cols-2 gap-4">
          <MetricItem
            icon={<Heart className="w-4 h-4" />}
            label="Likes"
            value={post.like_count.toLocaleString()}
          />
          <MetricItem
            icon={<MessageCircle className="w-4 h-4" />}
            label="Comments"
            value={post.comments_count.toLocaleString()}
          />
          <MetricItem
            icon={<Eye className="w-4 h-4" />}
            label="Reach"
            value={post.insights.reach.toLocaleString()}
          />
          <MetricItem
            icon={<Bookmark className="w-4 h-4" />}
            label="Saves"
            value={post.insights.saved.toLocaleString()}
          />
        </div>

        <div className="mt-4 pt-4 border-t">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Engagement Rate</span>
            <Badge variant="outline" className="font-mono">
              {engagementRate}%
            </Badge>
          </div>
          <div className="flex justify-between items-center mt-2">
            <span className="text-sm text-muted-foreground">Impressions</span>
            <span className="font-medium">{post.insights.impressions.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center mt-2">
            <span className="text-sm text-muted-foreground">Posted</span>
            <span className="text-sm">{new Date(post.timestamp).toLocaleDateString()}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MetricItem({ 
  icon, 
  label, 
  value 
}: { 
  icon: React.ReactNode; 
  label: string; 
  value: string; 
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="text-muted-foreground">{icon}</div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
    </div>
  );
}