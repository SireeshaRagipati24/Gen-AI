import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  Bell, 
  CheckCircle,
  XCircle,
  Info
} from "lucide-react";

interface Alert {
  id: string;
  type: 'warning' | 'success' | 'danger' | 'info';
  metric: string;
  change: number;
  date: string;
  message: string;
  dismissed?: boolean;
}

interface LinkClicks {
  data: Array<{
    name: string;
    values: Array<{ value: number; end_time: string }>;
  }>;
}

export default function AlertsPanel() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [linkClicks, setLinkClicks] = useState<LinkClicks>({ data: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Mock data for demonstration
        setAlerts([
          {
            id: "1",
            type: "success",
            metric: "follower_count",
            change: 127,
            date: "2024-01-20T10:00:00Z",
            message: "Significant follower growth detected! You gained 127 new followers today."
          },
          {
            id: "2", 
            type: "warning",
            metric: "reach",
            change: -15,
            date: "2024-01-19T15:30:00Z",
            message: "Reach decreased by 15% compared to last week. Consider posting at peak hours."
          },
          {
            id: "3",
            type: "info",
            metric: "engagement_rate",
            change: 8.5,
            date: "2024-01-18T12:00:00Z",
            message: "Your engagement rate is 8.5% higher than usual. Great content strategy!"
          },
          {
            id: "4",
            type: "danger", 
            metric: "profile_views",
            change: -22,
            date: "2024-01-17T09:15:00Z",
            message: "Profile views dropped by 22%. Consider updating your bio or posting more engaging content."
          }
        ]);

        setLinkClicks({
          data: [{
            name: "website_clicks",
            values: [
              { value: 45, end_time: "2024-01-20T00:00:00Z" },
              { value: 38, end_time: "2024-01-19T00:00:00Z" },
              { value: 52, end_time: "2024-01-18T00:00:00Z" }
            ]
          }]
        });

        
        const [alertsRes, linkClicksRes] = await Promise.all([
          fetch("http://localhost:5000/api/alerts"),
          fetch("http://localhost:5000/api/link-clicks")
        ]);

        const [alertsData, linkClicksData] = await Promise.all([
          alertsRes.json(),
          linkClicksRes.json()
        ]);

        // Add this function at the top, before useEffect
        function generateAlertMessage(metric: string, change: number): string {
          const changeText = Math.abs(change).toFixed(2) + (metric.includes('rate') ? '%' : '');
          if (change > 0) {
            return `✅ ${metric.replace('_', ' ')} increased by ${changeText} compared to last period.`;
          } else if (change < 0) {
            return `⚠️ ${metric.replace('_', ' ')} decreased by ${changeText} compared to last period.`;
          } else {
            return `ℹ️ ${metric.replace('_', ' ')} did not change.`;
          }
        }

        // Transform alerts data to include proper messaging
        const transformedAlerts = alertsData.map((alert: any) => ({
          ...alert,
          id: Math.random().toString(36).substr(2, 9),
          type: alert.change > 0 ? 'success' : 'warning',
          message: generateAlertMessage(alert.metric, alert.change)
        }));

        setAlerts(transformedAlerts);
        setLinkClicks(linkClicksData);
        

      } catch (error) {
        console.error("Error fetching alerts data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const dismissAlert = (alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, dismissed: true } : alert
    ));
  };

  const getAlertIcon = (type: Alert['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-chart-success" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-chart-warning" />;
      case 'danger':
        return <XCircle className="w-5 h-5 text-destructive" />;
      case 'info':
        return <Info className="w-5 h-5 text-chart-accent" />;
      default:
        return <Bell className="w-5 h-5" />;
    }
  };

  const getAlertBadgeVariant = (type: Alert['type']) => {
    switch (type) {
      case 'success':
        return 'default';
      case 'warning':
        return 'secondary';
      case 'danger':
        return 'destructive';
      case 'info':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 p-8">
        <div className="animate-pulse space-y-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-muted/50 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const activeAlerts = alerts.filter(alert => !alert.dismissed);
  const totalClicks = linkClicks.data[0]?.values.reduce((sum, val) => sum + val.value, 0) || 0;

  return (
    <div className="space-y-6 p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Alerts & Notifications
          </h2>
          <p className="text-muted-foreground mt-2">Stay on top of important changes to your account</p>
        </div>
        <Badge variant="outline" className="px-3 py-1">
          <Bell className="w-4 h-4 mr-2" />
          {activeAlerts.length} Active
        </Badge>
      </div>

      {/* Bio Link Clicks Summary */}
      <Card className="shadow-card hover:shadow-soft transition-all duration-300">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-chart-accent/10 text-chart-accent">
              <TrendingUp className="w-5 h-5" />
            </div>
            Bio Link Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <p className="text-2xl font-bold text-chart-accent">{totalClicks}</p>
              <p className="text-sm text-muted-foreground">Total Clicks (3 days)</p>
            </div>
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <p className="text-2xl font-bold text-chart-success">
                {Math.round(totalClicks / 3)}
              </p>
              <p className="text-sm text-muted-foreground">Daily Average</p>
            </div>
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <p className="text-2xl font-bold text-chart-secondary">
                {linkClicks.data[0]?.values[0]?.value || 0}
              </p>
              <p className="text-sm text-muted-foreground">Today's Clicks</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alerts List */}
      <div className="space-y-4">
        {activeAlerts.length === 0 ? (
          <Card className="shadow-card">
            <CardContent className="p-8 text-center">
              <CheckCircle className="w-12 h-12 text-chart-success mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">All caught up!</h3>
              <p className="text-muted-foreground">No active alerts at the moment. We'll notify you of any significant changes.</p>
            </CardContent>
          </Card>
        ) : (
          activeAlerts.map((alert) => (
            <Card key={alert.id} className="shadow-card hover:shadow-soft transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="p-2 rounded-lg bg-muted/30">
                      {getAlertIcon(alert.type)}
                    </div>
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold capitalize">
                          {alert.metric.replace('_', ' ')} Alert
                        </h4>
                        <Badge variant={getAlertBadgeVariant(alert.type)} className="text-xs">
                          {alert.change > 0 ? '+' : ''}{alert.change}
                          {alert.metric.includes('rate') ? '%' : ''}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{alert.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(alert.date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => dismissAlert(alert.id)}
                    className="hover:bg-muted/50"
                  >
                    Dismiss
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Smart Recommendations */}
      <Card className="shadow-card hover:shadow-soft transition-all duration-300 bg-gradient-to-r from-primary/5 to-chart-secondary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-primary text-primary-foreground">
              <TrendingUp className="w-5 h-5" />
            </div>
            Smart Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-card rounded-lg border border-border/50">
              <h4 className="font-medium mb-2 text-chart-success">🎯 Optimal Posting</h4>
              <p className="text-sm text-muted-foreground">
                Post between 6-8 PM on weekdays for maximum engagement based on your audience activity.
              </p>
            </div>
            <div className="p-4 bg-card rounded-lg border border-border/50">
              <h4 className="font-medium mb-2 text-chart-accent">📸 Content Strategy</h4>
              <p className="text-sm text-muted-foreground">
                Image posts are performing 23% better than videos. Consider focusing on high-quality visuals.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}