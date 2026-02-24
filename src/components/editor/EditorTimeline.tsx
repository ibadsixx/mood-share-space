import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Video, Music, Image, Type, Smile, Trash2, Scissors, ZoomIn, ZoomOut, Upload, GripVertical, Loader2 } from 'lucide-react';
import { EditorProject } from '@/hooks/useEditorProject';
import { VideoLayer, AudioTrack, EmojiLayer, TextLayer, ImageLayer } from '@/types/editor';
import { toast } from '@/hooks/use-toast';
import { uploadVideo, getVideoMetadata } from '@/lib/storage';
import { useAuth } from '@/hooks/useAuth';
import { VideoPlayer } from '@/lib/player';

interface EditorTimelineProps {
  isPlaying: boolean;
  project: EditorProject | null;
  currentTime: number;
  onSeek: (time: number) => void;
  onScrubStart: () => void;
  onScrubEnd: () => void;
  videoLayers: VideoLayer[];
  audioTrack: AudioTrack | null;
  emojiLayers: EmojiLayer[];
  textLayers: TextLayer[];
  imageLayers: ImageLayer[];
  onLayerUpdate: (type: string, id: string, updates: any) => void;
  onLayerDelete: (type: string, id: string) => void;
  selectedLayerId: string | null;
  onLayerSelect: (type: string | null, id: string | null) => void;
  onAddVideo?: (video: Omit<VideoLayer, 'id'>) => void;
  onAddImage?: (image: Omit<ImageLayer, 'id'>) => void;
  duration: number;
  clipStart: number;
  clipEnd: number;
  onTrimStartChange: (value: number) => void;
  onTrimEndChange: (value: number) => void;
  player: VideoPlayer | null;
}

export function EditorTimeline({ 
  isPlaying, 
  project,
  currentTime,
  onSeek,
  onScrubStart,
  onScrubEnd,
  videoLayers,
  audioTrack,
  emojiLayers,
  textLayers,
  imageLayers,
  onLayerUpdate,
  onLayerDelete,
  selectedLayerId,
  onLayerSelect,
  onAddVideo,
  onAddImage,
  duration,
  clipStart,
  clipEnd,
  onTrimStartChange,
  onTrimEndChange,
  player,
}: EditorTimelineProps) {
  const timelineRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const playheadRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  
  const [scale, setScale] = useState(80);
  const MIN_SCALE = 20;
  const MAX_SCALE = 200;
  
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);
  const [draggingHandle, setDraggingHandle] = useState<{ type: string; id: string; handle: 'start' | 'end' | 'move' } | null>(null);
  const [dragStartData, setDragStartData] = useState<{ mouseX: number; originalStart: number; originalEnd: number } | null>(null);
  
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const { user } = useAuth();
  
  const timelineWidth = Math.max(duration * scale, 800);

  useEffect(() => {
    if (!isPlaying) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    const updatePlayheadScroll = () => {
      if (scrollContainerRef.current && playheadRef.current) {
        const container = scrollContainerRef.current;
        const playheadX = currentTime * scale;
        const containerWidth = container.clientWidth;
        const scrollLeft = container.scrollLeft;
        
        if (playheadX > scrollLeft + containerWidth - 150) {
          container.scrollLeft = playheadX - containerWidth / 2;
        } else if (playheadX < scrollLeft + 100) {
          container.scrollLeft = Math.max(0, playheadX - 100);
        }
      }
      animationFrameRef.current = requestAnimationFrame(updatePlayheadScroll);
    };

    animationFrameRef.current = requestAnimationFrame(updatePlayheadScroll);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, currentTime, scale]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 10);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms}`;
  };

  const handleTimelineClick = useCallback((e: React.MouseEvent) => {
    if (isDraggingPlayhead || draggingHandle) return;
    if (!scrollContainerRef.current) return;
    
    const container = scrollContainerRef.current;
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left + container.scrollLeft - 88;
    const time = Math.max(0, Math.min(duration, x / scale));
    
    console.log('[Timeline] Click seek to:', time.toFixed(2));
    onSeek(time);
  }, [isDraggingPlayhead, draggingHandle, duration, scale, onSeek]);

  const handlePlayheadMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsDraggingPlayhead(true);
    onScrubStart();
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!scrollContainerRef.current) return;
      const container = scrollContainerRef.current;
      const rect = container.getBoundingClientRect();
      const x = moveEvent.clientX - rect.left + container.scrollLeft - 88;
      const time = Math.max(0, Math.min(duration, x / scale));
      onSeek(time);
    };
    
    const handleMouseUp = () => {
      setIsDraggingPlayhead(false);
      onScrubEnd();
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [duration, scale, onSeek, onScrubStart, onScrubEnd]);

  const handleTrimStart = useCallback((e: React.MouseEvent, type: string, id: string, handle: 'start' | 'end' | 'move', layer: any) => {
    e.stopPropagation();
    e.preventDefault();
    
    setDraggingHandle({ type, id, handle });
    setDragStartData({
      mouseX: e.clientX,
      originalStart: layer.start ?? layer.startAt ?? 0,
      originalEnd: layer.end ?? layer.endAt ?? layer.duration ?? 10,
    });
    
    console.log('[Timeline] Start trim:', type, id, handle);
  }, []);

  useEffect(() => {
    if (!draggingHandle || !dragStartData) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!scrollContainerRef.current) return;
      
      const deltaX = e.clientX - dragStartData.mouseX;
      const deltaTime = deltaX / scale;
      
      if (draggingHandle.type === 'audio') {
        if (audioTrack) {
          if (draggingHandle.handle === 'start') {
            const newStart = Math.max(0, Math.min(dragStartData.originalStart + deltaTime, dragStartData.originalEnd - 0.5));
            onLayerUpdate('audio', draggingHandle.id, { startAt: newStart });
          } else if (draggingHandle.handle === 'end') {
            const newEnd = Math.max(dragStartData.originalStart + 0.5, dragStartData.originalEnd + deltaTime);
            onLayerUpdate('audio', draggingHandle.id, { endAt: newEnd });
          }
        }
        return;
      }

      let layer: any;
      switch (draggingHandle.type) {
        case 'video':
          layer = videoLayers.find(l => l.id === draggingHandle.id);
          break;
        case 'emoji':
          layer = emojiLayers.find(l => l.id === draggingHandle.id);
          break;
        case 'text':
          layer = textLayers.find(l => l.id === draggingHandle.id);
          break;
        case 'image':
          layer = imageLayers.find(l => l.id === draggingHandle.id);
          break;
      }

      if (!layer) return;

      if (draggingHandle.handle === 'start') {
        const newStart = Math.max(0, Math.min(dragStartData.originalStart + deltaTime, dragStartData.originalEnd - 0.5));
        onLayerUpdate(draggingHandle.type, draggingHandle.id, { start: newStart });
      } else if (draggingHandle.handle === 'end') {
        const newEnd = Math.max(dragStartData.originalStart + 0.5, Math.min(duration + 10, dragStartData.originalEnd + deltaTime));
        onLayerUpdate(draggingHandle.type, draggingHandle.id, { end: newEnd });
      } else if (draggingHandle.handle === 'move') {
        const clipDuration = dragStartData.originalEnd - dragStartData.originalStart;
        const newStart = Math.max(0, dragStartData.originalStart + deltaTime);
        const newEnd = newStart + clipDuration;
        onLayerUpdate(draggingHandle.type, draggingHandle.id, { start: newStart, end: newEnd });
      }
    };

    const handleMouseUp = () => {
      console.log('[Timeline] End trim');
      setDraggingHandle(null);
      setDragStartData(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingHandle, dragStartData, scale, duration, videoLayers, emojiLayers, textLayers, imageLayers, audioTrack, onLayerUpdate]);

  const handleZoomIn = useCallback(() => {
    setScale(prev => Math.min(MAX_SCALE, prev + 20));
  }, []);

  const handleZoomOut = useCallback(() => {
    setScale(prev => Math.max(MIN_SCALE, prev - 20));
  }, []);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -10 : 10;
        setScale(prev => Math.max(MIN_SCALE, Math.min(MAX_SCALE, prev + delta)));
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, []);

  const handleSplitAtPlayhead = useCallback(() => {
    const clipToSplit = videoLayers.find(layer => 
      currentTime > layer.start && currentTime < layer.end
    );
    
    if (!clipToSplit) {
      toast({
        title: 'No clip at playhead',
        description: 'Position the playhead within a clip to split it.',
      });
      return;
    }

    onLayerUpdate('video', clipToSplit.id, { end: currentTime });
    
    if (onAddVideo) {
      const secondHalf: Omit<VideoLayer, 'id'> = {
        type: 'video',
        src: clipToSplit.src,
        fileName: clipToSplit.fileName + ' (split)',
        start: currentTime,
        end: clipToSplit.end,
        duration: clipToSplit.end - currentTime,
        volume: clipToSplit.volume,
        position: clipToSplit.position,
        scale: clipToSplit.scale,
        rotation: clipToSplit.rotation,
        filter: clipToSplit.filter,
      };
      onAddVideo(secondHalf);
    }
    
    toast({
      title: 'Clip split',
      description: `Split at ${formatTime(currentTime)}`,
    });
  }, [currentTime, videoLayers, onLayerUpdate, onAddVideo]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = scrollContainerRef.current?.getBoundingClientRect();
    if (rect && (
      e.clientX < rect.left || 
      e.clientX > rect.right || 
      e.clientY < rect.top || 
      e.clientY > rect.bottom
    )) {
      setIsDragOver(false);
    }
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (!user?.id) {
      toast({
        title: 'Not authenticated',
        description: 'Please log in to add videos.',
        variant: 'destructive',
      });
      return;
    }

    const files = Array.from(e.dataTransfer.files);
    const videoFile = files.find(f => f.type.startsWith('video/'));
    
    if (!videoFile) {
      toast({
        title: 'Invalid file',
        description: 'Please drop a video file.',
        variant: 'destructive',
      });
      return;
    }

    console.log('[EditorTimeline] Video dropped:', videoFile.name);
    setIsUploading(true);
    
    try {
      const { publicUrl } = await uploadVideo(videoFile, user.id, { folder: 'clips' });
      console.log('[EditorTimeline] ✅ UPLOAD COMPLETE:', publicUrl);

      const metadata = await getVideoMetadata(publicUrl);
      
      const lastClipEnd = videoLayers.reduce((max, layer) => Math.max(max, layer.end), 0);
      
      const newVideo: Omit<VideoLayer, 'id'> = {
        type: 'video',
        src: publicUrl,
        fileName: videoFile.name,
        start: lastClipEnd,
        end: lastClipEnd + metadata.duration,
        duration: metadata.duration,
        volume: 1,
        position: { x: 50, y: 50 },
        scale: 1,
        rotation: 0,
        filter: {
          brightness: 100,
          contrast: 100,
          saturation: 100,
          temperature: 0,
          blur: 0,
        },
      };
      
      if (onAddVideo) {
        onAddVideo(newVideo);
        toast({
          title: 'Video added',
          description: `${videoFile.name} added to timeline (${metadata.duration.toFixed(1)}s)`,
        });
      }
    } catch (error) {
      console.error('[EditorTimeline] ❌ Upload failed:', error);
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Failed to upload video.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  }, [user?.id, videoLayers, onAddVideo]);

  const getTimeMarkerInterval = useCallback(() => {
    if (scale >= 150) return 0.5;
    if (scale >= 80) return 1;
    if (scale >= 40) return 2;
    return 5;
  }, [scale]);

  const timeMarkerInterval = getTimeMarkerInterval();
  const timeMarkers: number[] = [];
  for (let i = 0; i <= duration + 5; i += timeMarkerInterval) {
    timeMarkers.push(i);
  }

  const renderClip = useCallback((
    layer: { id: string; start: number; end: number; [key: string]: any },
    type: string,
    label: string,
    bgColor: string,
    canTrim: boolean = true
  ) => {
    const clipWidth = Math.max((layer.end - layer.start) * scale, 30);
    const clipLeft = layer.start * scale;
    const isSelected = selectedLayerId === layer.id;
    const isDragging = draggingHandle?.id === layer.id;

    return (
      <div
        key={layer.id}
        className={`absolute h-10 rounded flex items-center cursor-grab active:cursor-grabbing transition-all ${
          isSelected ? 'ring-2 ring-primary ring-offset-1 z-10' : ''
        } ${isDragging ? 'opacity-75 z-20' : ''}`}
        style={{
          left: `${clipLeft}px`,
          width: `${clipWidth}px`,
          backgroundColor: bgColor,
        }}
        onClick={(e) => {
          e.stopPropagation();
          onLayerSelect(type, layer.id);
        }}
        onMouseDown={(e) => {
          if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('clip-content')) {
            canTrim && handleTrimStart(e, type, layer.id, 'move', layer);
          }
        }}
      >
        {canTrim && (
          <div
            className="absolute left-0 top-0 bottom-0 w-3 cursor-ew-resize bg-white/30 hover:bg-white/60 rounded-l flex items-center justify-center transition-colors z-20"
            onMouseDown={(e) => handleTrimStart(e, type, layer.id, 'start', layer)}
          >
            <GripVertical className="h-4 w-4 text-white/70" />
          </div>
        )}
        
        <span className="clip-content text-xs text-white px-4 truncate flex-1 select-none">{label}</span>
        
        {isSelected && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 mr-1 hover:bg-white/20"
            onClick={(e) => {
              e.stopPropagation();
              onLayerDelete(type, layer.id);
            }}
          >
            <Trash2 className="h-3 w-3 text-white" />
          </Button>
        )}

        {canTrim && (
          <div
            className="absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize bg-white/30 hover:bg-white/60 rounded-r flex items-center justify-center transition-colors z-20"
            onMouseDown={(e) => handleTrimStart(e, type, layer.id, 'end', layer)}
          >
            <GripVertical className="h-4 w-4 text-white/70" />
          </div>
        )}
      </div>
    );
  }, [scale, selectedLayerId, draggingHandle, handleTrimStart, onLayerSelect, onLayerDelete]);

  const renderAudioClip = useCallback(() => {
    if (!audioTrack) return null;
    
    const clipLeft = audioTrack.startAt * scale;
    const clipWidth = Math.max((audioTrack.endAt - audioTrack.startAt) * scale, 30);
    const isSelected = selectedLayerId === audioTrack.id;
    const isDragging = draggingHandle?.id === audioTrack.id;

    return (
      <div
        className={`absolute h-10 bg-green-500/80 rounded flex items-center cursor-grab active:cursor-grabbing transition-all ${
          isSelected ? 'ring-2 ring-primary ring-offset-1 z-10' : ''
        } ${isDragging ? 'opacity-75 z-20' : ''}`}
        style={{
          left: `${clipLeft}px`,
          width: `${clipWidth}px`,
        }}
        onClick={(e) => {
          e.stopPropagation();
          onLayerSelect('audio', audioTrack.id);
        }}
      >
        <div
          className="absolute left-0 top-0 bottom-0 w-3 cursor-ew-resize bg-white/30 hover:bg-white/60 rounded-l flex items-center justify-center transition-colors z-20"
          onMouseDown={(e) => handleTrimStart(e, 'audio', audioTrack.id, 'start', { start: audioTrack.startAt, end: audioTrack.endAt })}
        >
          <GripVertical className="h-4 w-4 text-white/70" />
        </div>
        
        <span className="text-xs text-white px-4 truncate flex-1 select-none">{audioTrack.title}</span>
        
        <div
          className="absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize bg-white/30 hover:bg-white/60 rounded-r flex items-center justify-center transition-colors z-20"
          onMouseDown={(e) => handleTrimStart(e, 'audio', audioTrack.id, 'end', { start: audioTrack.startAt, end: audioTrack.endAt })}
        >
          <GripVertical className="h-4 w-4 text-white/70" />
        </div>
      </div>
    );
  }, [audioTrack, scale, selectedLayerId, draggingHandle, handleTrimStart, onLayerSelect]);

  const playheadX = currentTime * scale;

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium tabular-nums min-w-[80px]">{formatTime(currentTime)}</span>
          <span className="text-sm text-muted-foreground">/ {formatTime(duration)}</span>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleSplitAtPlayhead}
            title="Split clip at playhead (Ctrl+B)"
            disabled={videoLayers.length === 0}
          >
            <Scissors className="h-4 w-4 mr-1" />
            Split
          </Button>
          
          <div className="flex items-center gap-1 ml-4 bg-muted/50 rounded-md p-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleZoomOut} title="Zoom Out">
              <ZoomOut className="h-4 w-4" />
            </Button>
            <div className="w-20">
              <Slider
                value={[scale]}
                onValueChange={(v) => setScale(v[0])}
                min={MIN_SCALE}
                max={MAX_SCALE}
                step={5}
                className="cursor-pointer"
              />
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleZoomIn} title="Zoom In">
              <ZoomIn className="h-4 w-4" />
            </Button>
            <span className="text-xs text-muted-foreground ml-1 w-14 tabular-nums">{scale}px/s</span>
          </div>
        </div>
      </div>

      <div 
        ref={scrollContainerRef}
        className={`flex-1 overflow-x-auto overflow-y-hidden transition-colors ${isDragOver ? 'bg-primary/5' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div 
          ref={timelineRef}
          className="relative min-h-full"
          style={{ width: `${timelineWidth + 88}px`, minWidth: '100%' }}
          onClick={handleTimelineClick}
        >
          {isDragOver && (
            <div className="absolute inset-0 flex items-center justify-center bg-primary/10 border-2 border-dashed border-primary z-30 pointer-events-none rounded-lg m-2">
              <div className="flex items-center gap-2 text-primary bg-background/90 px-4 py-2 rounded-md shadow-lg">
                <Upload className="h-6 w-6 animate-bounce" />
                <span className="text-sm font-medium">Drop video to add to timeline</span>
              </div>
            </div>
          )}

          {isUploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-40">
              <div className="flex items-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span>Uploading...</span>
              </div>
            </div>
          )}

          <div className="h-7 border-b border-border relative ml-[88px] bg-muted/20">
            {timeMarkers.map(time => (
              <div
                key={time}
                className="absolute top-0 h-full flex flex-col items-center"
                style={{ left: `${time * scale}px` }}
              >
                <div className="h-3 w-px bg-border" />
                <span className="text-[10px] text-muted-foreground tabular-nums mt-0.5">{formatTime(time)}</span>
              </div>
            ))}
          </div>

          <div className="space-y-1 py-2">
            <div className="flex items-center h-12 px-2">
              <div className="w-20 flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
                <Video className="h-4 w-4" />
                <span className="font-medium">Video</span>
              </div>
              <div className="flex-1 h-10 bg-muted/20 rounded relative ml-2 border border-border/50">
                {videoLayers.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
                    Drop video here or use Media panel
                  </div>
                )}
                {videoLayers.map(layer => 
                  renderClip(layer, 'video', layer.fileName, 'rgb(59 130 246 / 0.9)', true)
                )}
              </div>
            </div>

            <div className="flex items-center h-12 px-2">
              <div className="w-20 flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
                <Music className="h-4 w-4" />
                <span className="font-medium">Audio</span>
              </div>
              <div className="flex-1 h-10 bg-muted/20 rounded relative ml-2 border border-border/50">
                {!audioTrack && (
                  <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
                    Add music from Audio panel
                  </div>
                )}
                {renderAudioClip()}
              </div>
            </div>

            <div className="flex items-center h-12 px-2">
              <div className="w-20 flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
                <Image className="h-4 w-4" />
                <span className="font-medium">Images</span>
              </div>
              <div className="flex-1 h-10 bg-muted/20 rounded relative ml-2 border border-border/50">
                {imageLayers.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
                    Add images from Media panel
                  </div>
                )}
                {imageLayers.map(layer => renderClip(layer, 'image', layer.fileName, 'rgb(168 85 247 / 0.9)'))}
              </div>
            </div>

            <div className="flex items-center h-12 px-2">
              <div className="w-20 flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
                <Type className="h-4 w-4" />
                <span className="font-medium">Text</span>
              </div>
              <div className="flex-1 h-10 bg-muted/20 rounded relative ml-2 border border-border/50">
                {textLayers.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
                    Add text from Text panel
                  </div>
                )}
                {textLayers.map(layer => renderClip(layer, 'text', layer.content, 'rgb(234 179 8 / 0.9)'))}
              </div>
            </div>

            <div className="flex items-center h-12 px-2">
              <div className="w-20 flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
                <Smile className="h-4 w-4" />
                <span className="font-medium">Stickers</span>
              </div>
              <div className="flex-1 h-10 bg-muted/20 rounded relative ml-2 border border-border/50">
                {emojiLayers.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
                    Add stickers from Stickers panel
                  </div>
                )}
                {emojiLayers.map(layer => renderClip(layer, 'emoji', layer.content.substring(0, 10), 'rgb(236 72 153 / 0.9)'))}
              </div>
            </div>
          </div>

          <div
            ref={playheadRef}
            className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20 cursor-ew-resize pointer-events-auto shadow-lg"
            style={{ left: `${playheadX + 88}px` }}
            onMouseDown={handlePlayheadMouseDown}
          >
            <div className="absolute -top-0.5 -ml-2 w-4 h-4 bg-red-500 rounded-t-sm cursor-ew-resize shadow-md">
              <div className="absolute top-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[6px] border-t-white/80" />
            </div>
            {isDraggingPlayhead && (
              <div className="absolute -top-8 -ml-8 bg-red-500 text-white rounded px-2 py-0.5 text-xs whitespace-nowrap shadow-md">
                {formatTime(currentTime)}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 py-1.5 border-t border-border bg-muted/20 text-xs text-muted-foreground flex items-center gap-4">
        <span><kbd className="px-1 bg-muted rounded">Ctrl</kbd> + scroll to zoom</span>
        <span>Drag clip edges to trim</span>
        <span>Drag clip to move</span>
        <span>Drop video files to add</span>
      </div>
    </div>
  );
}
