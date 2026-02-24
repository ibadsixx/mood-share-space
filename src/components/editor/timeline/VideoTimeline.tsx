// VideoTimeline - Main timeline component with full zoom/pan support
// Receives player from Editor.tsx - does NOT use useEditorProject
// Dynamic width based on duration * pixelsPerSecond
// Supports: wheel zoom, pinch-to-zoom, pan (drag/middle-mouse/shift+wheel)
// Integrated with AudioTimelineTrack and TextTimelineTrack

import { useRef, useCallback, useEffect, useState, useMemo } from 'react';
import { Scissors, Upload, Loader2, Hand, Move } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VideoLayer, AudioTrack as AudioTrackType, EmojiLayer, TextLayer, ImageLayer } from '@/types/editor';
import { toast } from '@/hooks/use-toast';
import { uploadVideo, getVideoMetadata } from '@/lib/storage';
import { useAuth } from '@/hooks/useAuth';
import { VideoPlayer } from '@/lib/player';

import { TimeScale } from './TimeScale';
import { Playhead } from './Playhead';
import { ZoomControls } from './ZoomControls';
import { VideoTrack } from './VideoTrack';
import { AudioTrack } from './AudioTrack';
import { LayersTrack } from './LayersTrack';
import { TrimHandles } from './TrimHandles';
import { AudioTimelineTrack } from './AudioTimelineTrack';
import { TextTimelineTrack } from './TextTimelineTrack';

const TRACK_LABEL_WIDTH = 88;
const MIN_ZOOM = 1;
const MAX_ZOOM = 20;
const BASE_PIXELS_PER_SECOND = 10;

interface VideoTimelineProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  clipStart: number;
  clipEnd: number;
  videoLayers: VideoLayer[];
  audioTrack: AudioTrackType | null;
  emojiLayers: EmojiLayer[];
  textLayers: TextLayer[];
  imageLayers: ImageLayer[];
  selectedLayerId: string | null;
  onSeek: (time: number) => void;
  onScrubStart: () => void;
  onScrubEnd: () => void;
  onTrimStartChange: (start: number) => void;
  onTrimEndChange: (end: number) => void;
  onLayerSelect: (type: string | null, id: string | null) => void;
  onLayerUpdate: (type: string, id: string, updates: any) => void;
  onLayerDelete: (type: string, id: string) => void;
  onAddVideo?: (video: Omit<VideoLayer, 'id'>) => void;
  onAddImage?: (image: Omit<ImageLayer, 'id'>) => void;
  player: VideoPlayer | null;
  // Volume control props for inline timeline controls
  videoVolume?: number;
  isVideoMuted?: boolean;
  onVideoVolumeChange?: (volume: number) => void;
  onVideoMutedChange?: (muted: boolean) => void;
}

export function VideoTimeline({
  isPlaying,
  currentTime,
  duration,
  clipStart,
  clipEnd,
  videoLayers,
  audioTrack,
  emojiLayers,
  textLayers,
  imageLayers,
  selectedLayerId,
  onSeek,
  onScrubStart,
  onScrubEnd,
  onTrimStartChange,
  onTrimEndChange,
  onLayerSelect,
  onLayerUpdate,
  onLayerDelete,
  onAddVideo,
  onAddImage,
  player,
  videoVolume = 100,
  isVideoMuted = false,
  onVideoVolumeChange,
  onVideoMutedChange,
}: VideoTimelineProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  
  // Zoom and pan state
  const [zoomLevel, setZoomLevel] = useState(5);
  const [panOffset, setPanOffset] = useState(0);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; scrollLeft: number } | null>(null);
  
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [activeClipIndex, setActiveClipIndex] = useState(0);

  // Computed values - CRITICAL: use totalDuration from player when available
  const pixelsPerSecond = BASE_PIXELS_PER_SECOND * zoomLevel;
  const effectiveDuration = player ? player.getTotalDuration() || duration : duration;
  const timelineWidth = Math.max(effectiveDuration * pixelsPerSecond, 800);

  // Sorted clips for highlighting
  const sortedClips = useMemo(() => 
    [...videoLayers].sort((a, b) => a.start - b.start),
    [videoLayers]
  );

  // Subscribe to player events - CRITICAL for clip synchronization
  useEffect(() => {
    if (!player) return;

    const handleClipChange = (data: { index: number }) => {
      console.log('[Timeline] 🔄 Clip changed to:', data.index);
      setActiveClipIndex(data.index);
    };

    const handleTimeUpdate = (data: { time: number; clipIndex: number }) => {
      // Active clip can change during playback - keep in sync
      if (data.clipIndex !== activeClipIndex) {
        setActiveClipIndex(data.clipIndex);
      }
    };

    player.on('clipchange', handleClipChange);
    player.on('timeupdate', handleTimeUpdate);

    // Initialize with current clip index
    setActiveClipIndex(player.getCurrentClipIndex());

    return () => {
      player.off('clipchange', handleClipChange);
      player.off('timeupdate', handleTimeUpdate);
    };
  }, [player, activeClipIndex]);

  // Debug logging
  useEffect(() => {
    console.log('[Timeline] scale:', pixelsPerSecond.toFixed(1), 'px/s, duration:', effectiveDuration.toFixed(2), 's, clips:', videoLayers.length);
  }, [pixelsPerSecond, effectiveDuration, videoLayers.length]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 10);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms}`;
  };

  // Auto-scroll to keep playhead visible during playback
  useEffect(() => {
    if (!isPlaying || isScrubbing) return;
    
    const container = scrollContainerRef.current;
    if (!container) return;

    const playheadX = currentTime * pixelsPerSecond + TRACK_LABEL_WIDTH;
    const containerWidth = container.clientWidth;
    const scrollLeft = container.scrollLeft;
    
    if (playheadX > scrollLeft + containerWidth - 100) {
      container.scrollLeft = playheadX - containerWidth / 2;
    } else if (playheadX < scrollLeft + TRACK_LABEL_WIDTH + 50) {
      container.scrollLeft = Math.max(0, playheadX - TRACK_LABEL_WIDTH - 50);
    }
  }, [currentTime, isPlaying, isScrubbing, pixelsPerSecond]);

  // CRITICAL: Get viewport width for pan boundaries
  const getViewportWidth = useCallback((): number => {
    return scrollContainerRef.current?.clientWidth ?? 800;
  }, []);

  // CRITICAL: Clamp pan within boundaries
  const clampPan = useCallback((scrollLeft: number): number => {
    const viewportWidth = getViewportWidth();
    const maxPan = Math.max(0, timelineWidth + TRACK_LABEL_WIDTH - viewportWidth);
    return Math.max(0, Math.min(maxPan, scrollLeft));
  }, [timelineWidth, getViewportWidth]);

  // Enhanced wheel handling: Ctrl+scroll = zoom (CURSOR-CENTERED), Shift+scroll = pan
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        // ========= ZOOM CENTERED AT CURSOR =========
        e.preventDefault();
        
        // 1. Capture cursor position relative to container
        const rect = container.getBoundingClientRect();
        const cursorX = e.clientX - rect.left;
        
        // 2. Calculate time position under cursor BEFORE zoom
        const scrollLeft = container.scrollLeft;
        const timeAtCursor = (cursorX + scrollLeft - TRACK_LABEL_WIDTH) / pixelsPerSecond;
        
        // 3. Calculate new zoom level
        const delta = e.deltaY > 0 ? -1 : 1;
        const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoomLevel + delta));
        const newPps = BASE_PIXELS_PER_SECOND * newZoom;
        
        // 4. Calculate new scroll position to keep cursor over same time
        // newScrollLeft = (timeAtCursor * newPps) + TRACK_LABEL_WIDTH - cursorX
        const newScrollLeft = (timeAtCursor * newPps) + TRACK_LABEL_WIDTH - cursorX;
        
        console.log(`[Timeline] Cursor-centered zoom: ${zoomLevel}→${newZoom}, timeAtCursor=${timeAtCursor.toFixed(2)}s`);
        
        // 5. Apply zoom and scroll
        setZoomLevel(newZoom);
        
        // Use RAF to apply scroll after state update
        requestAnimationFrame(() => {
          container.scrollLeft = clampPan(newScrollLeft);
        });
      } else if (e.shiftKey) {
        // Horizontal pan with Shift+wheel (with boundaries)
        e.preventDefault();
        const newScroll = clampPan(container.scrollLeft + e.deltaY);
        container.scrollLeft = newScroll;
        console.log('[Timeline] Shift+wheel pan:', newScroll.toFixed(0));
      }
      // Normal scroll is handled by browser default
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [zoomLevel, pixelsPerSecond, clampPan]);

  // Pan with middle mouse button, Alt+click, or touch drag (WITH BOUNDARIES)
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    let touchStartX = 0;
    let touchStartScrollLeft = 0;
    let panVelocity = 0;
    let lastPanX = 0;
    let momentumAnimationId: number | null = null;

    const handleMouseDown = (e: MouseEvent) => {
      // Middle mouse button (button === 1) or Alt+click for panning
      if (e.button === 1 || (e.button === 0 && e.altKey)) {
        e.preventDefault();
        setIsPanning(true);
        setPanStart({ x: e.clientX, scrollLeft: container.scrollLeft });
        lastPanX = e.clientX;
        panVelocity = 0;
        container.style.cursor = 'grabbing';
        
        // Cancel any momentum animation
        if (momentumAnimationId) {
          cancelAnimationFrame(momentumAnimationId);
          momentumAnimationId = null;
        }
        
        console.log('[Timeline] Pan start (mouse)');
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isPanning && panStart) {
        const deltaX = e.clientX - panStart.x;
        
        // Calculate velocity for momentum
        panVelocity = e.clientX - lastPanX;
        lastPanX = e.clientX;
        
        // Apply with boundaries
        const newScroll = clampPan(panStart.scrollLeft - deltaX);
        container.scrollLeft = newScroll;
      }
    };

    const handleMouseUp = () => {
      if (isPanning) {
        setIsPanning(false);
        setPanStart(null);
        container.style.cursor = '';
        
        // Apply momentum (physics-based smooth stop)
        if (Math.abs(panVelocity) > 2) {
          const applyMomentum = () => {
            panVelocity *= 0.92; // Friction
            if (Math.abs(panVelocity) > 0.5) {
              const newScroll = clampPan(container.scrollLeft - panVelocity);
              container.scrollLeft = newScroll;
              momentumAnimationId = requestAnimationFrame(applyMomentum);
            } else {
              momentumAnimationId = null;
            }
          };
          momentumAnimationId = requestAnimationFrame(applyMomentum);
        }
        
        console.log('[Timeline] Pan end (mouse), velocity:', panVelocity.toFixed(1));
      }
    };

    // Touch pan support (single finger horizontal drag) with boundaries
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        touchStartX = e.touches[0].clientX;
        touchStartScrollLeft = container.scrollLeft;
        lastPanX = touchStartX;
        panVelocity = 0;
        
        if (momentumAnimationId) {
          cancelAnimationFrame(momentumAnimationId);
          momentumAnimationId = null;
        }
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        const currentX = e.touches[0].clientX;
        const deltaX = currentX - touchStartX;
        
        // Calculate velocity
        panVelocity = currentX - lastPanX;
        lastPanX = currentX;
        
        // Only pan if horizontal movement is significant
        if (Math.abs(deltaX) > 5) {
          const newScroll = clampPan(touchStartScrollLeft - deltaX);
          container.scrollLeft = newScroll;
        }
      }
    };
    
    const handleTouchEnd = () => {
      // Apply momentum for touch
      if (Math.abs(panVelocity) > 2) {
        const applyMomentum = () => {
          panVelocity *= 0.92;
          if (Math.abs(panVelocity) > 0.5) {
            const newScroll = clampPan(container.scrollLeft - panVelocity);
            container.scrollLeft = newScroll;
            momentumAnimationId = requestAnimationFrame(applyMomentum);
          } else {
            momentumAnimationId = null;
          }
        };
        momentumAnimationId = requestAnimationFrame(applyMomentum);
      }
    };

    container.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: true });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      
      if (momentumAnimationId) {
        cancelAnimationFrame(momentumAnimationId);
      }
    };
  }, [isPanning, panStart, clampPan]);

  // Click to seek - uses player.seekGlobalTime
  const handleTimelineClick = useCallback((e: React.MouseEvent) => {
    if (isScrubbing) return;
    if (!scrollContainerRef.current) return;
    
    const container = scrollContainerRef.current;
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left + container.scrollLeft - TRACK_LABEL_WIDTH;
    
    if (x < 0) return;
    
    const time = Math.max(0, Math.min(effectiveDuration, x / pixelsPerSecond));
    console.log('[Timeline] 🎯 Click seek to:', time.toFixed(2), 's');
    
    // Use player directly for seeking
    if (player) {
      player.seekGlobalTime(time);
    }
    onSeek(time);
  }, [isScrubbing, effectiveDuration, pixelsPerSecond, onSeek, player]);

  // Scrubbing handlers
  const handleScrubStart = useCallback(() => {
    setIsScrubbing(true);
    if (player) {
      player.startScrub();
    }
    onScrubStart();
  }, [onScrubStart, player]);

  const handleScrubUpdate = useCallback((time: number) => {
    const clampedTime = Math.max(0, Math.min(effectiveDuration, time));
    
    // Use player for seeking during scrub
    if (player) {
      player.seekGlobalTime(clampedTime);
    }
    onSeek(clampedTime);
  }, [effectiveDuration, onSeek, player]);

  const handleScrubEnd = useCallback(() => {
    setIsScrubbing(false);
    if (player) {
      player.endScrub();
    }
    onScrubEnd();
  }, [onScrubEnd, player]);


  // Zoom controls
  const handleZoomIn = useCallback(() => {
    setZoomLevel(prev => Math.min(MAX_ZOOM, prev + 1));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomLevel(prev => Math.max(MIN_ZOOM, prev - 1));
  }, []);

  // Split clip at playhead
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
    
    console.log('[Timeline] Split clip at:', currentTime.toFixed(2));
    toast({
      title: 'Clip split',
      description: `Split at ${formatTime(currentTime)}`,
    });
  }, [currentTime, videoLayers, onLayerUpdate, onAddVideo]);

  // Drag & drop handlers - uploads to Supabase storage (permanent URL)
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

    console.log('[Timeline] Video dropped:', videoFile.name);
    setIsUploading(true);

    try {
      // Upload to Supabase storage (permanent public URL)
      const { publicUrl } = await uploadVideo(videoFile, user.id, { folder: 'clips' });
      console.log('[Timeline] ✅ UPLOAD COMPLETE:', publicUrl);

      // Get metadata from uploaded URL
      const metadata = await getVideoMetadata(publicUrl);
      console.log('[Timeline] Video duration:', metadata.duration);
      
      // Calculate new clip position (append at end)
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
        console.log('[Timeline] ADDING VIDEO TO TIMELINE:', videoFile.name);
        toast({
          title: 'Video added',
          description: `${videoFile.name} added to timeline`,
        });
      }
    } catch (error) {
      console.error('[Timeline] ❌ Upload failed:', error);
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Failed to upload video.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  }, [user?.id, videoLayers, onAddVideo]);

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Timeline Controls Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium tabular-nums min-w-[80px]">
            {formatTime(currentTime)}
          </span>
          <span className="text-sm text-muted-foreground">
            / {formatTime(effectiveDuration)}
          </span>
          {videoLayers.length > 1 && (
            <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">
              Clip {activeClipIndex + 1} / {videoLayers.length}
            </span>
          )}
          {(clipStart > 0 || clipEnd < effectiveDuration) && (
            <span className="text-xs text-yellow-500 ml-2">
              Trim: {formatTime(clipStart)} - {formatTime(clipEnd)}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleSplitAtPlayhead}
            disabled={videoLayers.length === 0}
            title="Split clip at playhead"
          >
            <Scissors className="h-4 w-4 mr-1" />
            Split
          </Button>
          
          <ZoomControls
            zoomLevel={zoomLevel}
            minZoom={MIN_ZOOM}
            maxZoom={MAX_ZOOM}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onZoomChange={setZoomLevel}
            pixelsPerSecond={pixelsPerSecond}
            containerRef={scrollContainerRef}
            duration={effectiveDuration}
          />
          
          {/* Pan mode indicator */}
          {isPanning && (
            <span className="text-xs text-primary flex items-center gap-1">
              <Move className="h-3 w-3" />
              Panning
            </span>
          )}
        </div>
      </div>

      {/* Timeline Content - scrollable with dynamic width */}
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
          style={{ 
            width: `${timelineWidth + TRACK_LABEL_WIDTH}px`, 
            minWidth: '100%' 
          }}
          onClick={handleTimelineClick}
        >
          {/* Drop overlay */}
          {(isDragOver || isUploading) && (
            <div className="absolute inset-0 flex items-center justify-center bg-primary/10 border-2 border-dashed border-primary z-40 pointer-events-none rounded-lg m-2">
              <div className="flex items-center gap-2 text-primary bg-background/90 px-4 py-2 rounded-md shadow-lg">
                {isUploading ? (
                  <>
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="text-sm font-medium">Uploading video...</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-6 w-6 animate-bounce" />
                    <span className="text-sm font-medium">Drop video to add to timeline</span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Time Scale/Ruler */}
          <TimeScale
            duration={effectiveDuration}
            pixelsPerSecond={pixelsPerSecond}
            trackLabelWidth={TRACK_LABEL_WIDTH}
          />

          {/* Trim Handles */}
          <TrimHandles
            clipStart={clipStart}
            clipEnd={clipEnd}
            duration={effectiveDuration}
            pixelsPerSecond={pixelsPerSecond}
            trackLabelWidth={TRACK_LABEL_WIDTH}
            onTrimStartChange={onTrimStartChange}
            onTrimEndChange={onTrimEndChange}
            containerRef={scrollContainerRef}
          />

          {/* Tracks Container */}
          <div className="space-y-1 py-2">
            <VideoTrack
              videoLayers={videoLayers}
              pixelsPerSecond={pixelsPerSecond}
              selectedLayerId={selectedLayerId}
              onLayerSelect={onLayerSelect}
              onLayerUpdate={onLayerUpdate}
              onLayerDelete={onLayerDelete}
              onAddVideoClip={onAddVideo}
              onAddImageClip={onAddImage}
              trackLabelWidth={TRACK_LABEL_WIDTH}
              isDragOver={isDragOver}
              currentClipIndex={activeClipIndex}
              videoVolume={videoVolume}
              isVideoMuted={isVideoMuted}
              onVideoVolumeChange={onVideoVolumeChange}
              onVideoMutedChange={onVideoMutedChange}
            />

            <AudioTrack
              audioTrack={audioTrack}
              pixelsPerSecond={pixelsPerSecond}
              selectedLayerId={selectedLayerId}
              onLayerSelect={onLayerSelect}
              onLayerUpdate={onLayerUpdate}
              onLayerDelete={onLayerDelete}
              trackLabelWidth={TRACK_LABEL_WIDTH}
            />

            <LayersTrack
              type="image"
              layers={imageLayers}
              pixelsPerSecond={pixelsPerSecond}
              selectedLayerId={selectedLayerId}
              onLayerSelect={onLayerSelect}
              onLayerUpdate={onLayerUpdate}
              onLayerDelete={onLayerDelete}
              trackLabelWidth={TRACK_LABEL_WIDTH}
            />

            <LayersTrack
              type="text"
              layers={textLayers}
              pixelsPerSecond={pixelsPerSecond}
              selectedLayerId={selectedLayerId}
              onLayerSelect={onLayerSelect}
              onLayerUpdate={onLayerUpdate}
              onLayerDelete={onLayerDelete}
              trackLabelWidth={TRACK_LABEL_WIDTH}
            />

            <LayersTrack
              type="emoji"
              layers={emojiLayers}
              pixelsPerSecond={pixelsPerSecond}
              selectedLayerId={selectedLayerId}
              onLayerSelect={onLayerSelect}
              onLayerUpdate={onLayerUpdate}
              onLayerDelete={onLayerDelete}
              trackLabelWidth={TRACK_LABEL_WIDTH}
            />
          </div>

          {/* Playhead - moves with currentTime */}
          <Playhead
            currentTime={currentTime}
            pixelsPerSecond={pixelsPerSecond}
            trackLabelWidth={TRACK_LABEL_WIDTH}
            isScrubbing={isScrubbing}
            onScrubStart={handleScrubStart}
            onScrubUpdate={handleScrubUpdate}
            onScrubEnd={handleScrubEnd}
            containerRef={scrollContainerRef}
            duration={effectiveDuration}
          />
        </div>
      </div>

      {/* Instructions footer - updated with pan instructions */}
      <div className="px-4 py-1.5 border-t border-border bg-muted/20 text-xs text-muted-foreground flex items-center gap-4 flex-wrap">
        <span><kbd className="px-1 bg-muted rounded">Ctrl</kbd> + scroll = zoom</span>
        <span><kbd className="px-1 bg-muted rounded">Shift</kbd> + scroll = pan</span>
        <span><kbd className="px-1 bg-muted rounded">Alt</kbd> + drag or middle-click = pan</span>
        <span>Pinch = zoom (trackpad/touch)</span>
        <span>Drop videos to add</span>
      </div>
    </div>
  );
}

export default VideoTimeline;
