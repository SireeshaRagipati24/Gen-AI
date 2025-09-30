// PostScheduler.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Send, Trash2, ShieldCheck, ShieldAlert } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUsageTracking } from '@/hooks/useUsageTracking';

// shadcn dialog
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

type PostSchedulerProps = {
  initialContent?: {
    caption: string;
    image: string;
    filename: string;
  };
};

type ScheduledPost = {
  id: number;                 // backend returns integer id
  caption: string;
  image_filename: string | null;
  platform: string;
  scheduled_time: string;
  status: 'scheduled' | 'completed' | 'failed' | 'otp_required';
  error_message?: string | null;
};

const API = 'http://localhost:5000';

const PostScheduler: React.FC<PostSchedulerProps> = ({ initialContent }) => {
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([]);
  const [loading, setLoading] = useState(false);

  const [newPost, setNewPost] = useState({
    caption: '',
    image: '',
    filename: '',
    platform: 'instagram',
    scheduledTime: '',
  });

  // OTP modal state
  const [otpOpen, setOtpOpen] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [otpPostId, setOtpPostId] = useState<number | null>(null);
  const [otpSubmitting, setOtpSubmitting] = useState(false);

  const { usage } = useUsageTracking();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Hydrate initial values (state -> localStorage fallback)
  useEffect(() => {
    let caption = '', image = '', filename = '';

    if (initialContent) {
      caption = initialContent.caption || '';
      image = initialContent.image || '';
      filename = initialContent.filename || '';
    } else if (location.state) {
      const state = location.state as any;
      caption = state?.caption || '';
      image = state?.image || '';
      filename = state?.filename || '';

      // Clear localStorage if we have state
      localStorage.removeItem('scheduled_caption');
      localStorage.removeItem('scheduled_image');
      localStorage.removeItem('scheduled_filename');
    } else {
      // Fallback to localStorage
      caption = localStorage.getItem('scheduled_caption') || '';
      image = localStorage.getItem('scheduled_image') || '';
      filename = localStorage.getItem('scheduled_filename') || '';
    }

    setNewPost({
      caption,
      image,
      filename,
      platform: 'instagram',
      scheduledTime: '',
    });

    fetchScheduledPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state, initialContent]);

  // Persist form fields to localStorage for safety
  useEffect(() => {
    localStorage.setItem('scheduled_caption', newPost.caption || '');
    localStorage.setItem('scheduled_image', newPost.image || '');
    localStorage.setItem('scheduled_filename', newPost.filename || '');
  }, [newPost.caption, newPost.image, newPost.filename]);

  // Polling to auto-refresh statuses (e.g., from otp_required -> scheduled -> completed)
  useEffect(() => {
    const id = setInterval(fetchScheduledPostsSilently, 15000); // 15s
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchScheduledPosts = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/scheduled-posts`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        // Filter out completed posts - only show active posts
        const activePosts = data.posts.filter(
          (post: ScheduledPost) => post.status !== 'completed'
        );
        setScheduledPosts(activePosts);
      }
      else throw new Error(data.error || 'Failed to load');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load scheduled posts',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchScheduledPostsSilently = async () => {
    try {
      const res = await fetch(`${API}/api/scheduled-posts`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        // Filter out completed posts - only show active posts
        const activePosts = data.posts.filter(
          (post: ScheduledPost) => post.status !== 'completed'
        );
        setScheduledPosts(activePosts);
      }
    } catch {
      // silent
    }
  };

  const handleSchedulePost = async () => {
    if (!newPost.caption || !newPost.scheduledTime) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await fetch(`${API}/api/schedule-post`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caption: newPost.caption,
          filename: newPost.filename,
          scheduled_time: newPost.scheduledTime, // datetime-local value
          platform: newPost.platform,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast({
          title: 'Post Scheduled!',
          description: 'Your post has been scheduled successfully.',
        });

        // Clear form after successful scheduling
        setNewPost({
          caption: '',
          image: '',
          filename: '',
          platform: 'instagram',
          scheduledTime: '',
        });

        // Clear localStorage
        localStorage.removeItem('scheduled_caption');
        localStorage.removeItem('scheduled_image');
        localStorage.removeItem('scheduled_filename');

        fetchScheduledPosts();
      } else {
        toast({
          title: 'Failed to Schedule',
          description: data.error || 'Something went wrong',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to reach the backend.',
        variant: 'destructive',
      });
    }
  };

  const deleteScheduledPost = async (postId: number) => {
    try {
      const response = await fetch(`${API}/api/scheduled-post/${postId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      const data = await response.json();
      if (response.ok && data.success) {
        toast({
          title: 'Post Deleted',
          description: 'Scheduled post has been removed',
        });
        fetchScheduledPosts();
      } else {
        throw new Error(data.error || 'Delete failed');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete post',
        variant: 'destructive',
      });
    }
  };

  // OTP flow: open modal for post with status 'otp_required'
  const openOtpForPost = (postId: number) => {
    setOtpPostId(postId);
    setOtpInput('');
    setOtpOpen(true);
  };

  const submitOtp = async () => {
    if (!otpInput.trim() || !otpPostId) {
      toast({
        title: 'Enter OTP',
        description: 'Please type the OTP sent to your email.',
        variant: 'destructive',
      });
      return;
    }
    try {
      setOtpSubmitting(true);
      const res = await fetch(`${API}/api/verify-scheduled-otp`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp: otpInput.trim(), post_id: otpPostId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast({
          title: 'OTP Verified',
          description: 'Post will be published shortly.',
        });
        setOtpOpen(false);
        setOtpPostId(null);
        setOtpInput('');
        // Refresh list to reflect status 'scheduled' and near-now time
        fetchScheduledPosts();
      } else {
        toast({
          title: 'OTP Failed',
          description: data.error || 'Invalid OTP. Please try again.',
          variant: 'destructive',
        });
      }
    } catch (e) {
      toast({
        title: 'Error',
        description: 'Could not verify OTP.',
        variant: 'destructive',
      });
    } finally {
      setOtpSubmitting(false);
    }
  };

  const formatDateTime = (dateTime: string) => {
    const date = new Date(dateTime);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
  };

  const statusBadge = (status: ScheduledPost['status']) => {
    switch (status) {
      case 'scheduled':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'otp_required':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const hasOtpRequired = useMemo(
    () => scheduledPosts.some((p) => p.status === 'otp_required'),
    [scheduledPosts]
  );

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

      {hasOtpRequired && (
        <Card className="border border-blue-300 bg-blue-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-blue-900">
              <ShieldAlert className="w-5 h-5" />
              Action needed: OTP verification pending
            </CardTitle>
            <CardDescription className="text-blue-700">
              One or more scheduled posts need OTP. Click “Enter OTP” on the post to verify.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

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
                    <SelectItem value="linkedin" disabled>LinkedIn (soon)</SelectItem>
                    <SelectItem value="twitter" disabled>X/Twitter (soon)</SelectItem>
                    <SelectItem value="facebook" disabled>Facebook (soon)</SelectItem>
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
                onClick={() => navigate('/dashboard')}
                variant="outline"
                className="w-full"
              >
                Back to Generator
              </Button>
              <Button
                onClick={handleSchedulePost}
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={!newPost.caption || !newPost.scheduledTime}
              >
                <Send className="w-4 h-4 mr-2" />
                Schedule Post
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Calendar View placeholder */}
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
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Scheduled Posts</CardTitle>
            <CardDescription>Your upcoming scheduled content</CardDescription>
          </div>
          <Button variant="outline" onClick={fetchScheduledPosts} disabled={loading}>
            Refresh
          </Button>
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
                const statusColor = statusBadge(post.status);

                return (
                  <div key={post.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 pr-4">
                        <p className="text-gray-700 mb-2 whitespace-pre-wrap">{post.caption}</p>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>{date}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>{time}</span>
                          </div>
                          <div>
                            <Badge variant="outline" className="text-gray-700 capitalize">
                              {post.platform}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={`${statusColor} capitalize`}>{post.status.replace('_', ' ')}</Badge>
                      </div>
                    </div>

                    {post.image_filename && (
                      <div className="mb-3">
                        <img
                          src={`${API}/api/get-image?filename=${encodeURIComponent(post.image_filename)}`}
                          alt="Scheduled post"
                          className="w-full rounded border max-h-[150px] object-contain"
                        />
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteScheduledPost(post.id)}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Delete
                      </Button>

                      {post.status === 'otp_required' && (
                        <Button
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700"
                          onClick={() => openOtpForPost(post.id)}
                        >
                          <ShieldCheck className="w-4 h-4 mr-1" />
                          Enter OTP
                        </Button>
                      )}

                      {post.error_message && (
                        <p className="text-sm text-red-600">
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

      {/* OTP Dialog */}
      <Dialog open={otpOpen} onOpenChange={setOtpOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verify OTP</DialogTitle>
            <DialogDescription>
              Enter the 6-digit OTP sent to your email to authorize this scheduled post.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <Label htmlFor="otp">One-Time Password</Label>
            <Input
              id="otp"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="Enter OTP"
              value={otpInput}
              onChange={(e) => setOtpInput(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              We’ll reuse this verified session only for this scheduled post.
            </p>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOtpOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitOtp} disabled={otpSubmitting || !otpInput.trim()}>
              {otpSubmitting ? 'Verifying…' : 'Submit OTP'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PostScheduler;