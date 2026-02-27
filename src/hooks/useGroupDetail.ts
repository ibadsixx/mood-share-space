import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export interface GroupMember {
  user_id: string;
  role: 'admin' | 'moderator' | 'member';
  created_at: string;
  profile?: {
    username: string;
    display_name: string;
    profile_pic: string | null;
  };
}

export interface GroupPost {
  id: string;
  message: string | null;
  created_at: string;
  shared_by: string;
  post_id: string;
  post?: {
    id: string;
    content: string | null;
    image_url: string | null;
    created_at: string;
    user_id: string;
  };
  author?: {
    username: string;
    display_name: string;
    profile_pic: string | null;
  };
}

export interface GroupDetail {
  id: string;
  name: string;
  description: string | null;
  privacy: string;
  invite_followers: boolean;
  created_at: string;
  created_by: string | null;
  member_count: number;
  is_member: boolean;
  role?: 'admin' | 'moderator' | 'member';
}

export const useGroupDetail = (groupId: string | undefined) => {
  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [posts, setPosts] = useState<GroupPost[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchGroup = useCallback(async () => {
    if (!groupId) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('groups')
        .select(`
          *,
          group_members!group_members_group_id_fkey (
            user_id,
            role,
            created_at
          )
        `)
        .eq('id', groupId)
        .single();

      if (error) throw error;

      const memberCount = data.group_members?.length || 0;
      const userMembership = user ? data.group_members?.find((m: any) => m.user_id === user.id) : null;

      setGroup({
        id: data.id,
        name: data.name,
        description: data.description,
        privacy: data.privacy,
        invite_followers: data.invite_followers,
        created_at: data.created_at,
        created_by: data.created_by,
        member_count: memberCount,
        is_member: !!userMembership,
        role: userMembership?.role as any,
      });
    } catch (error: any) {
      toast({ title: 'Error', description: 'Failed to load group', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [groupId, user]);

  const fetchMembers = useCallback(async () => {
    if (!groupId) return;
    const { data, error } = await supabase
      .from('group_members')
      .select('user_id, role, created_at')
      .eq('group_id', groupId);

    if (error) return;

    // Fetch profiles for members
    const userIds = data.map((m: any) => m.user_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, display_name, profile_pic')
      .in('id', userIds);

    const profileMap = new Map(profiles?.map((p: any) => [p.id, p]) || []);
    setMembers(data.map((m: any) => ({
      ...m,
      profile: profileMap.get(m.user_id),
    })));
  }, [groupId]);

  const fetchPosts = useCallback(async () => {
    if (!groupId) return;
    const { data, error } = await supabase
      .from('group_posts')
      .select(`
        id, message, created_at, shared_by, post_id,
        posts!group_posts_post_id_fkey (
          id, content, image_url, created_at, user_id
        )
      `)
      .eq('group_id', groupId)
      .order('created_at', { ascending: false });

    if (error) return;

    // Fetch author profiles
    const authorIds = [...new Set(data.map((p: any) => p.shared_by))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, display_name, profile_pic')
      .in('id', authorIds);

    const profileMap = new Map(profiles?.map((p: any) => [p.id, p]) || []);
    setPosts(data.map((p: any) => ({
      ...p,
      post: p.posts,
      author: profileMap.get(p.shared_by),
    })));
  }, [groupId]);

  const createPost = async (content: string) => {
    if (!user || !groupId) return;
    try {
      // Create a post first
      const { data: newPost, error: postError } = await supabase
        .from('posts')
        .insert({ user_id: user.id, content })
        .select()
        .single();

      if (postError) throw postError;

      // Link it to the group
      const { error: linkError } = await supabase
        .from('group_posts')
        .insert({ group_id: groupId, post_id: newPost.id, shared_by: user.id });

      if (linkError) throw linkError;

      toast({ title: 'Posted!', description: 'Your post has been shared to the group.' });
      fetchPosts();
    } catch (error: any) {
      toast({ title: 'Error', description: 'Failed to create post', variant: 'destructive' });
    }
  };

  const updateGroup = async (updates: { name?: string; description?: string; privacy?: string }) => {
    if (!groupId) return;
    try {
      const { error } = await supabase
        .from('groups')
        .update(updates)
        .eq('id', groupId);

      if (error) throw error;
      toast({ title: 'Updated', description: 'Group settings saved.' });
      fetchGroup();
    } catch (error: any) {
      toast({ title: 'Error', description: 'Failed to update group', variant: 'destructive' });
    }
  };

  const removeMember = async (userId: string) => {
    if (!groupId) return;
    try {
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', userId);

      if (error) throw error;
      toast({ title: 'Removed', description: 'Member removed from group.' });
      fetchMembers();
      fetchGroup();
    } catch (error: any) {
      toast({ title: 'Error', description: 'Failed to remove member', variant: 'destructive' });
    }
  };

  const joinGroup = async () => {
    if (!user || !groupId) return;
    try {
      const { error } = await supabase
        .from('group_members')
        .insert({ group_id: groupId, user_id: user.id, role: 'member' });

      if (error) throw error;
      toast({ title: 'Joined!', description: 'You joined the group.' });
      fetchGroup();
      fetchMembers();
    } catch (error: any) {
      toast({ title: 'Error', description: 'Failed to join group', variant: 'destructive' });
    }
  };

  const leaveGroup = async () => {
    if (!user || !groupId) return;
    try {
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', user.id);

      if (error) throw error;
      toast({ title: 'Left', description: 'You left the group.' });
      fetchGroup();
      fetchMembers();
    } catch (error: any) {
      toast({ title: 'Error', description: 'Failed to leave group', variant: 'destructive' });
    }
  };

  useEffect(() => {
    if (groupId) {
      fetchGroup();
      fetchMembers();
      fetchPosts();
    }
  }, [groupId, user]);

  return {
    group, members, posts, loading,
    createPost, updateGroup, removeMember, joinGroup, leaveGroup,
    refetch: () => { fetchGroup(); fetchMembers(); fetchPosts(); },
  };
};
