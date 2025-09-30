import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Download, 
  FileText, 
  Calendar, 
  Users, 
  BarChart3, 
  Image, 
  TrendingUp,
  CheckCircle
} from "lucide-react";

interface ExportOption {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  format: string;
  size: string;
  color: string;
}

export default function ExportPanel() {
  const [exporting, setExporting] = useState<string | null>(null);
  const [exported, setExported] = useState<string[]>([]);

  const exportOptions: ExportOption[] = [
    {
      id: 'analytics-summary',
      title: 'Analytics Summary Report',
      description: 'Complete overview of followers, engagement, and key metrics',
      icon: <BarChart3 className="w-5 h-5" />,
      format: 'PDF',
      size: '2.1 MB',
      color: 'chart-primary'
    },
    {
      id: 'posts-performance',
      title: 'Posts Performance Data',
      description: 'Detailed performance data for all your posts with engagement metrics',
      icon: <Image className="w-5 h-5" />,
      format: 'CSV',
      size: '854 KB',
      color: 'chart-secondary'
    },
    {
      id: 'audience-insights',
      title: 'Audience Demographics',
      description: 'Age, gender, location and interests breakdown of your followers',
      icon: <Users className="w-5 h-5" />,
      format: 'JSON',
      size: '312 KB',
      color: 'chart-success'
    },
    {
      id: 'growth-trends',
      title: 'Growth Trends Report',
      description: 'Follower growth, reach trends and engagement rate over time',
      icon: <TrendingUp className="w-5 h-5" />,
      format: 'PDF',
      size: '1.7 MB',
      color: 'chart-accent'
    },
    {
      id: 'hashtag-analysis',
      title: 'Hashtag Performance Analysis',
      description: 'Top performing hashtags with reach and engagement data',
      icon: <FileText className="w-5 h-5" />,
      format: 'CSV',
      size: '267 KB',
      color: 'chart-warning'
    },
    {
      id: 'scheduled-report',
      title: 'Monthly Scheduled Report',
      description: 'Automated monthly report with all key metrics and insights',
      icon: <Calendar className="w-5 h-5" />,
      format: 'PDF',
      size: '3.2 MB',
      color: 'kpi-engagement'
    }
  ];

  const handleExport = async (optionId: string) => {
    setExporting(optionId);
    
    // Simulate export process
    try {
      // In a real application, this would call the Flask API
      // const response = await fetch("http://localhost:5000/api/export-data");
      // const blob = await response.blob();
      
      // For demo, we'll simulate a delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simulate successful export
      setExported(prev => [...prev, optionId]);
      
      // In a real app, you would trigger the actual file download here
      // const url = window.URL.createObjectURL(blob);
      // const a = document.createElement('a');
      // a.href = url;
      // a.download = `instagram-export-${optionId}.${getFormat(optionId).toLowerCase()}`;
      // document.body.appendChild(a);
      // a.click();
      // window.URL.revokeObjectURL(url);
      // document.body.removeChild(a);
      
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setExporting(null);
    }
  };

  const isExported = (optionId: string) => exported.includes(optionId);
  const isExporting = (optionId: string) => exporting === optionId;

  return (
    <div className="space-y-8 p-8">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          Export & Download
        </h2>
        <p className="text-muted-foreground mt-2">Export your analytics data in various formats for reporting and analysis</p>
      </div>

      {/* Export Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="shadow-card hover:shadow-soft transition-all duration-300">
          <CardContent className="p-6 text-center">
            <div className="p-3 rounded-full bg-chart-primary/10 text-chart-primary w-fit mx-auto mb-3">
              <Download className="w-6 h-6" />
            </div>
            <p className="text-2xl font-bold">24</p>
            <p className="text-sm text-muted-foreground">Total Exports</p>
          </CardContent>
        </Card>
        
        <Card className="shadow-card hover:shadow-soft transition-all duration-300">
          <CardContent className="p-6 text-center">
            <div className="p-3 rounded-full bg-chart-success/10 text-chart-success w-fit mx-auto mb-3">
              <FileText className="w-6 h-6" />
            </div>
            <p className="text-2xl font-bold">147 MB</p>
            <p className="text-sm text-muted-foreground">Data Exported</p>
          </CardContent>
        </Card>

        <Card className="shadow-card hover:shadow-soft transition-all duration-300">
          <CardContent className="p-6 text-center">
            <div className="p-3 rounded-full bg-chart-warning/10 text-chart-warning w-fit mx-auto mb-3">
              <Calendar className="w-6 h-6" />
            </div>
            <p className="text-2xl font-bold">3</p>
            <p className="text-sm text-muted-foreground">This Month</p>
          </CardContent>
        </Card>

        <Card className="shadow-card hover:shadow-soft transition-all duration-300">
          <CardContent className="p-6 text-center">
            <div className="p-3 rounded-full bg-chart-secondary/10 text-chart-secondary w-fit mx-auto mb-3">
              <TrendingUp className="w-6 h-6" />
            </div>
            <p className="text-2xl font-bold">Last 7d</p>
            <p className="text-sm text-muted-foreground">Latest Export</p>
          </CardContent>
        </Card>
      </div>

      {/* Export Options */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {exportOptions.map((option) => (
          <Card key={option.id} className="shadow-card hover:shadow-soft transition-all duration-300 group">
            <CardHeader>
              <CardTitle className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-${option.color}/10 text-${option.color}`}>
                    {option.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold">{option.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {option.format}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {option.size}
                      </span>
                    </div>
                  </div>
                </div>
                {isExported(option.id) && (
                  <CheckCircle className="w-5 h-5 text-chart-success" />
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">{option.description}</p>
              
              <Button
                onClick={() => handleExport(option.id)}
                disabled={isExporting(option.id)}
                className="w-full gap-2"
                variant={isExported(option.id) ? "outline" : "default"}
              >
                {isExporting(option.id) ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Exporting...
                  </>
                ) : isExported(option.id) ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Downloaded
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Export {option.format}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Bulk Export Section */}
      <Card className="shadow-card hover:shadow-soft transition-all duration-300 bg-gradient-to-r from-primary/5 to-chart-secondary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-primary text-primary-foreground">
              <Download className="w-5 h-5" />
            </div>
            Bulk Export Options
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Export all your data at once for comprehensive analysis or backup purposes.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button 
              variant="outline" 
              className="gap-2 h-auto p-4 hover:bg-primary/5 hover:border-primary/30"
              onClick={() => handleExport('complete-backup')}
              disabled={exporting === 'complete-backup'}
            >
              <div>
                <p className="font-medium">Complete Data Backup</p>
                <p className="text-xs text-muted-foreground">All analytics data (ZIP, ~8.5 MB)</p>
              </div>
            </Button>
            
            <Button 
              variant="outline" 
              className="gap-2 h-auto p-4 hover:bg-chart-secondary/5 hover:border-chart-secondary/30"
              onClick={() => handleExport('executive-report')}
              disabled={exporting === 'executive-report'}
            >
              <div>
                <p className="font-medium">Executive Summary</p>
                <p className="text-xs text-muted-foreground">Key metrics only (PDF, ~1.2 MB)</p>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Export History */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Recent Exports</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { name: "Monthly Analytics Report - December 2024", date: "Jan 15, 2024", size: "2.1 MB", format: "PDF" },
              { name: "Posts Performance Data - Q4 2024", date: "Jan 10, 2024", size: "854 KB", format: "CSV" },
              { name: "Audience Demographics Export", date: "Jan 8, 2024", size: "312 KB", format: "JSON" },
            ].map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
                <div>
                  <p className="font-medium text-sm">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.date} • {item.size}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">{item.format}</Badge>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <Download className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}