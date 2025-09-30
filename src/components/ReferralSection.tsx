import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

const ReferralSection = () => {
  const [referralLink, setReferralLink] = useState('');
  const [referralsCount, setReferralsCount] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);
  const [pointsUsed, setPointsUsed] = useState(0);
  const [availablePoints, setAvailablePoints] = useState(0);
  const [freeGenerations, setFreeGenerations] = useState(0);

  const { toast } = useToast();

  useEffect(() => {
    fetchReferralData();
  }, []);

  const fetchReferralData = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/usage', { 
        credentials: 'include' 
      });
      const data = await res.json();

      if (!data.success) {
        toast({
          title: 'Error',
          description: data.error || 'Failed to fetch usage data',
          variant: 'destructive'
        });
        return;
      }

      if (data.referralCode) {
        const link = `${window.location.origin}/signup?ref=${data.referralCode}`;
        setReferralLink(link);
      }

      setReferralsCount(data.referralsCount);
      setTotalPoints(data.totalPoints);
      setPointsUsed(data.pointsUsed);
      setAvailablePoints(data.availablePoints);
      setFreeGenerations(data.freeGenerations);

    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch referral data',
        variant: 'destructive'
      });
    }
  };

  const copyReferralLink = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink);
    toast({ title: 'Copied!', description: 'Referral link copied to clipboard' });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>🎁 Refer a Friend</CardTitle>
        <CardDescription>Earn free credits by inviting friends</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Referral Link Section */}
        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <span className="text-2xl">🔗</span>
            <div>
              <h3 className="font-semibold">Your Referral Link</h3>
              <p className="text-sm text-gray-600 mt-1">
                Share this link and earn 5 points per friend who signs up.
              </p>
            </div>
          </div>

          {referralLink ? (
            <div className="flex space-x-2">
              <Input value={referralLink} readOnly className="flex-1 font-mono text-sm" />
              <Button onClick={copyReferralLink} className="bg-green-600 hover:bg-green-700">
                Copy
              </Button>
            </div>
          ) : (
            <p className="text-sm text-red-600 py-2">
              Referral link is loading or unavailable. Try again later.
            </p>
          )}
        </div>

        {/* Points & Credit Info */}
        <div className="space-y-4 pt-2">
          <div className="flex items-start space-x-3">
            <span className="text-2xl">💎</span>
            <div>
              <h3 className="font-semibold">Your Credits</h3>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-gray-600">Total points earned</p>
              <p className="font-medium">{totalPoints}</p>
            </div>

            <div className="space-y-1">
              <p className="text-sm text-gray-600">Total used</p>
              <p className="font-medium">{pointsUsed}</p>
            </div>

            <div className="space-y-1 col-span-2">
              <p className="text-sm text-gray-600">Remaining credits</p>
              <p className="font-medium">
                {availablePoints} points ({freeGenerations} free image generations left)
              </p>
            </div>
          </div>

          {referralsCount > 0 && (
            <p className="text-sm text-gray-600 mt-2">
              You've referred <span className="font-medium text-green-600">{referralsCount}</span>
              {referralsCount === 1 ? ' friend' : ' friends'}.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ReferralSection;