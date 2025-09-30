import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Copy, Check, Share2, Gift } from 'lucide-react';

interface ReferralLinkProps {
  code: string;
}

export const ReferralLink: React.FC<ReferralLinkProps> = ({ code }) => {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const referralUrl = `https://your-app.com/signup?ref=${code}`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopied(true);
      toast({
        title: "Referral link copied!",
        description: "Share it with friends to earn rewards",
      });
      
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Please copy the link manually",
        variant: "destructive",
      });
    }
  };

  const shareReferralLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join me on this amazing app!',
          text: 'Get bonus points when you sign up with my referral link',
          url: referralUrl,
        });
      } catch (err) {
        copyToClipboard();
      }
    } else {
      copyToClipboard();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-lg font-semibold text-foreground">Your Referral Link</h4>
          <p className="text-sm text-muted-foreground">
            Share this link and earn 5 points for each friend who signs up
          </p>
        </div>
        <div className="flex items-center space-x-1 bg-success/10 px-3 py-1 rounded-full">
          <Gift className="w-4 h-4 text-success" />
          <span className="text-sm font-medium text-success">+5 points</span>
        </div>
      </div>

      <div className="flex space-x-2">
        <Input
          value={referralUrl}
          readOnly
          className="flex-1 bg-muted/50 border-border"
        />
        <Button
          onClick={copyToClipboard}
          variant="outline"
          size="sm"
          className="shrink-0 border-border hover:bg-muted/50"
        >
          {copied ? (
            <Check className="w-4 h-4 text-success" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
        </Button>
        <Button
          onClick={shareReferralLink}
          size="sm"
          className="shrink-0 bg-primary hover:bg-primary/90"
        >
          <Share2 className="w-4 h-4" />
        </Button>
      </div>

      <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <div className="bg-warning/20 rounded-full p-1">
            <Gift className="w-4 h-4 text-warning" />
          </div>
          <div>
            <h5 className="font-medium text-warning-foreground">How it works</h5>
            <ul className="text-sm text-warning-foreground/80 mt-1 space-y-1">
              <li>• Friend signs up with your link</li>
              <li>• You both get 5 bonus points</li>
              <li>• No limit on referrals!</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};