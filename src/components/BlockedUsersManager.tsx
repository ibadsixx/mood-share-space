import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserX, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';

interface BlockedUser {
  id: string;
  blocked_id: string;
  created_at: string;
  blocked_user: {
    id: string;
    username: string;
    display_name: string;
    profile_pic: string | null;
  };
}

const BlockedUsersManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBlockedUsers = async () => {
    if (!user?.id) return;

    try {
      // First get the blocks
      const { data: blocks, error: blocksError } = await supabase
        .from('blocks')
        .select('id, blocked_id, created_at')
        .eq('blocker_id', user.id)
        .order('created_at', { ascending: false });

      if (blocksError) throw blocksError;

      if (!blocks || blocks.length === 0) {
        setBlockedUsers([]);
        return;
      }

      // Then get the profile information for blocked users
      const blockedIds = blocks.map(block => block.blocked_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, display_name, profile_pic')
        .in('id', blockedIds);

      if (profilesError) throw profilesError;

      // Combine the data
      const combinedData = blocks.map(block => {
        const profile = profiles?.find(p => p.id === block.blocked_id);
        return {
          ...block,
          blocked_user: profile || {
            id: block.blocked_id,
            username: 'unknown',
            display_name: 'Unknown User',
            profile_pic: null
          }
        };
      });

      setBlockedUsers(combinedData);
    } catch (error: any) {
      console.error('Error fetching blocked users:', error);
      toast({
        title: 'Error',
        description: 'Failed to load blocked users',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const unblockUser = async (blockId: string, username: string) => {
    try {
      const { error } = await supabase
        .from('blocks')
        .delete()
        .eq('id', blockId);

      if (error) throw error;

      setBlockedUsers(prev => prev.filter(block => block.id !== blockId));
      
      toast({
        title: 'User unblocked',
        description: `@${username} has been unblocked successfully.`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to unblock user.',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    fetchBlockedUsers();
  }, [user?.id]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserX className="h-5 w-5" />
            Blocked Users
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">
            Loading blocked users...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserX className="h-5 w-5 text-destructive" />
          Blocked Users
        </CardTitle>
        <CardDescription>
          Manage users you have blocked. Blocked users cannot see your profile, posts, or interact with you.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {blockedUsers.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No blocked users</h3>
            <p className="text-muted-foreground">You haven't blocked anyone yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {blockedUsers.map((block) => (
                <motion.div
                  key={block.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center justify-between p-4 border border-border rounded-lg bg-card/50"
                >
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={block.blocked_user.profile_pic || undefined} />
                      <AvatarFallback className="bg-muted">
                        {block.blocked_user.display_name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-foreground">
                        {block.blocked_user.display_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        @{block.blocked_user.username}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">
                        Blocked {new Date(block.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => unblockUser(block.id, block.blocked_user.username)}
                      className="hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20"
                    >
                      Unblock
                    </Button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BlockedUsersManager;