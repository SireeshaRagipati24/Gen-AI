import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Sparkles, Download, RefreshCw, ChevronLeft, ChevronRight, Send, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUsageTracking } from '@/hooks/useUsageTracking';
import PremiumUpgradeModal from './PremiumUpgradeModal';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

interface ContentGeneratorProps {
  onScheduleClick: (data: { caption: string; image: string; filename: string }) => void;
}

const ContentGenerator = ({ onScheduleClick }: ContentGeneratorProps) => {
  const [prompt, setPrompt] = useState('');
  const [contentType, setContentType] = useState('post');
  const [tone, setTone] = useState('professional');
  const [generatedContent, setGeneratedContent] = useState('');
  const [generatedImage, setGeneratedImage] = useState('');
  const [filename, setFilename] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpMessage, setOtpMessage] = useState('');
  const [instaResponse, setInstaResponse] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isPosting, setIsPosting] = useState(false);
  const { usage, refreshUsage } = useUsageTracking();
  const { toast } = useToast();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/check-auth', {
          credentials: 'include',
        });
        const data = await res.json();
        setIsAuthenticated(data.authenticated);
        if (data.authenticated) {
          refreshUsage();
          fetchHistory();
        }
      } catch (error) {
        setIsAuthenticated(false);
      }
    };
    
    checkAuth();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/activities', {
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        setHistory(data.activities);
        if (data.activities.length > 0) {
          setHistoryIndex(0);
          loadHistoryItem(data.activities[0]);
        }
      }
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to load history', variant: 'destructive' });
    }
  };

  const loadHistoryItem = async (item) => {
    setGeneratedContent(item.generated_caption);
    setFilename(item.image_filename);
    await fetchImage(item.image_filename);
  };

  const fetchImage = async (filename) => {
    try {
      const res = await fetch(`http://localhost:5000/api/get-image?filename=${filename}`, {
        credentials: 'include',
      });
      
      if (res.ok) {
        const blob = await res.blob();
        const reader = new FileReader();
        reader.onloadend = () => {
          setGeneratedImage(reader.result as string);
        };
        reader.readAsDataURL(blob);
      } else {
        setGeneratedImage('');
      }
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to load image', variant: 'destructive' });
      setGeneratedImage('');
    }
  };

  const handleGenerate = async (isRegeneration = false) => {
    if (!isAuthenticated) {
      toast({ title: 'Login Required', description: 'Please login first.', variant: 'destructive' });
      return;
    }

    if (!prompt.trim()) {
      toast({ title: 'Error', description: 'Please enter a prompt.', variant: 'destructive' });
      return;
    }

    if (!isRegeneration && !usage.isPremium && usage.available < 5) {
      setShowUpgradeModal(true);
      return;
    }

    setIsGenerating(true);
    setGeneratedContent('');
    setGeneratedImage('');
    setFilename('');

    try {
      const res = await fetch('http://localhost:5000/api/generate', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt, 
          tone, 
          content_type: contentType, 
          is_regeneration: isRegeneration 
        })
      });
      
      const data = await res.json();

      if (data.success && data.caption && data.image) {
        setGeneratedContent(data.caption);
        setGeneratedImage(`data:image/png;base64,${data.image}`);
        setFilename(data.filename);
        
        // Add to history
        const newItem = {
          id: data.activity.id,
          prompt: prompt,
          generated_caption: data.caption,
          image_filename: data.filename,
          created_at: data.activity.created_at
        };
        
        setHistory([newItem, ...history]);
        setHistoryIndex(0);
        
        refreshUsage();
        toast({ title: 'Success', description: 'Content generated!' });
      } else {
        toast({ 
          title: 'Error', 
          description: data.error || 'Generation failed', 
          variant: 'destructive' 
        });
      }
    } catch (err) {
      toast({ 
        title: 'Error', 
        description: 'Failed to connect to backend', 
        variant: 'destructive' 
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const navigateHistory = (direction) => {
    if (history.length === 0) return;
    
    let newIndex;
    if (direction === 'prev') {
      newIndex = historyIndex < history.length - 1 ? historyIndex + 1 : historyIndex;
    } else {
      newIndex = historyIndex > 0 ? historyIndex - 1 : 0;
    }
    
    if (newIndex !== historyIndex) {
      setHistoryIndex(newIndex);
      loadHistoryItem(history[newIndex]);
    }
  };

  const downloadImage = () => {
    if (!generatedImage) return;
    
    const link = document.createElement('a');
    link.href = generatedImage;
    link.download = `${prompt?.split(" ").slice(0, 5).join("_") || "image"}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Record download in backend
    fetch('http://localhost:5000/api/record-download', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename })
    }).catch(error => {
      console.error('Failed to record download:', error);
    });
  };

  const updateCaption = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/update_caption', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          filename, 
          caption: generatedContent 
        })
      });
      
      const data = await res.json();
      if (data.success) {
        toast({ title: 'Caption Updated' });
        
        // Update history
        const updatedHistory = [...history];
        if (updatedHistory[historyIndex]) {
          updatedHistory[historyIndex].generated_caption = generatedContent;
          setHistory(updatedHistory);
        }
      } else {
        toast({ 
          title: 'Error', 
          description: 'Update failed', 
          variant: 'destructive' 
        });
      }
    } catch (e) {
      toast({ 
        title: 'Error', 
        description: 'Caption update error', 
        variant: 'destructive' 
      });
    }
  };

  const handlePost = async () => {
    if (!filename || !generatedContent) {
      toast({ 
        title: 'Error', 
        description: 'No content to post', 
        variant: 'destructive' 
      });
      return;
    }

    setIsPosting(true);
    try {
      const res = await fetch('http://localhost:5000/api/post', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          filename, 
          caption: generatedContent 
        })
      });
      
      const data = await res.json();

      if (data.success) {
        toast({ 
          title: 'Posted!', 
          description: 'Your content has been posted to Instagram.' 
        });
        
        if (data.url) {
          setInstaResponse(data.url);
        }
      } else if (data.require_otp) {
        setOtpMessage(data.message);
        setShowOtpModal(true);
      } else {
        toast({ 
          title: 'Error', 
          description: data.error || 'Posting failed', 
          variant: 'destructive' 
        });
      }
    } catch (e) {
      toast({ 
        title: 'Error', 
        description: 'Failed to post', 
        variant: 'destructive' 
      });
    } finally {
      setIsPosting(false);
    }
  };

  const handleOtpSubmit = async () => {
    if (!otp) {
      toast({ 
        title: 'Error', 
        description: 'Please enter OTP', 
        variant: 'destructive' 
      });
      return;
    }

    setIsPosting(true);
    try {
      const res = await fetch('http://localhost:5000/api/verify-post-otp', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp })
      });
      
      const data = await res.json();
      if (data.success) {
        toast({ 
          title: 'Posted!', 
          description: 'Your content has been posted to Instagram.' 
        });
        setShowOtpModal(false);
        setOtp('');
        if (data.url) {
          setInstaResponse(data.url);
        }
      } else {
        toast({ 
          title: 'Error', 
          description: data.error || 'Posting failed', 
          variant: 'destructive' 
        });
      }
    } catch (e) {
      toast({ 
        title: 'Error', 
        description: 'Failed to verify OTP', 
        variant: 'destructive' 
      });
    } finally {
      setIsPosting(false);
    }
  };

  const handleSchedule = () => {
    if (!filename || !generatedContent) {
      toast({ 
        title: 'Error', 
        description: 'No content to schedule', 
        variant: 'destructive' 
      });
      return;
    }

    onScheduleClick({
      caption: generatedContent,
      image: generatedImage,
      filename: filename
    });
  };

  const progressPercentage = usage.total > 0 ? 
    Math.max(0, Math.min(100, (usage.available / usage.total) * 100)) : 
    0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">AI Content Generator</h2>
        <p className="text-gray-600">Create content powered by AI</p>
      </div>

      <Card className="border-green-200 bg-green-50">
        <CardHeader className="pb-3">
          <div className="flex justify-between">
            <CardTitle className="text-sm font-medium text-green-800">
              Credits Remaining: {usage.available}/{usage.total}
            </CardTitle>
            <Badge variant="outline" className="text-green-700 border-green-300">
              {usage.isPremium ? 'Premium Plan' : 'Free Plan'}
            </Badge>
          </div>
          {usage.referralCode && (
            <div className="mt-2 text-sm text-gray-700">
              <p><strong>Referral Code:</strong> {usage.referralCode}</p>
              <p><strong>Referrals Joined:</strong> {usage.referralsCount}</p>
            </div>
          )}
        </CardHeader>
        <CardContent className="pt-0">
          <Progress value={progressPercentage} className="h-2 mb-2" />
          {!usage.isPremium && (
            <p className="text-xs text-green-600">
              Each generation costs 5 credits. You have {usage.available} left.
            </p>
          )}
        </CardContent>
      </Card>

      <PremiumUpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        creditsRemaining={usage.available}
      />

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Sparkles className="w-5 h-5 mr-2 text-green-600" />
              Content Settings
            </CardTitle>
            <CardDescription>Set content options</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="prompt">Prompt</Label>
              <Textarea
                id="prompt"
                placeholder="e.g., new product launch"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="min-h-[100px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Content Type</Label>
                <Select value={contentType} onValueChange={setContentType}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="post">Social Post</SelectItem>
                    <SelectItem value="caption">Caption</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tone</Label>
                <Select value={tone} onValueChange={setTone}>
                  <SelectTrigger><SelectValue placeholder="Select tone" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="casual">Casual</SelectItem>
                    <SelectItem value="humorous">Humorous</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={() => handleGenerate(false)} 
                disabled={isGenerating} 
                className="w-full"
              >
                {isGenerating ? (
                  <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
                ) : (
                  <><Sparkles className="w-4 h-4 mr-2" /> Generate</>
                )}
              </Button>
              <Button 
                onClick={() => handleGenerate(true)} 
                disabled={isGenerating} 
                variant="outline"
              >
                🔁 Regenerate
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Generated Content</CardTitle>
            <CardDescription>Result from AI</CardDescription>
          </CardHeader>
          <CardContent>
            {generatedContent || generatedImage ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={() => navigateHistory('prev')}
                      disabled={historyIndex >= history.length - 1 || history.length === 0}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-gray-500">
                      {history.length > 0 ? `${historyIndex + 1} of ${history.length}` : 'No history'}
                    </span>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={() => navigateHistory('next')}
                      disabled={historyIndex <= 0}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      onClick={handleSchedule}
                      variant="outline"
                      className="border-blue-500 text-blue-500 hover:bg-blue-50"
                    >
                      <Calendar className="w-4 h-4 mr-2" /> Schedule
                    </Button>
                    
                    <Button 
                      onClick={handlePost}
                      disabled={isPosting}
                      className="bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600"
                    >
                      {isPosting ? (
                        <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Posting...</>
                      ) : (
                        <><Send className="w-4 h-4 mr-2" /> Post</>
                      )}
                    </Button>
                  </div>
                </div>

                {generatedImage ? (
                  <div className="relative">
                    <img 
                      src={generatedImage} 
                      alt="Generated content" 
                      className="rounded-lg shadow-md w-full h-auto max-h-[300px] object-contain border"
                      onError={() => {
                        setGeneratedImage('');
                        toast({ title: 'Error', description: 'Failed to load image', variant: 'destructive' });
                      }}
                    />
                  </div>
                ) : (
                  <div className="bg-gray-100 border border-dashed rounded-lg w-full h-48 flex items-center justify-center">
                    <span className="text-gray-500">Image not available</span>
                  </div>
                )}

                {generatedContent && (
                  <div>
                    <Label>Caption</Label>
                    <Textarea 
                      value={generatedContent} 
                      onChange={(e) => setGeneratedContent(e.target.value)} 
                      className="min-h-[100px] mb-2"
                    />
                    <div className="flex gap-2">
                      <Button onClick={updateCaption} variant="secondary" size="sm">
                        💾 Save Caption
                      </Button>
                      <Button 
                        onClick={downloadImage} 
                        variant="outline" 
                        size="sm"
                        disabled={!generatedImage}
                      >
                        <Download className="w-4 h-4 mr-2" /> Download
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center p-8 text-gray-500">
                <div className="mb-4">Generated content will appear here</div>
                <div className="flex justify-center gap-2 opacity-50">
                  <Button variant="outline" size="icon" disabled>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" disabled>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" disabled>
                    <Send className="w-4 h-4 mr-2" /> Post
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* OTP Verification Modal */}
      <Dialog open={showOtpModal} onOpenChange={setShowOtpModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>OTP Verification</DialogTitle>
            <DialogDescription>
              {otpMessage || 'Enter the OTP sent to your phone to post to Instagram'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Input
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="Enter 6-digit OTP"
              className="text-center text-lg font-mono"
            />
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowOtpModal(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleOtpSubmit}
              disabled={isPosting}
            >
              {isPosting ? (
                <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Verifying...</>
              ) : (
                'Verify & Post'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Instagram Response */}
      {instaResponse && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h3 className="font-bold text-green-800">Posted Successfully!</h3>
          <p className="mt-2">
            View your post: <a href={instaResponse} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">{instaResponse}</a>
          </p>
        </div>
      )}
    </div>
  );
};

export default ContentGenerator;