import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart3, TrendingUp, Users, Heart, MessageCircle, Share2, ArrowUp, ArrowDown, RefreshCw, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Button } from '@/components/ui/button';

interface Metric {
  title: string;
  value: string;
  change: string;
  changeType: 'positive' | 'negative';
  icon: React.ElementType;
}

interface Post {
  id: string;
  content: string;
  platform: string;
  engagement: string;
  reach: string;
  likes: number;
  comments: number;
  shares: number;
  activity_id: number;
}

interface Platform {
  name: string;
  posts: number;
  avgEngagement: number;
  totalReach: string;
  color: string;
}

interface Interaction {
  id: number;
  type: 'like' | 'comment' | 'share';
  postId: string;
  content?: string;
  timestamp: string;
  username?: string;
  imageFilename?: string;
  postUrl?: string;
}

const AnalyticsDashboard = () => {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [topPosts, setTopPosts] = useState<Post[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [performanceData, setPerformanceData] = useState<any[]>([]);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [selectedMetric, setSelectedMetric] = useState('reach');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState<string | null>(null);
  const [showInteractions, setShowInteractions] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [interactionsLoading, setInteractionsLoading] = useState(false);
  const [isRefreshingInteractions, setIsRefreshingInteractions] = useState(false);

  const fetchAnalyticsData = async () => {
    try {
      const response = await fetch('/api/analytics');
      if (!response.ok) throw new Error('Failed to fetch analytics');
      
      const data = await response.json();
      setMetrics(data.metrics || []);
      
      // Map topPosts to ensure id is string version of activity_id
      setTopPosts(data.topPosts ? data.topPosts.map((post: any) => ({
        ...post,
        id: String(post.activity_id)
      })) : []);
      
      setPlatforms(data.platforms || []);
      setPerformanceData(data.performanceData || []);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const fetchInteractions = async () => {
    try {
      setInteractionsLoading(true);
      const response = await fetch('/api/interactions');
      if (!response.ok) throw new Error('Failed to fetch interactions');
      
      const data = await response.json();
      setInteractions(data.interactions ? data.interactions.map((inter: any) => {
        const { post_id, image_filename, post_url, ...rest } = inter;
        return {
          ...rest,
          postId: String(post_id), // Convert to string to match post IDs
          imageFilename: image_filename,
          postUrl: post_url
        };
      }) : []);
    } catch (error) {
      console.error('Error fetching interactions:', error);
    } finally {
      setInteractionsLoading(false);
    }
  };

  const refreshInteractions = async () => {
    try {
      setIsRefreshingInteractions(true);
      const response = await fetch('/api/refresh-interactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        await fetchInteractions();
      }
    } catch (error) {
      console.error('Error refreshing interactions:', error);
    } finally {
      setIsRefreshingInteractions(false);
    }
  };

  const refreshPostMetrics = async (activityId: number, postId: string) => {
    setRefreshing(postId);
    try {
      const response = await fetch('/api/refresh-metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ activity_id: activityId }),
      });
      
      if (response.ok) {
        const result = await response.json();
        const metrics = result.metrics;
        
        // Update specific post in UI
        setTopPosts(prev => prev.map(post => 
          post.id === postId ? { 
            ...post, 
            likes: metrics.likes,
            comments: metrics.comments,
            shares: metrics.saves, // Using saves as shares
            reach: metrics.reach >= 1000 ? `${(metrics.reach/1000).toFixed(1)}K` : `${metrics.reach}`,
            engagement: metrics.engagement >= 1000 ? `${(metrics.engagement/1000).toFixed(1)}K` : `${metrics.engagement}`
          } : post
        ));
      }
    } catch (error) {
      console.error('Error refreshing metrics:', error);
    } finally {
      setRefreshing(null);
    }
  };

  const viewPostInteractions = (postId: string) => {
    setSelectedPostId(postId);
    setShowInteractions(true);
  };

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      await fetchAnalyticsData();
      await fetchInteractions();
      setIsLoading(false);
    };
    
    fetchData();
    
    // Refresh data every 5 minutes
    const interval = setInterval(() => {
      fetchAnalyticsData();
      fetchInteractions();
    }, 300000);
    
    return () => clearInterval(interval);
  }, []);

  const renderMetricChange = (changeType: 'positive' | 'negative', change: string) => {
    const isPositive = changeType === 'positive';
    return (
      <div className="flex items-center space-x-1 mt-1">
        {isPositive ? 
          <ArrowUp className="w-3 h-3 text-green-600" /> : 
          <ArrowDown className="w-3 h-3 text-red-600" />
        }
        <span className={`text-xs font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
          {change} from last month
        </span>
      </div>
    );
  };

  const getPostInteractions = (postId: string) => {
    return interactions.filter(i => i.postId === postId);
  };

  const getInteractionIcon = (type: string) => {
    switch (type) {
      case 'like': return <Heart className="w-4 h-4 text-pink-500" />;
      case 'comment': return <MessageCircle className="w-4 h-4 text-blue-500" />;
      case 'share': return <Share2 className="w-4 h-4 text-green-500" />;
      default: return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Analytics Dashboard</h2>
          <p className="text-gray-600">Track your social media performance and insights</p>
          <div className="flex items-center space-x-2 mt-2">
            <span className="bg-green-100 text-green-800 text-xs px-2.5 py-0.5 rounded-full">Live data</span>
            <span className="text-gray-500 text-sm">Updated just now</span>
          </div>
        </div>
        <Button 
          onClick={refreshInteractions} 
          disabled={isRefreshingInteractions}
          className="flex items-center"
        >
          {isRefreshingInteractions ? (
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-2" />
          )}
          Refresh Interactions
        </Button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {metrics.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <Card key={index} className="hover:shadow-md transition-shadow duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {metric.title}
                </CardTitle>
                <div className="p-2 rounded-full bg-gray-100">
                  <Icon className="w-5 h-5 text-green-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{metric.value}</div>
                {renderMetricChange(metric.changeType, metric.change)}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Performance Chart */}
        <Card className="h-full">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between">
              <div>
                <CardTitle>Performance Overview</CardTitle>
                <CardDescription>Your content performance over the last 7 days</CardDescription>
              </div>
              <div className="mt-2 sm:mt-0">
                <div className="flex space-x-2">
                  <button 
                    className={`px-3 py-1 text-xs rounded-full ${selectedMetric === 'reach' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}
                    onClick={() => setSelectedMetric('reach')}
                  >
                    Reach
                  </button>
                  <button 
                    className={`px-3 py-1 text-xs rounded-full ${selectedMetric === 'engagement' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}
                    onClick={() => setSelectedMetric('engagement')}
                  >
                    Engagement
                  </button>
                  <button 
                    className={`px-3 py-1 text-xs rounded-full ${selectedMetric === 'posts' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}
                    onClick={() => setSelectedMetric('posts')}
                  >
                    Posts
                  </button>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={performanceData}
                  margin={{
                    top: 5,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value) => [value, selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)]}
                    labelFormatter={(name) => `Day: ${name}`}
                    contentStyle={{ 
                      borderRadius: '0.5rem',
                      border: '1px solid #e5e7eb',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                    }}
                  />
                  <Legend />
                  <Bar 
                    dataKey={selectedMetric} 
                    fill="#10B981" 
                    radius={[4, 4, 0, 0]}
                    name={selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Performing Posts */}
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Posts</CardTitle>
            <CardDescription>Your best content from this week</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topPosts.map((post, index) => {
                const postInteractions = getPostInteractions(post.id);
                return (
                  <div 
                    key={post.id} 
                    className="border border-gray-200 rounded-lg p-4 space-y-3 hover:bg-gray-50 transition-colors duration-200"
                  >
                    <div className="flex items-start justify-between">
                      <p className="text-sm text-gray-700 flex-1 pr-2">
                        {post.content}
                      </p>
                      <Badge variant="outline" className="text-xs">
                        {post.platform}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <div className="flex space-x-4 text-xs text-gray-500">
                        <div className="flex items-center space-x-1">
                          <Users className="w-3 h-3" />
                          <span>{post.reach}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Heart className="w-3 h-3" />
                          <span>{post.engagement}</span>
                        </div>
                      </div>
                      <div className="flex space-x-3">
                        <div className="flex items-center space-x-1 text-xs text-gray-500">
                          <Heart className="w-3 h-3 text-pink-500" />
                          <span>{post.likes}</span>
                        </div>
                        <div className="flex items-center space-x-1 text-xs text-gray-500">
                          <MessageCircle className="w-3 h-3 text-blue-500" />
                          <span>{post.comments}</span>
                        </div>
                        <div className="flex items-center space-x-1 text-xs text-gray-500">
                          <Share2 className="w-3 h-3 text-green-500" />
                          <span>{post.shares}</span>
                        </div>
                        <button 
                          onClick={() => refreshPostMetrics(post.activity_id, post.id)}
                          disabled={refreshing === post.id}
                          className="text-xs text-green-600 hover:text-green-800 disabled:opacity-50"
                        >
                          {refreshing === post.id ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                          ) : (
                            <RefreshCw className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </div>
                    {postInteractions.length > 0 && (
                      <div className="pt-2 border-t border-gray-100">
                        <button 
                          onClick={() => viewPostInteractions(post.id)}
                          className="text-xs text-blue-600 hover:text-blue-800 flex items-center"
                        >
                          View interactions ({postInteractions.length})
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Platform Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Platform Performance</CardTitle>
          <CardDescription>How your content performs across different platforms</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {platforms.map((platform, index) => (
              <div 
                key={platform.name} 
                className={`rounded-lg p-5 ${platform.color} transition-all duration-300 hover:shadow-lg`}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-lg">{platform.name}</h3>
                  <div className="bg-white/30 backdrop-blur-sm rounded-full p-1">
                    <div className="bg-white rounded-full p-1">
                      {platform.name === 'Instagram' ? (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5 text-pink-500">
                          <path fill="currentColor" d="M12 2c2.717 0 3.056.01 4.122.06 1.065.05 1.79.217 2.428.465.66.254 1.216.598 1.772 1.153a4.908 4.908 0 0 1 1.153 1.772c.247.637.415 1.363.465 2.428.047 1.066.06 1.405.06 4.122 0 2.717-.01 3.056-.06 4.122-.05 1.065-.218 1.79-.465 2.428a4.883 4.883 0 0 1-1.153 1.772 4.915 4.915 0 0 1-1.772 1.153c-.637.247-1.363.415-2.428.465-1.066.047-1.405.06-4.122.06-2.717 0-3.056-.01-4.122-.06-1.065-.05-1.79-.218-2.428-.465a4.89 4.89 0 0 1-1.772-1.153 4.904 4.904 0 0 1-1.153-1.772c-.248-.637-.415-1.363-.465-2.428C2.013 15.056 2 14.717 2 12c0-2.717.01-3.056.06-4.122.05-1.066.217-1.79.465-2.428a4.88 4.88 0 0 1 1.153-1.772A4.897 4.897 0 0 1 5.45 2.525c.638-.248 1.362-.415 2.428-.465C8.944 2.013 9.283 2 12 2zm0 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm6.5-.25a1.25 1.25 0 0 0-2.5 0 1.25 1.25 0 0 0 2.5 0zM12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6z"/>
                        </svg>
                      ) : platform.name === 'LinkedIn' ? (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5 text-blue-700">
                          <path fill="currentColor" d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5 text-cyan-500">
                          <path fill="currentColor" d="M23.953 4.57a10 10 0 0 1-2.825.775 4.958 4.958 0 0 0 2.163-2.723 10.054 10.054 0 0 1-3.127 1.195 4.92 4.92 0 0 0-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 0 0-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 0 1-2.228-.616v.06a4.923 4.923 0 0 0 3.946 4.827 4.996 4.996 0 0 1-2.212.085 4.936 4.936 0 0 0 4.604 3.417 9.867 9.867 0 0 1-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 0 0 7.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0 0 24 4.59z"/>
                        </svg>
                      )}
                    </div>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="font-medium">Posts:</span>
                    <span className="font-bold">{platform.posts}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Avg. Engagement:</span>
                    <span className="font-bold">{platform.avgEngagement}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Total Reach:</span>
                    <span className="font-bold">{platform.totalReach}</span>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-white/30">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium">Performance:</span>
                    <Badge variant="outline" className="bg-white">
                      {platform.avgEngagement > 7.5 ? 'Excellent' : platform.avgEngagement > 6 ? 'Good' : 'Average'}
                    </Badge>
                  </div>
                  <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        platform.avgEngagement > 7.5 ? 'bg-green-500' : 
                        platform.avgEngagement > 6 ? 'bg-yellow-500' : 'bg-red-500'
                      }`} 
                      style={{ width: `${(platform.avgEngagement / 10) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Interactions Section */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Interactions</CardTitle>
          <CardDescription>Likes, comments, and shares on your posts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {interactionsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-green-600" />
              </div>
            ) : interactions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No interactions found. Try refreshing.
              </div>
            ) : (
              interactions.map((interaction) => (
                <div 
                  key={interaction.id} 
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start">
                    <div className="mr-3">
                      {getInteractionIcon(interaction.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <div>
                          <span className="font-medium capitalize">{interaction.type}</span>
                          {interaction.username && (
                            <span className="ml-2 text-sm text-gray-600">by {interaction.username}</span>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(interaction.timestamp).toLocaleString()}
                        </span>
                      </div>
                      
                      {interaction.content && (
                        <p className="mt-2 text-gray-700">
                          {interaction.content}
                        </p>
                      )}
                      
                      {interaction.imageFilename && (
                        <div className="mt-3 flex items-center space-x-3">
                          <img 
                            src={`/api/get-image?filename=${interaction.imageFilename}`} 
                            alt="Post" 
                            className="w-12 h-12 object-cover rounded"
                          />
                          <a 
                            href={interaction.postUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline text-sm"
                          >
                            View on {interaction.postUrl?.includes('instagram') ? 'Instagram' : 'Social Platform'}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Interactions Modal */}
      {showInteractions && selectedPostId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold">Post Interactions</h3>
                <button 
                  onClick={() => setShowInteractions(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  &times;
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-4">
                {getPostInteractions(selectedPostId).map((interaction) => (
                  <div key={interaction.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <div className="mr-3 mt-1">
                        {getInteractionIcon(interaction.type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between">
                          <span className="font-medium capitalize">
                            {interaction.type}
                            {interaction.username && ` by ${interaction.username}`}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(interaction.timestamp).toLocaleString()}
                          </span>
                        </div>
                        
                        {interaction.content && (
                          <p className="mt-2 text-gray-700">
                            {interaction.content}
                          </p>
                        )}
                        
                        <div className="mt-3 flex items-center">
                          {interaction.imageFilename && (
                            <img 
                              src={`/api/get-image?filename=${interaction.imageFilename}`} 
                              alt="Post preview" 
                              className="w-12 h-12 object-cover rounded mr-3"
                            />
                          )}
                          {interaction.postUrl && (
                            <a 
                              href={interaction.postUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline text-sm"
                            >
                              View Post
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {getPostInteractions(selectedPostId).length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No interactions recorded for this post yet
                  </div>
                )}
              </div>
            </div>
            <div className="p-6 border-t">
              <Button 
                onClick={() => setShowInteractions(false)}
                className="w-full"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsDashboard;