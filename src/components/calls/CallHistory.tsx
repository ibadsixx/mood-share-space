import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { 
  Phone, 
  Video, 
  PhoneIncoming, 
  PhoneOutgoing, 
  PhoneMissed,
  Loader2 
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useCallHistory, CallHistoryItem } from '@/hooks/useCallHistory';
import { useCall } from '@/contexts/CallContext';

const formatDuration = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
};

const getCallIcon = (item: CallHistoryItem) => {
  if (item.status === 'missed' || item.status === 'declined') {
    return <PhoneMissed className="h-4 w-4 text-destructive" />;
  }
  if (item.is_outgoing) {
    return <PhoneOutgoing className="h-4 w-4 text-primary" />;
  }
  return <PhoneIncoming className="h-4 w-4 text-accent-foreground" />;
};

const getCallStatusText = (item: CallHistoryItem): string => {
  switch (item.status) {
    case 'completed':
      return item.is_outgoing ? 'Outgoing call' : 'Incoming call';
    case 'missed':
      return 'Missed call';
    case 'declined':
      return 'Declined';
    case 'busy':
      return 'User was busy';
    case 'failed':
      return 'Call failed';
    default:
      return '';
  }
};

interface CallHistoryProps {
  onClose?: () => void;
}

export const CallHistory: React.FC<CallHistoryProps> = ({ onClose }) => {
  const { callHistory, loading, error } = useCallHistory();
  const { initiateCall, status } = useCall();

  const handleCallBack = (item: CallHistoryItem) => {
    initiateCall(
      item.other_user_id,
      {
        id: item.other_user_id,
        username: item.other_user_username,
        displayName: item.other_user_display_name,
        profilePic: item.other_user_profile_pic || undefined,
      },
      item.call_type
    );
    onClose?.();
  };

  const isInCall = status !== 'idle';

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center text-destructive">
        {error}
      </div>
    );
  }

  if (callHistory.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <Phone className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="font-medium text-foreground mb-1">No call history</h3>
        <p className="text-sm text-muted-foreground">
          Your voice and video calls will appear here
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[400px]">
      <div className="space-y-1 p-2">
        {callHistory.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors group"
          >
            <Avatar className="h-10 w-10">
              <AvatarImage src={item.other_user_profile_pic || undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground">
                {item.other_user_display_name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground truncate">
                  {item.other_user_display_name}
                </span>
                {item.call_type === 'video' && (
                  <Video className="h-3 w-3 text-muted-foreground" />
                )}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {getCallIcon(item)}
                <span>{getCallStatusText(item)}</span>
                {item.status === 'completed' && item.duration_seconds > 0 && (
                  <span>· {formatDuration(item.duration_seconds)}</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(item.started_at), { addSuffix: true })}
              </span>
              
              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleCallBack({ ...item, call_type: 'voice' })}
                  disabled={isInCall}
                >
                  <Phone className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleCallBack({ ...item, call_type: 'video' })}
                  disabled={isInCall}
                >
                  <Video className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
};
