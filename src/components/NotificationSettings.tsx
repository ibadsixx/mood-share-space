import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useHashtagNotificationSettings } from '@/hooks/useHashtagNotificationSettings';
import { Hash, Bell } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function NotificationSettings() {
  const { enabled, loading, toggleNotifications } = useHashtagNotificationSettings();

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold text-foreground mb-2">Notification Settings</h2>
          <p className="text-muted-foreground">Control when and how you receive notifications.</p>
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground mb-2">Notification Settings</h2>
        <p className="text-muted-foreground">Control when and how you receive notifications.</p>
      </div>

      <Card className="border-border/50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">General Notifications</CardTitle>
          </div>
          <CardDescription>
            Manage your notification preferences for various activities
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between space-x-4 p-4 rounded-lg bg-muted/30">
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <Hash className="h-4 w-4 text-primary" />
                <Label htmlFor="hashtag-notifications" className="font-medium cursor-pointer">
                  Hashtag Notifications
                </Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Get notified when someone uses a hashtag you're following
              </p>
            </div>
            <Switch
              id="hashtag-notifications"
              checked={enabled}
              onCheckedChange={toggleNotifications}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
