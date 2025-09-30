// src/components/PostButton.tsx
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import InstagramVerification from './InstagramVerification';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { RocketIcon, ExclamationTriangleIcon } from '@radix-ui/react-icons';

interface PostButtonProps {
  filename: string;
  caption: string;
  onPostSuccess: () => void;
}

const PostButton: React.FC<PostButtonProps> = ({ filename, caption, onPostSuccess }) => {
  const [isVerifying, setIsVerifying] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [otp, setOtp] = useState('');
  const [showOtpDialog, setShowOtpDialog] = useState(false);
  const [error, setError] = useState('');
  const [hasInstagram, setHasInstagram] = useState(false);

  const checkInstagram = async () => {
    try {
      const response = await fetch('/api/check-auth');
      if (response.ok) {
        const data = await response.json();
        setHasInstagram(data.has_instagram);
      }
    } catch (err) {
      console.error('Error checking Instagram status:', err);
    }
  };

  const handlePost = async () => {
    await checkInstagram();
    
    if (!hasInstagram) {
      setIsVerifying(true);
      return;
    }
    
    startPosting();
  };

  const startPosting = async () => {
    setIsPosting(true);
    setError('');
    
    try {
      const response = await fetch('/api/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename, caption })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        onPostSuccess();
      } else if (data.require_otp) {
        setShowOtpDialog(true);
      } else {
        setError(data.error || 'Failed to post. Please try again.');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsPosting(false);
    }
  };

  const handleOtpSubmit = async () => {
    setIsPosting(true);
    setError('');
    
    try {
      const response = await fetch('/api/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename, caption, otp })
      });
      
      if (response.ok) {
        onPostSuccess();
        setShowOtpDialog(false);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to post. Please try again.');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <div className="mt-4">
      {error && (
        <Alert variant="destructive" className="mb-4">
          <ExclamationTriangleIcon className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <Button 
        onClick={handlePost}
        disabled={isPosting}
        className="w-full"
      >
        {isPosting ? "Posting..." : "Post to Instagram"}
      </Button>
      
      <Dialog open={isVerifying} onOpenChange={setIsVerifying}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Instagram Verification Required</DialogTitle>
            <DialogDescription>
              Please verify your Instagram credentials to post content.
            </DialogDescription>
          </DialogHeader>
          <InstagramVerification onVerified={() => {
            setIsVerifying(false);
            startPosting();
          }} />
        </DialogContent>
      </Dialog>
      
      <Dialog open={showOtpDialog} onOpenChange={setShowOtpDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Two-Factor Authentication</DialogTitle>
            <DialogDescription>
              Please enter the 6-digit code sent to your phone.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <Input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="Enter 6-digit code"
              maxLength={6}
            />
            
            <Button 
              onClick={handleOtpSubmit}
              disabled={isPosting || otp.length !== 6}
              className="w-full"
            >
              {isPosting ? "Verifying..." : "Submit Code"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PostButton;