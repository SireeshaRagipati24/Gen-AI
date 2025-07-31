
import { useState, useEffect, createContext, useContext } from 'react';

interface PointsData {
  total: number;
  used: number;
  available: number;
  isPremium: boolean;
  referralCode?: string;
  referralsCount?: number;
}

interface UsageContextType {
  usage: PointsData;
  canGeneratePost: boolean;
  refreshUsage: () => Promise<void>;
}

const UsageContext = createContext<UsageContextType | undefined>(undefined);

export const UsageProvider = ({ children }: { children: React.ReactNode }) => {
  const [usage, setUsage] = useState<PointsData>({
    total: 15,
    used: 0,
    available: 15,
    isPremium: false,
    referralCode: '',
    referralsCount: 0,
  });

  const fetchUsage = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/check-auth', {
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json();
        if (data.authenticated) {
          setUsage({
            total: data.points.total,
            used: data.points.used,
            available: data.points.available,
            isPremium: data.is_premium || false,
            referralCode: data.referral_code || '',
            referralsCount: data.referrals_count || 0,
          });
        }
      }
    } catch (error) {
      console.error("Failed to fetch usage data:", error);
    }
  };

  useEffect(() => {
    fetchUsage();
  }, []);

  const canGeneratePost = usage.isPremium || usage.available >= 5;

  return (
    <UsageContext.Provider
      value={{
        usage,
        canGeneratePost,
        refreshUsage: fetchUsage,
      }}
    >
      {children}
    </UsageContext.Provider>
  );
};

export const useUsageTracking = () => {
  const context = useContext(UsageContext);
  if (context === undefined) {
    throw new Error('useUsageTracking must be used within a UsageProvider');
  }
  return context;
};

