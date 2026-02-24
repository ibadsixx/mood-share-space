import { CallType } from '@/services/webrtc';

export type CallStatusDb = 'completed' | 'missed' | 'declined' | 'busy' | 'failed';
export type CallStatus = 'idle' | 'calling' | 'ringing' | 'connecting' | 'connected' | 'ended';

export interface CallParticipant {
  id: string;
  username: string;
  displayName: string;
  profilePic?: string;
}

export interface CallState {
  status: CallStatus;
  callType: CallType | null;
  isOutgoing: boolean;
  remoteUser: CallParticipant | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isMuted: boolean;
  isVideoOff: boolean;
  isMinimized: boolean;
  callDuration: number;
  connectionQuality: ConnectionQuality;
}

export interface ConnectionQuality {
  level: 'excellent' | 'good' | 'fair' | 'poor' | 'unknown';
  packetLoss: number;
  roundTripTime: number;
  jitter: number;
}

export interface CallContextType extends CallState {
  initiateCall: (userId: string, userInfo: CallParticipant, callType: CallType) => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: () => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleVideo: () => void;
  toggleMinimize: () => void;
}

export const initialConnectionQuality: ConnectionQuality = {
  level: 'unknown',
  packetLoss: 0,
  roundTripTime: 0,
  jitter: 0,
};

export const initialCallState: CallState = {
  status: 'idle',
  callType: null,
  isOutgoing: false,
  remoteUser: null,
  localStream: null,
  remoteStream: null,
  isMuted: false,
  isVideoOff: false,
  isMinimized: false,
  callDuration: 0,
  connectionQuality: initialConnectionQuality,
};
