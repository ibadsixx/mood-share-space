import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { ChevronRight, Search, Video, PlayCircle, Eye, SearchIcon, Users, MessageCircle, LayoutGrid, Film, ThumbsUp, UserCheck, KeyRound, Link2, ArrowLeft } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

type CategoryKey =
  | 'live_videos'
  | 'videos_searched'
  | 'videos_watched'
  | 'search_history'
  | 'groups_searched'
  | 'comments'
  | 'group_posts_comments'
  | 'stories_activity'
  | 'pages_likes_interests'
  | 'your_friends'
  | 'login_sessions'
  | 'relationships';

interface CategoryConfig {
  key: CategoryKey;
  label: string;
  icon: React.ReactNode;
  fetchFn: (userId: string) => Promise<ActivityItem[]>;
}

interface ActivityItem {
  id: string;
  description: string;
  timestamp: string;
  metadata?: any;
}

const ActivityLog: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryKey | null>(null);
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [counts, setCounts] = useState<Record<CategoryKey, number>>({} as any);

  // Fetch counts on mount
  useEffect(() => {
    if (user) fetchCounts();
  }, [user]);

  const fetchCounts = async () => {
    if (!user) return;
    const id = user.id;

    const [
      comments,
      groupPosts,
      stories,
      friends,
      pages,
    ] = await Promise.all([
      supabase.from('comments').select('id', { count: 'exact', head: true }).eq('user_id', id),
      supabase.from('group_posts').select('id', { count: 'exact', head: true }).eq('shared_by', id),
      supabase.from('stories').select('id', { count: 'exact', head: true }).eq('user_id', id),
      supabase.from('friends').select('id', { count: 'exact', head: true }).or(`requester_id.eq.${id},receiver_id.eq.${id}`).eq('status', 'accepted'),
      supabase.from('likes').select('id', { count: 'exact', head: true }).eq('user_id', id),
    ]);

    setCounts({
      live_videos: 0,
      videos_searched: 0,
      videos_watched: 0,
      search_history: 0,
      groups_searched: 0,
      comments: comments.count ?? 0,
      group_posts_comments: groupPosts.count ?? 0,
      stories_activity: stories.count ?? 0,
      pages_likes_interests: pages.count ?? 0,
      your_friends: friends.count ?? 0,
      login_sessions: 0,
      relationships: 0,
    });
  };

  const categories: CategoryConfig[] = [
    {
      key: 'live_videos',
      label: 'Your live broadcasts',
      icon: <Video className="h-5 w-5 text-red-500" />,
      fetchFn: async () => [],
    },
    {
      key: 'videos_searched',
      label: 'Clips you\'ve looked up',
      icon: <SearchIcon className="h-5 w-5 text-blue-500" />,
      fetchFn: async () => [],
    },
    {
      key: 'videos_watched',
      label: 'Clips you\'ve viewed',
      icon: <PlayCircle className="h-5 w-5 text-green-500" />,
      fetchFn: async () => [],
    },
    {
      key: 'search_history',
      label: 'Your lookup history',
      icon: <Search className="h-5 w-5 text-muted-foreground" />,
      fetchFn: async () => [],
    },
    {
      key: 'groups_searched',
      label: 'Communities you\'ve explored',
      icon: <Users className="h-5 w-5 text-blue-600" />,
      fetchFn: async () => [],
    },
    {
      key: 'comments',
      label: 'Replies',
      icon: <MessageCircle className="h-5 w-5 text-yellow-500" />,
      fetchFn: async (userId) => {
        const { data } = await supabase
          .from('comments')
          .select('id, content, created_at, post_id')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(50);
        return (data || []).map(c => ({
          id: c.id,
          description: c.content.length > 80 ? c.content.substring(0, 80) + '…' : c.content,
          timestamp: c.created_at,
        }));
      },
    },
    {
      key: 'group_posts_comments',
      label: 'Community posts and replies',
      icon: <LayoutGrid className="h-5 w-5 text-teal-500" />,
      fetchFn: async (userId) => {
        const { data } = await supabase
          .from('group_posts')
          .select('id, message, created_at, groups(name)')
          .eq('shared_by', userId)
          .order('created_at', { ascending: false })
          .limit(50);
        return (data || []).map((gp: any) => ({
          id: gp.id,
          description: `Shared in ${gp.groups?.name || 'a community'}: ${gp.message || 'No caption'}`,
          timestamp: gp.created_at,
        }));
      },
    },
    {
      key: 'stories_activity',
      label: 'Story interactions',
      icon: <Film className="h-5 w-5 text-pink-500" />,
      fetchFn: async (userId) => {
        const { data } = await supabase
          .from('stories')
          .select('id, media_url, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(50);
        return (data || []).map(s => ({
          id: s.id,
          description: 'You shared a story',
          timestamp: s.created_at,
        }));
      },
    },
    {
      key: 'pages_likes_interests',
      label: 'Pages, appreciations and interests',
      icon: <ThumbsUp className="h-5 w-5 text-blue-500" />,
      fetchFn: async (userId) => {
        const { data } = await supabase
          .from('likes')
          .select('id, created_at, post_id')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(50);
        return (data || []).map(l => ({
          id: l.id,
          description: 'You appreciated a post',
          timestamp: l.created_at,
        }));
      },
    },
    {
      key: 'your_friends',
      label: 'Your connections',
      icon: <UserCheck className="h-5 w-5 text-blue-600" />,
      fetchFn: async (userId) => {
        const { data } = await supabase
          .from('friends')
          .select('id, created_at, requester_id, receiver_id')
          .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`)
          .eq('status', 'accepted')
          .order('created_at', { ascending: false })
          .limit(50);
        return (data || []).map(f => ({
          id: f.id,
          description: 'Connection established',
          timestamp: f.created_at,
        }));
      },
    },
    {
      key: 'login_sessions',
      label: 'Active sessions',
      icon: <KeyRound className="h-5 w-5 text-green-600" />,
      fetchFn: async () => [],
    },
    {
      key: 'relationships',
      label: 'Bonds',
      icon: <Link2 className="h-5 w-5 text-pink-600" />,
      fetchFn: async (userId) => {
        const { data } = await supabase
          .from('family_relationships')
          .select('id, relation_type, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(50);
        return (data || []).map(r => ({
          id: r.id,
          description: `${r.relation_type} bond`,
          timestamp: r.created_at,
        }));
      },
    },
  ];

  const handleSelectCategory = useCallback(async (key: CategoryKey) => {
    if (!user) return;
    setSelectedCategory(key);
    setLoading(true);
    try {
      const cat = categories.find(c => c.key === key);
      if (cat) {
        const result = await cat.fetchFn(user.id);
        setItems(result);
      }
    } catch {
      toast({ title: 'Error', description: 'Unable to load activity data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [user]);

  const filteredCategories = categories.filter(c =>
    c.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (selectedCategory) {
    const cat = categories.find(c => c.key === selectedCategory);
    return (
      <div className="space-y-4">
        <button
          onClick={() => setSelectedCategory(null)}
          className="flex items-center gap-2 text-sm text-primary hover:underline mb-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Activity Log
        </button>

        <h2 className="text-xl font-semibold text-foreground">{cat?.label}</h2>
        <Separator />

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-start gap-3 animate-pulse p-3">
                <div className="w-8 h-8 bg-muted rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="text-muted-foreground text-sm py-8 text-center">No records found in this category.</p>
        ) : (
          <ScrollArea className="h-[500px]">
            <div className="space-y-1">
              {items.map(item => (
                <div key={item.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    {cat?.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground">{item.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold text-foreground mb-1">Activity Log</h2>
        <p className="text-sm text-muted-foreground">Browse and manage your interactions across the platform</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search activity log"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <Card className="border-border/50">
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {filteredCategories.map(cat => (
              <button
                key={cat.key}
                onClick={() => handleSelectCategory(cat.key)}
                className="flex items-center gap-4 w-full px-5 py-4 hover:bg-muted/40 transition-colors text-left"
              >
                <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                  {cat.icon}
                </div>
                <span className="flex-1 text-sm font-medium text-foreground">{cat.label}</span>
                {(counts[cat.key] ?? 0) > 0 && (
                  <span className="text-xs text-muted-foreground mr-1">{counts[cat.key]}</span>
                )}
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ActivityLog;
