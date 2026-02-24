import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Shield, Users, Tag, UserX, UserPlus, Trash2 } from 'lucide-react';

interface ProfileData {
  email: string;
  birthday: string;
  relationship: string;
}

interface PrivacySetting {
  setting_name: string;
  setting_value: string;
}

interface BlockedUser {
  id: string;
  blocked_user_id: string;
  profiles: {
    display_name: string;
    username: string;
    profile_pic: string | null;
  };
}

type PrivacySection = 'profile' | 'audience' | 'tagging' | 'blocking' | 'friends';

const PrivacyCheckup = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState<PrivacySection>('profile');
  const [profileData, setProfileData] = useState<ProfileData>({
    email: '',
    birthday: '',
    relationship: ''
  });
  const [privacySettings, setPrivacySettings] = useState<Record<string, string>>({});
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchUserData();
    }
  }, [user]);

  const fetchUserData = async () => {
    try {
      // Fetch profile data
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, birthday, relationship')
        .eq('id', user?.id)
        .single();

      if (profile) {
        setProfileData({
          email: profile.email || '',
          birthday: profile.birthday || '',
          relationship: profile.relationship || ''
        });
      }

      // Fetch privacy settings
      const { data: settings } = await supabase
        .from('privacy_settings')
        .select('setting_name, setting_value')
        .eq('user_id', user?.id);

      if (settings) {
        const settingsObj = settings.reduce((acc, setting) => {
          acc[setting.setting_name] = setting.setting_value;
          return acc;
        }, {} as Record<string, string>);
        setPrivacySettings(settingsObj);
      }

      // Fetch blocked users with profile information
      const { data: blocked } = await supabase
        .from('blocked_users')
        .select(`
          id,
          blocked_user_id
        `)
        .eq('user_id', user?.id);

      if (blocked && blocked.length > 0) {
        // Fetch profile information for blocked users
        const blockedUserIds = blocked.map(b => b.blocked_user_id);
        const { data: blockedProfiles } = await supabase
          .from('profiles')
          .select('id, display_name, username, profile_pic')
          .in('id', blockedUserIds);

        const blockedUsersWithProfiles = blocked.map(blockedUser => ({
          ...blockedUser,
          profiles: blockedProfiles?.find(profile => profile.id === blockedUser.blocked_user_id) || {
            display_name: 'Unknown User',
            username: 'unknown',
            profile_pic: null
          }
        }));

        setBlockedUsers(blockedUsersWithProfiles);
      }

    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load privacy settings',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (field: keyof ProfileData, value: string) => {
    try {
      setProfileData(prev => ({ ...prev, [field]: value }));
      
      const { error } = await supabase
        .from('profiles')
        .update({ [field]: value })
        .eq('id', user?.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Profile updated successfully'
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to update profile',
        variant: 'destructive'
      });
    }
  };

  const updatePrivacySetting = async (settingName: string, settingValue: string) => {
    try {
      setPrivacySettings(prev => ({ ...prev, [settingName]: settingValue }));
      
      const { error } = await supabase
        .from('privacy_settings')
        .upsert({
          user_id: user?.id,
          setting_name: settingName,
          setting_value: settingValue
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Privacy setting updated successfully'
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to update privacy setting',
        variant: 'destructive'
      });
    }
  };

  const unblockUser = async (blockedUserId: string) => {
    try {
      const { error } = await supabase
        .from('blocked_users')
        .delete()
        .eq('user_id', user?.id)
        .eq('blocked_user_id', blockedUserId);

      if (error) throw error;

      setBlockedUsers(prev => prev.filter(blocked => blocked.blocked_user_id !== blockedUserId));
      
      toast({
        title: 'Success',
        description: 'User unblocked successfully'
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to unblock user',
        variant: 'destructive'
      });
    }
  };

  const sidebarItems = [
    { id: 'profile' as PrivacySection, label: 'Profile Information', icon: Shield },
    { id: 'audience' as PrivacySection, label: 'Audience', icon: Users },
    { id: 'tagging' as PrivacySection, label: 'Tagging', icon: Tag },
    { id: 'blocking' as PrivacySection, label: 'Blocking', icon: UserX },
    { id: 'friends' as PrivacySection, label: 'Friend Requests', icon: UserPlus }
  ];

  const privacyOptions = [
    { value: 'public', label: 'Public' },
    { value: 'friends', label: 'Friends' },
    { value: 'friends_of_friends', label: 'Friends of Friends' },
    { value: 'only_me', label: 'Only Me' }
  ];

  if (loading) {
    return <div className="p-6 text-center">Loading privacy settings...</div>;
  }

  const renderProfileSection = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
        <div className="space-y-4">
          <div>
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={profileData.email}
              onChange={(e) => updateProfile('email', e.target.value)}
              placeholder="Enter your email"
            />
          </div>
          <div>
            <Label htmlFor="birthday">Birthday</Label>
            <Input
              id="birthday"
              type="date"
              value={profileData.birthday}
              onChange={(e) => updateProfile('birthday', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="relationship">Relationship Status</Label>
            <Select
              value={profileData.relationship}
              onValueChange={(value) => updateProfile('relationship', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select relationship status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single">Single</SelectItem>
                <SelectItem value="in_relationship">In a Relationship</SelectItem>
                <SelectItem value="married">Married</SelectItem>
                <SelectItem value="its_complicated">It's Complicated</SelectItem>
                <SelectItem value="prefer_not_to_say">Prefer Not to Say</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Separator />

      <div>
        <h3 className="text-lg font-semibold mb-4">Privacy Controls</h3>
        <div className="space-y-4">
          <div>
            <Label>Who can see your friends list?</Label>
            <Select
              value={privacySettings.friends_list_visibility || 'friends'}
              onValueChange={(value) => updatePrivacySetting('friends_list_visibility', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {privacyOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Who can see the people, Pages, and lists you follow?</Label>
            <Select
              value={privacySettings.following_visibility || 'friends'}
              onValueChange={(value) => updatePrivacySetting('following_visibility', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {privacyOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAudienceSection = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Post Visibility</h3>
        <div className="space-y-4">
          <div>
            <Label>Who can see your future posts?</Label>
            <Select
              value={privacySettings.future_posts_visibility || 'friends'}
              onValueChange={(value) => updatePrivacySetting('future_posts_visibility', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {privacyOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Who can see your stories?</Label>
            <Select
              value={privacySettings.stories_visibility || 'friends'}
              onValueChange={(value) => updatePrivacySetting('stories_visibility', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {privacyOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Separator />

      <div>
        <h3 className="text-lg font-semibold mb-4">Past Posts</h3>
        <div className="space-y-4">
          <div>
            <Label>Limit who can see past posts</Label>
            <Select
              value={privacySettings.past_posts_visibility || 'friends'}
              onValueChange={(value) => updatePrivacySetting('past_posts_visibility', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {privacyOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTaggingSection = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Tag Visibility</h3>
        <div className="space-y-4">
          <div>
            <Label>Who can see posts you're tagged in on your profile?</Label>
            <Select
              value={privacySettings.tagged_posts_visibility || 'friends'}
              onValueChange={(value) => updatePrivacySetting('tagged_posts_visibility', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {privacyOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>When you're tagged in a post, who can be added to the audience?</Label>
            <Select
              value={privacySettings.tag_audience_expansion || 'friends'}
              onValueChange={(value) => updatePrivacySetting('tag_audience_expansion', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {privacyOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Separator />

      <div>
        <h3 className="text-lg font-semibold mb-4">Tag Review</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Review tags friends add before they appear</Label>
              <p className="text-sm text-muted-foreground">Tags will need your approval before showing on your profile</p>
            </div>
            <Switch
              checked={privacySettings.review_tags === 'true'}
              onCheckedChange={(checked) => updatePrivacySetting('review_tags', checked.toString())}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Review posts you're tagged in before they appear on your profile</Label>
              <p className="text-sm text-muted-foreground">Tagged posts will need approval to appear on your timeline</p>
            </div>
            <Switch
              checked={privacySettings.review_tagged_posts === 'true'}
              onCheckedChange={(checked) => updatePrivacySetting('review_tagged_posts', checked.toString())}
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderBlockingSection = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Blocked Users</h3>
        {blockedUsers.length === 0 ? (
          <p className="text-muted-foreground">No blocked users</p>
        ) : (
          <div className="space-y-3">
            {blockedUsers.map((blocked) => (
              <div key={blocked.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={blocked.profiles?.profile_pic || ''} />
                    <AvatarFallback>
                      {blocked.profiles?.display_name?.charAt(0)?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{blocked.profiles?.display_name}</p>
                    <p className="text-sm text-muted-foreground">@{blocked.profiles?.username}</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => unblockUser(blocked.blocked_user_id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Unblock
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderFriendsSection = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Friend Request Settings</h3>
        <div className="space-y-4">
          <div>
            <Label>Who can send you friend requests?</Label>
            <Select
              value={privacySettings.friend_requests_from || 'everyone'}
              onValueChange={(value) => updatePrivacySetting('friend_requests_from', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="everyone">Everyone</SelectItem>
                <SelectItem value="friends_of_friends">Friends of Friends</SelectItem>
                <SelectItem value="no_one">No One</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Separator />

      <div>
        <h3 className="text-lg font-semibold mb-4">Discoverability</h3>
        <div className="space-y-4">
          <div>
            <Label>Who can find your profile using your email address?</Label>
            <Select
              value={privacySettings.findable_by_email || 'friends'}
              onValueChange={(value) => updatePrivacySetting('findable_by_email', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="everyone">Everyone</SelectItem>
                <SelectItem value="friends">Friends</SelectItem>
                <SelectItem value="no_one">No One</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Who can find your profile using your phone number?</Label>
            <Select
              value={privacySettings.findable_by_phone || 'friends'}
              onValueChange={(value) => updatePrivacySetting('findable_by_phone', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="everyone">Everyone</SelectItem>
                <SelectItem value="friends">Friends</SelectItem>
                <SelectItem value="no_one">No One</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Allow search engines to link to your profile</Label>
              <p className="text-sm text-muted-foreground">Let search engines outside of Tone link to your profile</p>
            </div>
            <Switch
              checked={privacySettings.search_engine_indexing === 'true'}
              onCheckedChange={(checked) => updatePrivacySetting('search_engine_indexing', checked.toString())}
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeSection) {
      case 'profile':
        return renderProfileSection();
      case 'audience':
        return renderAudienceSection();
      case 'tagging':
        return renderTaggingSection();
      case 'blocking':
        return renderBlockingSection();
      case 'friends':
        return renderFriendsSection();
      default:
        return renderProfileSection();
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Privacy Checkup
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-6">
          {/* Sidebar */}
          <div className="w-64 space-y-1">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              );
            })}
          </div>

          {/* Content */}
          <div className="flex-1">
            {renderContent()}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PrivacyCheckup;