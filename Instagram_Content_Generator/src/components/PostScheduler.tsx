import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Send, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUsageTracking } from '@/hooks/useUsageTracking';

const PostScheduler = () => {
  const [scheduledPosts, setScheduledPosts] = useState([]);
  const [newPost, setNewPost] = useState({
    caption: '',
    image: '',
    filename: '',
    platform: 'instagram',
    scheduledTime: '',
  });
  
  const { usage } = useUsageTracking();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Try to get data from location.state or localStorage
    let caption = '', image = '', filename = '';
    if (location.state) {
      caption = location.state.caption || '';
      image = location.state.image || '';
      filename = location.state.filename || '';
      // Clear localStorage if present
      localStorage.removeItem('scheduled_caption');
      localStorage.removeItem('scheduled_image');
      localStorage.removeItem('scheduled_filename');
    } else {
      caption = localStorage.getItem('scheduled_caption') || '';
      image = localStorage.getItem('scheduled_image') || '';
      filename = localStorage.getItem('scheduled_filename') || '';
    }
    setNewPost((prev) => ({
      ...prev,
      caption: caption || prev.caption || '',
      image: image || prev.image || '',
      filename: filename || prev.filename || '',
    }));
    fetchScheduledPosts();
  }, [location.state]);

  const fetchScheduledPosts = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/scheduled-posts', {
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        setScheduledPosts(data.posts);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load scheduled posts',
        variant: 'destructive',
      });
    }
  };

  const handleSchedulePost = async () => {
    if (!newPost.caption || !newPost.scheduledTime) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch("http://localhost:5000/api/schedule-post", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          caption: newPost.caption,
          filename: newPost.filename,
          scheduled_time: newPost.scheduledTime,
          platform: newPost.platform,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Post Scheduled!",
          description: "Your post has been scheduled successfully.",
        });
        fetchScheduledPosts();
      } else {
        toast({
          title: "Failed to Schedule",
          description: data.error || "Something went wrong",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reach the backend.",
        variant: "destructive",
      });
    }
  };

  const deleteScheduledPost = async (postId) => {
    try {
      const response = await fetch(`http://localhost:5000/api/scheduled-post/${postId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (response.ok) {
        toast({
          title: "Post Deleted",
          description: "Scheduled post has been removed",
        });
        fetchScheduledPosts();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete post",
        variant: "destructive",
      });
    }
  };

  const formatDateTime = (dateTime) => {
    const date = new Date(dateTime);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Post Scheduler</h2>
        <p className="text-gray-600">Schedule your content for automatic posting</p>
      </div>

      <Card className="border-blue-200 bg-blue-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-blue-800">
            Credits Remaining: {usage.available}/{usage.total}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-xs text-blue-600">
            Schedule posts for automatic publishing
          </p>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Schedule New Post */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="w-5 h-5 mr-2 text-blue-600" />
              Schedule New Post
            </CardTitle>
            <CardDescription>Schedule content for automatic posting</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="post-content">Caption</Label>
              <Textarea
                id="post-content"
                placeholder="Enter your caption"
                value={newPost.caption}
                onChange={(e) => setNewPost({ ...newPost, caption: e.target.value })}
                className="min-h-[120px]"
              />
            </div>

            {newPost.image && (
              <div className="space-y-2">
                <Label>Image Preview</Label>
                <img
                  src={newPost.image}
                  alt="Scheduled post"
                  className="w-full rounded border max-h-[300px] object-contain"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Filename</Label>
              <Input value={newPost.filename} readOnly />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="platform">Platform</Label>
                <Select
                  value={newPost.platform}
                  onValueChange={(value) => setNewPost({ ...newPost, platform: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select platform" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="linkedin">LinkedIn</SelectItem>
                    <SelectItem value="twitter">Twitter</SelectItem>
                    <SelectItem value="facebook">Facebook</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="schedule-time">Schedule Time</Label>
                <Input
                  id="schedule-time"
                  type="datetime-local"
                  value={newPost.scheduledTime}
                  onChange={(e) => setNewPost({ ...newPost, scheduledTime: e.target.value })}
                  min={new Date().toISOString().slice(0, 16)}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => navigate('/')}
                variant="outline"
                className="w-full"
              >
                Back to Generator
              </Button>
              <Button
                onClick={handleSchedulePost}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                <Send className="w-4 h-4 mr-2" />
                Schedule Post
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Calendar View */}
        <Card>
          <CardHeader>
            <CardTitle>Publishing Calendar</CardTitle>
            <CardDescription>View your content schedule</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg flex items-center justify-center">
              <div className="text-center space-y-2">
                <Calendar className="w-12 h-12 text-blue-600 mx-auto" />
                <p className="text-blue-600 font-medium">Calendar view coming soon</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Scheduled Posts List */}
      <Card>
        <CardHeader>
          <CardTitle>Scheduled Posts</CardTitle>
          <CardDescription>Your upcoming scheduled content</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {scheduledPosts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p>No scheduled posts yet</p>
                <p className="text-sm mt-2">Schedule your first post above</p>
              </div>
            ) : (
              scheduledPosts.map((post) => {
                const { date, time } = formatDateTime(post.scheduled_time);
                const statusColor = post.status === 'scheduled' 
                  ? 'bg-yellow-100 text-yellow-800' 
                  : post.status === 'completed' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800';
                
                return (
                  <div key={post.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 pr-4">
                        <p className="text-gray-700 mb-2">{post.caption}</p>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-4 h-4" />
                            <span>{date}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Clock className="w-4 h-4" />
                            <span>{time}</span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <Badge className={`${statusColor} capitalize`}>
                          {post.status}
                        </Badge>
                      </div>
                    </div>
                    
                    {post.image_filename && (
                      <div className="mb-3">
                        <img
                          src={`http://localhost:5000/api/get-image?filename=${post.image_filename}`}
                          alt="Scheduled post"
                          className="w-full rounded border max-h-[150px] object-contain"
                        />
                      </div>
                    )}
                    
                    <div className="flex items-center space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => deleteScheduledPost(post.id)}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Delete
                      </Button>
                      {post.error_message && (
                        <p className="text-sm text-red-500">
                          Error: {post.error_message}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PostScheduler; 
