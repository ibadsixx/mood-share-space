import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  Square,
  Play,
  Pause,
  Trash2,
  Send,
  Volume2,
  Mic
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

  useEffect(() => {
    const init = async () => {
      const success = await startRecording();
      if (!success) {
        onCancel();
      }
    };
    init();
  }, []);

  useEffect(() => {
    return () => {
      if (previewRecording) {
        URL.revokeObjectURL(previewRecording.url);
      }
    };
  }, [previewRecording]);

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

  const handleAudioPlay = () => setIsPlaying(true);
  const handleAudioPause = () => setIsPlaying(false);
  const handleAudioEnded = () => setIsPlaying(false);

  const progressPercentage = (recordingTime / maxDuration) * 100;
  const isNearLimit = recordingTime > maxDuration * 0.8;
  const canSend = !!previewRecording && !disabled;

  return (
    <Card className="p-3 bg-muted border-2 border-primary/20">
      <div className="flex items-center gap-2">
        {/* Left: Trash */}
        <Button
          onClick={handleCancelRecording}
          variant="ghost"
          size="sm"
          className="h-9 w-9 p-0 shrink-0 text-muted-foreground hover:text-destructive"
          title="Discard"
        >
          <Trash2 className="h-4 w-4" />
        </Button>

        {/* Center: Recording / Preview controls */}
        <div className="flex-1 flex items-center justify-center gap-2 min-w-0">
          {!previewRecording ? (
            <>
              {/* Pause / Resume */}
              <Button
                onClick={isPaused ? resumeRecording : pauseRecording}
                variant="outline"
                size="sm"
                className="h-9 w-9 rounded-full shrink-0"
              >
                {isPaused ? (
                  <Play className="h-4 w-4" />
                ) : (
                  <Pause className="h-4 w-4" />
                )}
              </Button>

              {/* Stop */}
              <Button
                onClick={handleStopRecording}
                variant="outline"
                size="sm"
                className="h-9 w-9 rounded-full shrink-0 bg-red-500 hover:bg-red-600 text-white border-red-500"
              >
                <Square className="h-4 w-4" />
              </Button>

              {/* Timer */}
              <div className={cn(
                "flex items-center gap-1 font-mono text-sm shrink-0",
                isPaused ? "text-yellow-600" : "text-red-500"
              )}>
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  isPaused ? "bg-yellow-500" : "bg-red-500 animate-pulse"
                )} />
                {formatTime(recordingTime)}
                <span className="text-muted-foreground">/ {formatTime(maxDuration)}</span>
              </div>

              {/* Audio Level */}
              <div className="flex items-center gap-1 shrink-0">
                <Volume2 className="h-3 w-3 text-muted-foreground" />
                <div className="flex gap-[2px]">
                  {Array.from({ length: 6 }, (_, i) => (
                    <div
                      key={i}
                      className={cn(
                        "w-0.5 h-3 rounded-full transition-colors",
                        audioLevel * 6 > i ? "bg-green-500" : "bg-muted-foreground/20"
                      )}
                    />
                  ))}
                </div>
              </div>

              {/* Compact Progress Bar */}
              <div className="flex-1 max-w-[80px] hidden sm:block">
                <div className="h-1.5 bg-muted-foreground/20 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      isNearLimit ? "bg-orange-500" : "bg-red-500"
                    )}
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
              </div>

              {isPaused && (
                <span className="text-xs text-yellow-600 font-medium shrink-0">Paused</span>
              )}
            </>
          ) : (
            <>
              {/* Preview: Play/Pause */}
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
                size="sm"
                className="h-9 w-9 rounded-full shrink-0"
              >
                {isPlaying ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
              </Button>

              {/* Preview Timer */}
              <div className="flex items-center gap-1 font-mono text-sm text-foreground shrink-0">
                <Mic className="h-3 w-3 text-muted-foreground" />
                {formatTime(previewRecording.duration)}
              </div>
            </>
          )}
        </div>

        {/* Right: Send */}
        <Button
          onClick={handleSendRecording}
          disabled={!canSend}
          size="sm"
          className="h-9 w-9 p-0 shrink-0"
          title="Send"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
};
