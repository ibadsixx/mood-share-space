import React from 'react';
import { Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Check, X, Ban } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

type MessageRequest = {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: 'pending' | 'accepted' | 'declined' | 'blocked';
  category: 'you_may_know' | 'spam';
  created_at: string;
  updated_at: string;
  sender_profile?: {
    username: string;
    display_name: string;
    profile_pic?: string;
  };
  mutual_friends_count?: number;
};

interface MessageRequestCardProps {
  request: MessageRequest;
  onAccept: (requestId: string, senderId: string) => Promise<boolean>;
  onDecline: (requestId: string) => Promise<boolean>;
  onBlock: (requestId: string, senderId: string) => Promise<boolean>;
}

export const MessageRequestCard: React.FC<MessageRequestCardProps> = ({
  request,
  onAccept,
  onDecline,
  onBlock
}) => {
  const [loading, setLoading] = React.useState(false);

  const handleAccept = async () => {
    setLoading(true);
    await onAccept(request.id, request.sender_id);
    setLoading(false);
  };

  const handleDecline = async () => {
    setLoading(true);
    await onDecline(request.id);
    setLoading(false);
  };

  const handleBlock = async () => {
    setLoading(true);
    await onBlock(request.id, request.sender_id);
    setLoading(false);
  };

  const senderProfile = request.sender_profile;
  if (!senderProfile) return null;

  return (
    <Card className="border-border hover:bg-accent/50 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start space-x-4">
          {/* Avatar */}
          <Link to={`/profile/${senderProfile.username}`}>
            <Avatar className="w-12 h-12 cursor-pointer hover:ring-2 hover:ring-primary transition-all">
              <AvatarImage
                src={senderProfile.profile_pic}
                alt={senderProfile.display_name}
              />
              <AvatarFallback className="bg-primary text-primary-foreground">
                {senderProfile.display_name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </Link>

          {/* Request Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <div>
                <Link to={`/profile/${senderProfile.username}`} className="hover:underline">
                  <h3 className="font-medium text-foreground">
                    {senderProfile.display_name}
                  </h3>
                </Link>
                <Link to={`/profile/${senderProfile.username}`} className="hover:underline">
                  <p className="text-sm text-muted-foreground">
                    @{senderProfile.username}
                  </p>
                </Link>
              </div>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(request.created_at), {
                  addSuffix: true
                })}
              </span>
            </div>

            {/* Mutual Friends */}
            {request.mutual_friends_count !== undefined && request.mutual_friends_count > 0 && (
              <div className="flex items-center space-x-1 mb-3">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {request.mutual_friends_count} mutual friend{request.mutual_friends_count > 1 ? 's' : ''}
                </span>
              </div>
            )}

            {/* Category Badge */}
            <div className="mb-3">
              <Badge 
                variant={request.category === 'you_may_know' ? 'default' : 'secondary'}
                className="text-xs"
              >
                {request.category === 'you_may_know' ? 'You may know' : 'Filtered'}
              </Badge>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-2">
              <Button
                onClick={handleAccept}
                disabled={loading}
                size="sm"
                className="flex-1"
              >
                <Check className="h-4 w-4 mr-1" />
                Accept
              </Button>
              <Button
                onClick={handleDecline}
                disabled={loading}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                <X className="h-4 w-4 mr-1" />
                Decline
              </Button>
              <Button
                onClick={handleBlock}
                disabled={loading}
                variant="destructive"
                size="sm"
              >
                <Ban className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};