import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Phone, PhoneOff, Video, X } from 'lucide-react';
import { useCall } from '@/contexts/CallContext';
import { useCallAudio } from '@/hooks/useCallAudio';

export const IncomingCallModal: React.FC = () => {
  const { status, callType, remoteUser, isOutgoing, acceptCall, rejectCall } = useCall();

  // Handle audio for incoming calls
  useCallAudio({ status, isOutgoing });

  const isVisible = status === 'ringing' && !isOutgoing;

  if (!isVisible || !remoteUser) return null;

  return (
    <AnimatePresence>
      <Dialog open={isVisible} onOpenChange={() => {}}>
        <DialogContent 
          className="sm:max-w-md p-0 overflow-hidden bg-gradient-to-b from-tone-purple/20 to-background border-tone-purple/30"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="p-8 flex flex-col items-center"
          >
            {/* Animated ring effect */}
            <div className="relative mb-6">
              <motion.div
                className="absolute inset-0 bg-tone-purple/30 rounded-full"
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.5, 0, 0.5],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
              <motion.div
                className="absolute inset-0 bg-tone-purple/20 rounded-full"
                animate={{
                  scale: [1, 1.8, 1],
                  opacity: [0.3, 0, 0.3],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: 0.5,
                }}
              />
              <Avatar className="w-24 h-24 border-4 border-tone-purple/50 relative z-10">
                <AvatarImage src={remoteUser.profilePic} alt={remoteUser.displayName} />
                <AvatarFallback className="bg-tone-gradient text-white text-2xl">
                  {remoteUser.displayName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>

            {/* Caller info */}
            <h2 className="text-xl font-semibold text-foreground mb-1">
              {remoteUser.displayName}
            </h2>
            <p className="text-sm text-muted-foreground mb-2">
              @{remoteUser.username}
            </p>
            
            {/* Call type indicator */}
            <div className="flex items-center gap-2 mb-8">
              {callType === 'video' ? (
                <Video className="h-5 w-5 text-tone-purple" />
              ) : (
                <Phone className="h-5 w-5 text-tone-purple" />
              )}
              <span className="text-sm text-muted-foreground">
                Incoming {callType} call...
              </span>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-6">
              {/* Reject button */}
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                <Button
                  variant="destructive"
                  size="lg"
                  className="rounded-full w-16 h-16 p-0 shadow-lg"
                  onClick={rejectCall}
                >
                  <PhoneOff className="h-7 w-7" />
                </Button>
              </motion.div>

              {/* Accept button */}
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                <Button
                  size="lg"
                  className="rounded-full w-16 h-16 p-0 bg-green-500 hover:bg-green-600 shadow-lg"
                  onClick={acceptCall}
                >
                  {callType === 'video' ? (
                    <Video className="h-7 w-7" />
                  ) : (
                    <Phone className="h-7 w-7" />
                  )}
                </Button>
              </motion.div>
            </div>

            {/* Decline with message option */}
            <Button
              variant="ghost"
              className="mt-6 text-muted-foreground hover:text-foreground"
              onClick={rejectCall}
            >
              <X className="h-4 w-4 mr-2" />
              Decline
            </Button>
          </motion.div>
        </DialogContent>
      </Dialog>
    </AnimatePresence>
  );
};
