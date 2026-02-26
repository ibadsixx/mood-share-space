import { useParams, useNavigate } from 'react-router-dom';
import { useGroupDetail } from '@/hooks/useGroupDetail';
import { useAuth } from '@/hooks/useAuth';
import { GroupPostComposer } from '@/components/groups/GroupPostComposer';
import { GroupMembersList } from '@/components/groups/GroupMembersList';
import { GroupSettingsDialog } from '@/components/groups/GroupSettingsDialog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, Users, Lock, Globe, UserPlus, UserMinus } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';

const GroupDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    group, members, posts, loading,
    createPost, updateGroup, removeMember, joinGroup, leaveGroup,
  } = useGroupDetail(id);

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Group not found</p>
            <Button variant="link" onClick={() => navigate('/groups')}>Back to Groups</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isAdmin = group.role === 'admin';

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/groups')}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold">{group.name}</h1>
                  {group.privacy === 'private' ? (
                    <Lock className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Globe className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                {group.description && (
                  <p className="text-muted-foreground">{group.description}</p>
                )}
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {group.member_count} members
                  </span>
                  <Badge variant="outline">{group.privacy}</Badge>
                  {group.is_member && group.role && (
                    <Badge variant="secondary">{group.role}</Badge>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                {isAdmin && (
                  <GroupSettingsDialog group={group} onUpdate={updateGroup} />
                )}
                {!group.is_member ? (
                  <Button onClick={joinGroup} size="sm">
                    <UserPlus className="h-4 w-4 mr-1" /> Join
                  </Button>
                ) : !isAdmin ? (
                  <Button onClick={leaveGroup} variant="outline" size="sm">
                    <UserMinus className="h-4 w-4 mr-1" /> Leave
                  </Button>
                ) : null}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Feed */}
        <div className="lg:col-span-2 space-y-4">
          {group.is_member && (
            <GroupPostComposer onPost={createPost} />
          )}

          {posts.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No posts yet. Be the first to post!</p>
              </CardContent>
            </Card>
          ) : (
            posts.map((gp) => (
              <motion.div
                key={gp.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3 mb-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={gp.author?.profile_pic || ''} />
                        <AvatarFallback>{gp.author?.display_name?.[0] || '?'}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{gp.author?.display_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(gp.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">
                      {gp.post?.content || gp.message || ''}
                    </p>
                    {gp.post?.image_url && (
                      <img
                        src={gp.post.image_url}
                        alt="Post"
                        className="mt-3 rounded-lg max-h-96 w-full object-cover"
                      />
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <GroupMembersList
            members={members}
            isAdmin={isAdmin}
            onRemoveMember={removeMember}
          />
        </div>
      </div>
    </div>
  );
};

export default GroupDetail;
