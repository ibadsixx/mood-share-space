import { ChevronRight, Bell, MessageCircle, Users, Heart, Share2, AtSign, Hash, Video, Image, Calendar, Shield, Volume2, Mail } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useHashtagNotificationSettings } from '@/hooks/useHashtagNotificationSettings';

const notificationItems = [
  { id: 'remarks', icon: <MessageCircle className="h-5 w-5" />, label: 'Remarks on your posts' },
  { id: 'tags', icon: <AtSign className="h-5 w-5" />, label: 'Tags and references' },
  { id: 'responses', icon: <MessageCircle className="h-5 w-5" />, label: 'Responses to your remarks' },
  { id: 'companions', icon: <Users className="h-5 w-5" />, label: 'Companion requests and approvals' },
  { id: 'appreciations', icon: <Heart className="h-5 w-5" />, label: 'Appreciations and reactions' },
  { id: 'reshares', icon: <Share2 className="h-5 w-5" />, label: 'Reshares of your content' },
  { id: 'broadcasts', icon: <Video className="h-5 w-5" />, label: 'Live broadcast alerts' },
  { id: 'memories', icon: <Image className="h-5 w-5" />, label: 'Photo and memory reminders' },
  { id: 'occasions', icon: <Calendar className="h-5 w-5" />, label: 'Upcoming occasions' },
  { id: 'account-safety', icon: <Shield className="h-5 w-5" />, label: 'Account safety notices' },
  { id: 'sounds', icon: <Volume2 className="h-5 w-5" />, label: 'In-application sounds' },
  { id: 'electronic-mail', icon: <Mail className="h-5 w-5" />, label: 'Electronic mail notifications' },
];

export default function NotificationSettings() {
  const { enabled, loading, toggleNotifications } = useHashtagNotificationSettings();

  return (
    <div className="space-y-4">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-foreground mb-1">Alert Preferences</h2>
        <p className="text-muted-foreground text-sm">Manage when and how you receive alerts and updates.</p>
      </div>

      <div className="divide-y divide-border rounded-xl overflow-hidden bg-card border border-border/50">
        {/* Hashtag toggle row */}
        <div className="flex items-center gap-4 px-4 py-3.5 hover:bg-muted/50 transition-colors">
          <span className="text-primary"><Hash className="h-5 w-5" /></span>
          <span className="flex-1 text-sm font-medium text-primary">Hashtag alerts</span>
          <Switch
            checked={enabled}
            onCheckedChange={toggleNotifications}
            disabled={loading}
          />
        </div>

        {notificationItems.map((item) => (
          <button
            key={item.id}
            className="w-full flex items-center gap-4 px-4 py-3.5 text-left hover:bg-muted/50 transition-colors"
          >
            <span className="text-primary">{item.icon}</span>
            <span className="flex-1 text-sm font-medium text-primary">{item.label}</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        ))}
      </div>
    </div>
  );
}
