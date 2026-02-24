import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Check, X, Shield, Users } from 'lucide-react';
import { useMessageRequests } from '@/hooks/useMessageRequests';
import { formatDistanceToNow } from 'date-fns';

interface MessageRequestsProps {
  currentUserId: string;
  onBack: () => void;
}

export const MessageRequests: React.FC<MessageRequestsProps> = ({
  currentUserId,
  onBack
}) => {
  const { requests, loading, acceptRequest, declineRequest, blockUser } = useMessageRequests(currentUserId);
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);

  const youMayKnowRequests = requests.filter(req => req.category === 'you_may_know');
  const spamRequests = requests.filter(req => req.category === 'spam');

  const handleAccept = async (requestId: string, senderId: string) => {
    setProcessingRequest(requestId);
    await acceptRequest(requestId, senderId);
    setProcessingRequest(null);
  };

  const handleDecline = async (requestId: string) => {
    setProcessingRequest(requestId);
    await declineRequest(requestId);
    setProcessingRequest(null);
  };

  const handleBlock = async (requestId: string, senderId: string) => {
    setProcessingRequest(requestId);
    await blockUser(requestId, senderId);
    setProcessingRequest(null);
  };

  const RequestCard = ({ request }: { request: any }) => (
    <Card key={request.id} className="mb-3">
      <CardContent className="p-4">
        <div className="flex items-start space-x-3">
          <Avatar className="w-12 h-12">
            <AvatarImage
              src={request.sender_profile?.profile_pic}
              alt={request.sender_profile?.display_name}
            />
            <AvatarFallback className="bg-primary text-primary-foreground">
              {request.sender_profile?.display_name?.charAt(0)?.toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-foreground">
                {request.sender_profile?.display_name}
              </h3>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
              </span>
            </div>

            <p className="text-sm text-muted-foreground mb-2">
              @{request.sender_profile?.username}
            </p>

            {request.mutual_friends_count > 0 && (
              <div className="flex items-center space-x-1 mb-3">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {request.mutual_friends_count} mutual friend{request.mutual_friends_count !== 1 ? 's' : ''}
                </span>
              </div>
            )}

            <div className="flex space-x-2">
              <Button
                size="sm"
                onClick={() => handleAccept(request.id, request.sender_id)}
                disabled={processingRequest === request.id}
                className="flex items-center space-x-1"
              >
                <Check className="h-4 w-4" />
                <span>Accept</span>
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDecline(request.id)}
                disabled={processingRequest === request.id}
                className="flex items-center space-x-1"
              >
                <X className="h-4 w-4" />
                <span>Decline</span>
              </Button>
              
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleBlock(request.id, request.sender_id)}
                disabled={processingRequest === request.id}
                className="flex items-center space-x-1"
              >
                <Shield className="h-4 w-4" />
                <span>Block</span>
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="h-screen flex bg-background">
        <div className="flex-1 p-6">
          <div className="mb-6">
            <Button variant="ghost" onClick={onBack} className="mb-4">
              ← Back to Messages
            </Button>
            <h1 className="text-2xl font-bold">Message Requests</h1>
          </div>
          
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-muted rounded-full" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded w-1/3" />
                      <div className="h-3 bg-muted rounded w-1/4" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-background">
      <div className="flex-1 p-6">
        <div className="mb-6">
          <Button variant="ghost" onClick={onBack} className="mb-4">
            ← Back to Messages
          </Button>
          <h1 className="text-2xl font-bold">Message Requests</h1>
          <p className="text-muted-foreground">
            Review and manage incoming message requests
          </p>
        </div>

        <Tabs defaultValue="you_may_know" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="you_may_know" className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>You may know</span>
              {youMayKnowRequests.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {youMayKnowRequests.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="spam" className="flex items-center space-x-2">
              <Shield className="h-4 w-4" />
              <span>Spam</span>
              {spamRequests.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {spamRequests.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="you_may_know">
            <ScrollArea className="h-[calc(100vh-12rem)]">
              {youMayKnowRequests.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No requests from people you may know</h3>
                    <p className="text-muted-foreground">
                      When someone with mutual friends sends you a message request, it will appear here.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div>
                  {youMayKnowRequests.map((request) => (
                    <RequestCard key={request.id} request={request} />
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="spam">
            <ScrollArea className="h-[calc(100vh-12rem)]">
              {spamRequests.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No spam requests</h3>
                    <p className="text-muted-foreground">
                      Message requests from people you don't know will appear here.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div>
                  {spamRequests.map((request) => (
                    <RequestCard key={request.id} request={request} />
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};