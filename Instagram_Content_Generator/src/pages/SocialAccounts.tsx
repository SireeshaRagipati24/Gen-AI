
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Facebook, Instagram, Linkedin, Twitter, MessageCircle, Plus, Check, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const SocialAccounts = () => {
  const [accounts, setAccounts] = useState([
    { id: 1, platform: 'Facebook', icon: Facebook, connected: false, username: '', enabled: false },
    { id: 2, platform: 'Instagram', icon: Instagram, connected: false, username: '', enabled: false },
    { id: 3, platform: 'LinkedIn', icon: Linkedin, connected: false, username: '', enabled: false },
    { id: 4, platform: 'Twitter', icon: Twitter, connected: false, username: '', enabled: false },
    { id: 5, platform: 'Reddit', icon: MessageCircle, connected: false, username: '', enabled: false },
  ]);

  const { toast } = useToast();

  const handleConnect = (accountId: number, username: string) => {
    if (!username.trim()) {
      toast({
        title: "Error",
        description: "Please enter a username or handle",
        variant: "destructive",
      });
      return;
    }

    setAccounts(accounts.map(account => 
      account.id === accountId 
        ? { ...account, connected: true, username, enabled: true }
        : account
    ));

    const platform = accounts.find(acc => acc.id === accountId)?.platform;
    toast({
      title: "Account Connected!",
      description: `Successfully connected your ${platform} account.`,
    });
  };

  const handleDisconnect = (accountId: number) => {
    setAccounts(accounts.map(account => 
      account.id === accountId 
        ? { ...account, connected: false, username: '', enabled: false }
        : account
    ));

    const platform = accounts.find(acc => acc.id === accountId)?.platform;
    toast({
      title: "Account Disconnected",
      description: `${platform} account has been disconnected.`,
    });
  };

  const handleToggleEnabled = (accountId: number) => {
    setAccounts(accounts.map(account => 
      account.id === accountId 
        ? { ...account, enabled: !account.enabled }
        : account
    ));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Social Media Accounts</h1>
            <p className="text-gray-600">Connect and manage your social media platforms</p>
          </div>
          <Button variant="outline" onClick={() => window.history.back()}>
            Back to Dashboard
          </Button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Connected Accounts Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Account Status</CardTitle>
            <CardDescription>
              {accounts.filter(acc => acc.connected).length} of {accounts.length} accounts connected
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {accounts.map((account) => {
                const Icon = account.icon;
                return (
                  <Badge 
                    key={account.id}
                    variant={account.connected ? "default" : "secondary"}
                    className={account.connected ? "bg-green-600" : ""}
                  >
                    <Icon className="w-3 h-3 mr-1" />
                    {account.platform}
                    {account.connected && <Check className="w-3 h-3 ml-1" />}
                  </Badge>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Social Media Accounts */}
        <div className="grid gap-4">
          {accounts.map((account) => {
            const Icon = account.icon;
            return (
              <Card key={account.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                        <Icon className="w-6 h-6 text-gray-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{account.platform}</h3>
                        <p className="text-sm text-gray-500">
                          {account.connected ? `@${account.username}` : 'Not connected'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      {account.connected && (
                        <div className="flex items-center space-x-2">
                          <Label htmlFor={`enable-${account.id}`} className="text-sm">
                            Auto-post
                          </Label>
                          <Switch
                            id={`enable-${account.id}`}
                            checked={account.enabled}
                            onCheckedChange={() => handleToggleEnabled(account.id)}
                          />
                        </div>
                      )}

                      {account.connected ? (
                        <Button
                          variant="outline"
                          onClick={() => handleDisconnect(account.id)}
                        >
                          <X className="w-4 h-4 mr-2" />
                          Disconnect
                        </Button>
                      ) : (
                        <ConnectForm 
                          platform={account.platform}
                          onConnect={(username) => handleConnect(account.id, username)}
                        />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Publishing Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Publishing Settings</CardTitle>
            <CardDescription>Configure how your content is shared across platforms</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Default posting time</Label>
                <Input type="time" defaultValue="09:00" />
              </div>
              <div className="space-y-2">
                <Label>Time zone</Label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-md">
                  <option>UTC-5 (Eastern Time)</option>
                  <option>UTC-8 (Pacific Time)</option>
                  <option>UTC+0 (GMT)</option>
                </select>
              </div>
            </div>
            <Button className="bg-green-600 hover:bg-green-700">
              Save Settings
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const ConnectForm = ({ platform, onConnect }: { platform: string; onConnect: (username: string) => void }) => {
  const [username, setUsername] = useState('');
  const [showForm, setShowForm] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConnect(username);
    setUsername('');
    setShowForm(false);
  };

  if (!showForm) {
    return (
      <Button onClick={() => setShowForm(true)} className="bg-green-600 hover:bg-green-700">
        <Plus className="w-4 h-4 mr-2" />
        Connect
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex space-x-2">
      <Input
        placeholder={`${platform} username/handle`}
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        className="w-48"
      />
      <Button type="submit" size="sm" className="bg-green-600 hover:bg-green-700">
        Connect
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(false)}>
        Cancel
      </Button>
    </form>
  );
};

export default SocialAccounts;
