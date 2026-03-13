
import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import {
  MessageCircle,
  Tag,
  Bell,
  UserPlus,
  Users,
  Cake,
  UsersRound,
  Film,
  CalendarDays,
  BookOpen,
  ShoppingBag,
  Heart,
  Vote,
  Mail,
  Image,
  MoreHorizontal,
  Globe,
  ChevronDown,
  ChevronUp,
  Activity,
  AlertCircle,
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface CategoryConfig {
  key: string;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const NOTIFICATION_CATEGORIES: CategoryConfig[] = [
  { key: 'remarks', label: 'Comments', icon: <MessageCircle className="h-5 w-5 text-muted-foreground" />, description: 'Notify, In-app, Text' },
  { key: 'labels', label: 'Labels', icon: <Tag className="h-5 w-5 text-muted-foreground" />, description: 'Notify, In-app, Text' },
  { key: 'alerts', label: 'Alerts', icon: <Bell className="h-5 w-5 text-muted-foreground" />, description: 'Notify, In-app, Text' },
  { key: 'extra_engagement', label: 'Additional engagement regarding you', icon: <Activity className="h-5 w-5 text-muted-foreground" />, description: 'Notify, In-app, Text' },
  { key: 'companion_updates', label: 'Companion updates', icon: <Users className="h-5 w-5 text-muted-foreground" />, description: 'Notify, In-app, Text' },
  { key: 'connection_appeals', label: 'Connection appeals', icon: <UserPlus className="h-5 w-5 text-muted-foreground" />, description: 'Notify, In-app, Text' },
  { key: 'suggested_acquaintances', label: 'Suggested acquaintances', icon: <UsersRound className="h-5 w-5 text-muted-foreground" />, description: 'Notify, In-app, Text' },
  { key: 'celebrations', label: 'Celebrations', icon: <Cake className="h-5 w-5 text-muted-foreground" />, description: 'Notify, In-app, Text' },
  { key: 'communities', label: 'Communities', icon: <UsersRound className="h-5 w-5 text-muted-foreground" />, description: 'Notify, In-app, Text' },
  { key: 'clips', label: 'Clips', icon: <Film className="h-5 w-5 text-muted-foreground" />, description: 'Notify, In-app, Text' },
  { key: 'gatherings', label: 'Gatherings', icon: <CalendarDays className="h-5 w-5 text-muted-foreground" />, description: 'Notify, In-app, Text' },
  { key: 'channels_you_track', label: 'Channels you track', icon: <BookOpen className="h-5 w-5 text-muted-foreground" />, description: 'Notify, In-app, Text' },
  { key: 'trading_hub', label: 'Trading hub', icon: <ShoppingBag className="h-5 w-5 text-muted-foreground" />, description: 'Notify, In-app, Text' },
  { key: 'charitable_causes', label: 'Charitable causes & emergencies', icon: <Heart className="h-5 w-5 text-muted-foreground" />, description: 'Notify, In-app, Text' },
  { key: 'poll_alerts', label: 'Poll alerts', icon: <Vote className="h-5 w-5 text-muted-foreground" />, description: 'In-app exclusively' },
  { key: 'conversations', label: 'Conversations', icon: <Mail className="h-5 w-5 text-muted-foreground" />, description: 'Notify, In-app, Text' },
  { key: 'flashbacks', label: 'Flashbacks', icon: <Image className="h-5 w-5 text-muted-foreground" />, description: 'Notify, In-app, Text' },
  { key: 'miscellaneous_alerts', label: 'Miscellaneous alerts', icon: <MoreHorizontal className="h-5 w-5 text-muted-foreground" />, description: 'Notify, In-app, Text' },
];

interface DeliveryChannel {
  key: string;
  label: string;
  icon: React.ReactNode;
  subtitle: string;
}

const DELIVERY_CHANNELS: DeliveryChannel[] = [
  { key: 'browser', label: 'Web browser', icon: <Globe className="h-5 w-5 text-muted-foreground" />, subtitle: '' },
  { key: 'email', label: 'Electronic mail', icon: <Mail className="h-5 w-5 text-muted-foreground" />, subtitle: 'Activated, recommended' },
];

interface PreferenceState {
  push_enabled: boolean;
  email_enabled: boolean;
  sms_enabled: boolean;
}

export default function NotificationSettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [preferences, setPreferences] = useState<Record<string, PreferenceState>>({});
  const [deliverySettings, setDeliverySettings] = useState<Record<string, boolean>>({});
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    loadPreferences();
  }, [user]);

  const loadPreferences = async () => {
    if (!user) return;
    try {
      const [{ data: prefs }, { data: delivery }] = await Promise.all([
        supabase
          .from('notification_preferences')
          .select('category, push_enabled, email_enabled, sms_enabled')
          .eq('user_id', user.id),
        supabase
          .from('notification_delivery_settings')
          .select('channel, is_enabled')
          .eq('user_id', user.id),
      ]);

      const prefMap: Record<string, PreferenceState> = {};
      NOTIFICATION_CATEGORIES.forEach(cat => {
        prefMap[cat.key] = { push_enabled: true, email_enabled: true, sms_enabled: true };
      });
      prefs?.forEach(p => {
        prefMap[p.category] = {
          push_enabled: p.push_enabled,
          email_enabled: p.email_enabled,
          sms_enabled: p.sms_enabled,
        };
      });
      setPreferences(prefMap);

      const delMap: Record<string, boolean> = {};
      DELIVERY_CHANNELS.forEach(ch => { delMap[ch.key] = true; });
      delivery?.forEach(d => { delMap[d.channel] = d.is_enabled; });
      setDeliverySettings(delMap);
    } catch (error) {
      console.error('Error loading notification preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const updatePreference = async (category: string, field: keyof PreferenceState) => {
    if (!user) return;
    const current = preferences[category] || { push_enabled: true, email_enabled: true, sms_enabled: true };
    const newVal = !current[field];

    setPreferences(prev => ({
      ...prev,
      [category]: { ...current, [field]: newVal },
    }));

    try {
      const { error } = await supabase
        .from('notification_preferences')
        .upsert(
          {
            user_id: user.id,
            category,
            ...current,
            [field]: newVal,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,category' }
        );
      if (error) throw error;
    } catch (error) {
      console.error('Error updating preference:', error);
      setPreferences(prev => ({
        ...prev,
        [category]: current,
      }));
      toast.error('Could not save preference');
    }
  };

  const updateDelivery = async (channel: string) => {
    if (!user) return;
    const current = deliverySettings[channel] ?? true;
    const newVal = !current;

    setDeliverySettings(prev => ({ ...prev, [channel]: newVal }));

    try {
      const { error } = await supabase
        .from('notification_delivery_settings')
        .upsert(
          {
            user_id: user.id,
            channel,
            is_enabled: newVal,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,channel' }
        );
      if (error) throw error;
    } catch (error) {
      console.error('Error updating delivery setting:', error);
      setDeliverySettings(prev => ({ ...prev, [channel]: current }));
      toast.error('Could not save delivery setting');
    }
  };

  const getSubtitle = (category: string) => {
    const pref = preferences[category];
    if (!pref) return 'Notify, In-app, Text';
    const parts: string[] = [];
    if (pref.push_enabled) parts.push('Notify');
    if (pref.email_enabled) parts.push('In-app');
    if (pref.sms_enabled) parts.push('Text');
    return parts.length > 0 ? parts.join(', ') : 'None';
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-2xl">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-semibold text-foreground mb-1">Alert Preferences</h2>
        <p className="text-sm text-muted-foreground">
          We may still dispatch essential alerts regarding your profile and material beyond your chosen alert preferences.
        </p>
      </div>

      {/* What notifications you receive */}
      <div>
        <h3 className="text-base font-semibold text-foreground mb-3">Which alerts you obtain</h3>
        <Card className="border-border/50 divide-y divide-border/50">
          <CardContent className="p-0">
            {NOTIFICATION_CATEGORIES.map((cat) => (
              <Collapsible
                key={cat.key}
                open={expandedCategory === cat.key}
                onOpenChange={(open) => setExpandedCategory(open ? cat.key : null)}
              >
                <CollapsibleTrigger className="w-full">
                  <div className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors cursor-pointer">
                    <div className="flex items-center gap-3">
                      {cat.icon}
                      <div className="text-left">
                        <p className="text-sm font-medium text-foreground">{cat.label}</p>
                        <p className="text-xs text-muted-foreground">{getSubtitle(cat.key)}</p>
                      </div>
                    </div>
                    {expandedCategory === cat.key ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="px-4 pb-4 pt-1 space-y-3 bg-muted/10">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-foreground">Notify</span>
                      <Switch
                        checked={preferences[cat.key]?.push_enabled ?? true}
                        onCheckedChange={() => updatePreference(cat.key, 'push_enabled')}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-foreground">In-app</span>
                      <Switch
                        checked={preferences[cat.key]?.email_enabled ?? true}
                        onCheckedChange={() => updatePreference(cat.key, 'email_enabled')}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-foreground">Text</span>
                      <Switch
                        checked={preferences[cat.key]?.sms_enabled ?? true}
                        onCheckedChange={() => updatePreference(cat.key, 'sms_enabled')}
                      />
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Where you receive notifications */}
      <div>
        <h3 className="text-base font-semibold text-foreground mb-3">Where you obtain alerts</h3>
        <Card className="border-border/50 divide-y divide-border/50">
          <CardContent className="p-0">
            {DELIVERY_CHANNELS.map((ch) => (
              <div key={ch.key} className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3">
                  {ch.icon}
                  <div>
                    <p className="text-sm font-medium text-foreground">{ch.label}</p>
                    {ch.subtitle && (
                      <p className="text-xs text-muted-foreground">{ch.subtitle}</p>
                    )}
                  </div>
                </div>
                <Switch
                  checked={deliverySettings[ch.key] ?? true}
                  onCheckedChange={() => updateDelivery(ch.key)}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
