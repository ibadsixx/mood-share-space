import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  Mic, 
  MicOff, 
  Square, 
  Play, 
  Pause, 
  Trash2, 
  Send,
  Volume2
} from 'lucide-react';
import { useAudioRecorder, AudioRecording } from '@/hooks/useAudioRecorder';
import { cn } from '@/lib/utils';

interface MessageRecorderProps {
  onSendAudio: (recording: AudioRecording) => void;
  onCancel: () => void;
  disabled?: boolean;
}

export const MessageRecorder: React.FC<MessageRecorderProps> = ({
  onSendAudio,
  onCancel,
  disabled = false
}) => {
  const [previewRecording, setPreviewRecording] = useState<AudioRecording | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  const {
    isRecording,
    isPaused,
    recordingTime,
    audioLevel,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    cancelRecording,
    formatTime,
    maxDuration
  } = useAudioRecorder();

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (previewRecording) {
        URL.revokeObjectURL(previewRecording.url);
      }
    };
  }, [previewRecording]);

  const handleStartRecording = async () => {
    const success = await startRecording();
    if (!success) {
      onCancel();
    }
  };

  const handleStopRecording = async () => {
    const recording = await stopRecording();
    if (recording) {
      setPreviewRecording(recording);
    } else {
      onCancel();
    }
  };

  const handleCancelRecording = () => {
    cancelRecording();
    if (previewRecording) {
      URL.revokeObjectURL(previewRecording.url);
      setPreviewRecording(null);
    }
    onCancel();
  };

  const handlePlayPreview = () => {
    if (!audioRef.current || !previewRecording) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  };

  const handleSendRecording = () => {
    if (previewRecording) {
      onSendAudio(previewRecording);
      setPreviewRecording(null);
    }
  };

  const handleRetakeRecording = () => {
    if (previewRecording) {
      URL.revokeObjectURL(previewRecording.url);
      setPreviewRecording(null);
    }
  };

  // Audio element event handlers
  const handleAudioPlay = () => setIsPlaying(true);
  const handleAudioPause = () => setIsPlaying(false);
  const handleAudioEnded = () => setIsPlaying(false);

  const progressPercentage = (recordingTime / maxDuration) * 100;
  const isNearLimit = recordingTime > maxDuration * 0.8;

  return (
    <Card className="p-4 bg-muted border-2 border-primary/20">
      <div className="space-y-4">
        {/* Recording State */}
        {!previewRecording && (
          <>
            {/* Recording Controls */}
            <div className="flex items-center justify-center space-x-4">
              {!isRecording ? (
                <Button
                  onClick={handleStartRecording}
                  disabled={disabled}
                  size="lg"
                  className="h-16 w-16 rounded-full bg-red-500 hover:bg-red-600 text-white"
                >
                  <Mic className="h-8 w-8" />
                </Button>
              ) : (
                <div className="flex items-center space-x-2">
                  {/* Pause/Resume */}
                  <Button
                    onClick={isPaused ? resumeRecording : pauseRecording}
                    variant="outline"
                    size="lg"
                    className="h-12 w-12 rounded-full"
                  >
                    {isPaused ? (
                      <Play className="h-6 w-6" />
                    ) : (
                      <Pause className="h-6 w-6" />
                    )}
                  </Button>

                  {/* Stop */}
                  <Button
                    onClick={handleStopRecording}
                    variant="outline"
                    size="lg"
                    className="h-12 w-12 rounded-full bg-red-500 hover:bg-red-600 text-white border-red-500"
                  >
                    <Square className="h-6 w-6" />
                  </Button>

                  {/* Cancel */}
                  <Button
                    onClick={handleCancelRecording}
                    variant="outline"
                    size="lg"
                    className="h-12 w-12 rounded-full"
                  >
                    <Trash2 className="h-6 w-6" />
                  </Button>
                </div>
              )}
            </div>

            {/* Recording Status */}
            {isRecording && (
              <div className="space-y-3">
                {/* Timer and Status */}
                <div className="flex items-center justify-center space-x-2">
                  <div className={cn(
                    "flex items-center space-x-2",
                    isPaused ? "text-yellow-600" : "text-red-500"
                  )}>
                    <div className={cn(
                      "w-3 h-3 rounded-full",
                      isPaused ? "bg-yellow-500" : "bg-red-500 animate-pulse"
                    )} />
                    <span className={cn(
                      "font-mono text-lg font-semibold",
                      isNearLimit && "text-orange-500"
                    )}>
                      {formatTime(recordingTime)}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      / {formatTime(maxDuration)}
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <Progress 
                  value={progressPercentage} 
                  className={cn(
                    "h-2",
                    isNearLimit && "bg-orange-200"
                  )}
                />

                {/* Audio Level Indicator */}
                <div className="flex items-center justify-center space-x-2">
                  <Volume2 className="h-4 w-4 text-muted-foreground" />
                  <div className="flex space-x-1">
                    {Array.from({ length: 10 }, (_, i) => (
                      <div
                        key={i}
                        className={cn(
                          "w-1 h-4 rounded-full transition-colors",
                          audioLevel * 10 > i ? "bg-green-500" : "bg-muted"
                        )}
                      />
                    ))}
                  </div>
                </div>

                {isPaused && (
                  <p className="text-center text-sm text-yellow-600 font-medium">
                    Recording paused
                  </p>
                )}
              </div>
            )}
          </>
        )}

        {/* Preview State */}
        {previewRecording && (
          <div className="space-y-4">
            <div className="text-center">
              <h4 className="font-medium text-foreground">Voice Message Ready</h4>
              <p className="text-sm text-muted-foreground">
                Duration: {formatTime(previewRecording.duration)}
              </p>
            </div>

            {/* Audio Preview */}
            <div className="flex items-center justify-center">
              <audio
                ref={audioRef}
                src={previewRecording.url}
                onPlay={handleAudioPlay}
                onPause={handleAudioPause}
                onEnded={handleAudioEnded}
                className="hidden"
              />
              <Button
                onClick={handlePlayPreview}
                variant="outline"
                size="lg"
                className="h-12 w-12 rounded-full"
              >
                {isPlaying ? (
                  <Pause className="h-6 w-6" />
                ) : (
                  <Play className="h-6 w-6" />
                )}
              </Button>
            </div>

            {/* Preview Controls */}
            <div className="flex items-center justify-center space-x-2">
              <Button
                onClick={handleRetakeRecording}
                variant="outline"
                size="sm"
                className="flex items-center space-x-2"
              >
                <Mic className="h-4 w-4" />
                <span>Re-record</span>
              </Button>
              <Button
                onClick={handleCancelRecording}
                variant="outline"
                size="sm"
                className="flex items-center space-x-2"
              >
                <Trash2 className="h-4 w-4" />
                <span>Cancel</span>
              </Button>
              <Button
                onClick={handleSendRecording}
                disabled={disabled}
                size="sm"
                className="flex items-center space-x-2"
              >
                <Send className="h-4 w-4" />
                <span>Send</span>
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};