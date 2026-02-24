import { useState, useRef, useEffect } from 'react';
import { Type, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TextLayer } from '@/types/editor';

interface TextTimelineTrackProps {
  textLayers: TextLayer[];
  duration: number;
  pixelsPerSecond: number;
  selectedLayerId: string | null;
  onSelectLayer: (id: string) => void;
  onUpdateLayer: (id: string, updates: Partial<TextLayer>) => void;
  onDeleteLayer: (id: string) => void;
  trackLabelWidth: number;
}

export function TextTimelineTrack({
  textLayers,
  duration,
  pixelsPerSecond,
  selectedLayerId,
  onSelectLayer,
  onUpdateLayer,
  onDeleteLayer,
  trackLabelWidth,
}: TextTimelineTrackProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragType, setDragType] = useState<'move' | 'resize-start' | 'resize-end' | null>(null);
  const [dragStartX, setDragStartX] = useState(0);
  const [initialValues, setInitialValues] = useState({ start: 0, end: 0 });

  // Handle mouse down on layer
  const handleMouseDown = (
    e: React.MouseEvent,
    layer: TextLayer,
    type: 'move' | 'resize-start' | 'resize-end'
  ) => {
    e.preventDefault();
    e.stopPropagation();

    setDraggingId(layer.id);
    setDragType(type);
    setDragStartX(e.clientX);
    setInitialValues({ start: layer.start, end: layer.end });
    onSelectLayer(layer.id);
  };

  // Handle mouse move
  useEffect(() => {
    if (!draggingId || !dragType) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - dragStartX;
      const deltaTime = deltaX / pixelsPerSecond;

      const layer = textLayers.find((l) => l.id === draggingId);
      if (!layer) return;

      if (dragType === 'move') {
        const layerDuration = initialValues.end - initialValues.start;
        let newStart = Math.max(0, initialValues.start + deltaTime);
        let newEnd = newStart + layerDuration;

        if (newEnd > duration) {
          newEnd = duration;
          newStart = newEnd - layerDuration;
        }

        onUpdateLayer(draggingId, { start: newStart, end: newEnd });
      } else if (dragType === 'resize-start') {
        const newStart = Math.max(0, Math.min(initialValues.end - 0.5, initialValues.start + deltaTime));
        onUpdateLayer(draggingId, { start: newStart });
      } else if (dragType === 'resize-end') {
        const newEnd = Math.max(initialValues.start + 0.5, Math.min(duration, initialValues.end + deltaTime));
        onUpdateLayer(draggingId, { end: newEnd });
      }
    };

    const handleMouseUp = () => {
      setDraggingId(null);
      setDragType(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingId, dragType, dragStartX, initialValues, pixelsPerSecond, duration, textLayers, onUpdateLayer]);

  return (
    <div className="flex items-center h-10 px-2">
      <div
        className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0"
        style={{ width: `${trackLabelWidth - 8}px` }}
      >
        <Type className="h-4 w-4" />
        <span className="font-medium">Text</span>
      </div>

      <div
        ref={trackRef}
        className="flex-1 h-8 bg-muted/20 rounded relative ml-2 border border-border/50"
      >
        {textLayers.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
            Add text from Text panel
          </div>
        )}

        {textLayers.map((layer) => {
          const left = (layer.start / duration) * 100;
          const width = ((layer.end - layer.start) / duration) * 100;
          const isSelected = selectedLayerId === layer.id;

          return (
            <div
              key={layer.id}
              className={cn(
                'absolute h-full rounded flex items-center justify-between px-1 cursor-move group transition-all',
                isSelected ? 'bg-violet-500/90 ring-2 ring-violet-400' : 'bg-violet-500/70 hover:bg-violet-500/80'
              )}
              style={{
                left: `${left}%`,
                width: `${width}%`,
                minWidth: '20px',
              }}
              onMouseDown={(e) => handleMouseDown(e, layer, 'move')}
            >
              {/* Resize handle - start */}
              <div
                className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/30 rounded-l"
                onMouseDown={(e) => handleMouseDown(e, layer, 'resize-start')}
              />

              {/* Content */}
              <div className="flex-1 flex items-center justify-center overflow-hidden px-2">
                <span className="text-xs text-white font-medium truncate">
                  {layer.content}
                </span>
              </div>

              {/* Delete button - visible on hover */}
              <button
                className="absolute right-1 opacity-0 group-hover:opacity-100 p-0.5 hover:bg-white/20 rounded transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteLayer(layer.id);
                }}
              >
                <Trash2 className="h-3 w-3 text-white" />
              </button>

              {/* Resize handle - end */}
              <div
                className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/30 rounded-r"
                onMouseDown={(e) => handleMouseDown(e, layer, 'resize-end')}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
