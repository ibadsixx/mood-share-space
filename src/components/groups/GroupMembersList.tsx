import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserMinus, Users } from 'lucide-react';
import { GroupMember } from '@/hooks/useGroupDetail';
import { useAuth } from '@/hooks/useAuth';

interface GroupMembersListProps {
  members: GroupMember[];
  isAdmin: boolean;
  onRemoveMember?: (userId: string) => void;
}

export const GroupMembersList = ({ members, isAdmin, onRemoveMember }: GroupMembersListProps) => {
  const { user } = useAuth();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="h-5 w-5" />
          Members ({members.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {members.map((member) => (
          <div key={member.user_id} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9">
                <AvatarImage src={member.profile?.profile_pic || ''} />
                <AvatarFallback>{member.profile?.display_name?.[0] || '?'}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">{member.profile?.display_name || 'Unknown'}</p>
                <p className="text-xs text-muted-foreground">@{member.profile?.username}</p>
              </div>
              {member.role === 'admin' && (
                <Badge variant="secondary" className="text-xs">Admin</Badge>
              )}
              {member.role === 'moderator' && (
                <Badge variant="outline" className="text-xs">Mod</Badge>
              )}
            </div>
            {isAdmin && member.user_id !== user?.id && member.role !== 'admin' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemoveMember?.(member.user_id)}
              >
                <UserMinus className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
