import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Users, Filter } from 'lucide-react';
import { MessageRequestCard } from './MessageRequestCard';
import { useMessageRequests } from '@/hooks/useMessageRequests';

interface MessageRequestsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserId?: string;
}

export const MessageRequestsModal: React.FC<MessageRequestsModalProps> = ({
  open,
  onOpenChange,
  currentUserId
}) => {
  const [activeTab, setActiveTab] = useState('you_may_know');
  
  const {
    youMayKnowRequests,
    spamRequests,
    loading,
    acceptRequest,
    declineRequest,
    blockUser
  } = useMessageRequests(currentUserId);

  const totalRequests = youMayKnowRequests.length + spamRequests.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <span>Message Requests</span>
            {totalRequests > 0 && (
              <Badge variant="secondary">{totalRequests}</Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
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
              <Filter className="h-4 w-4" />
              <span>Filtered</span>
              {spamRequests.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {spamRequests.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="you_may_know" className="mt-4">
            <ScrollArea className="h-[400px] pr-4">
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse">
                      <div className="border border-border rounded-lg p-4">
                        <div className="flex items-start space-x-4">
                          <div className="w-12 h-12 bg-muted rounded-full" />
                          <div className="flex-1 space-y-2">
                            <div className="h-4 bg-muted rounded w-1/3" />
                            <div className="h-3 bg-muted rounded w-1/4" />
                            <div className="flex space-x-2 mt-3">
                              <div className="h-8 bg-muted rounded flex-1" />
                              <div className="h-8 bg-muted rounded flex-1" />
                              <div className="h-8 w-12 bg-muted rounded" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : youMayKnowRequests.length > 0 ? (
                <div className="space-y-4">
                  {youMayKnowRequests.map((request) => (
                    <MessageRequestCard
                      key={request.id}
                      request={request}
                      onAccept={acceptRequest}
                      onDecline={declineRequest}
                      onBlock={blockUser}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    No message requests
                  </h3>
                  <p className="text-muted-foreground">
                    You don't have any message requests from people you may know.
                  </p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="spam" className="mt-4">
            <ScrollArea className="h-[400px] pr-4">
              {loading ? (
                <div className="space-y-4">
                  {[1, 2].map((i) => (
                    <div key={i} className="animate-pulse">
                      <div className="border border-border rounded-lg p-4">
                        <div className="flex items-start space-x-4">
                          <div className="w-12 h-12 bg-muted rounded-full" />
                          <div className="flex-1 space-y-2">
                            <div className="h-4 bg-muted rounded w-1/3" />
                            <div className="h-3 bg-muted rounded w-1/4" />
                            <div className="flex space-x-2 mt-3">
                              <div className="h-8 bg-muted rounded flex-1" />
                              <div className="h-8 bg-muted rounded flex-1" />
                              <div className="h-8 w-12 bg-muted rounded" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : spamRequests.length > 0 ? (
                <div className="space-y-4">
                  {spamRequests.map((request) => (
                    <MessageRequestCard
                      key={request.id}
                      request={request}
                      onAccept={acceptRequest}
                      onDecline={declineRequest}
                      onBlock={blockUser}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Filter className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    No filtered requests
                  </h3>
                  <p className="text-muted-foreground">
                    You don't have any filtered message requests.
                  </p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};