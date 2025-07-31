import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Check, Sparkles, X } from 'lucide-react';
import { Link } from 'react-router-dom';

interface PremiumUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  creditsRemaining: number; // 👈 Remaining credits
}

const PremiumUpgradeModal = ({ isOpen, onClose, creditsRemaining }: PremiumUpgradeModalProps) => {
  const maxFreeCredits = 15; // Total initial free credits
  const creditsUsed = maxFreeCredits - creditsRemaining;
  const percentageUsed = (creditsUsed / maxFreeCredits) * 100;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center text-2xl">
            <Sparkles className="w-6 h-6 mr-2 text-green-600" />
            Upgrade to Premium
          </DialogTitle>
          <DialogDescription>
            You've used {creditsUsed} of your {maxFreeCredits} free credits. Upgrade to continue generating unlimited content.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Usage Progress */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Credits Used</span>
              <span className="text-sm text-gray-600">{creditsUsed}/{maxFreeCredits}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${percentageUsed}%` }}
              />
            </div>
          </div>

          {/* Premium Benefits */}
          <Card>
            <CardHeader>
              <CardTitle className="text-green-600">Premium Benefits</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {[
                  'Unlimited AI posts',
                  'Advanced templates',
                  'Multiple accounts',
                  'Priority support',
                  'Analytics dashboard',
                  'Team collaboration',
                ].map((benefit, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-green-600" />
                    <span className="text-sm">{benefit}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-between space-x-4">
            <Button variant="outline" onClick={onClose} className="flex-1">
              <X className="w-4 h-4 mr-2" />
              Maybe Later
            </Button>
            <Link to="/#pricing" className="flex-1">
              <Button className="w-full bg-green-600 hover:bg-green-700" onClick={onClose}>
                <Sparkles className="w-4 h-4 mr-2" />
                View Pricing Plans
              </Button>
            </Link>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PremiumUpgradeModal;
