import { useState, useRef, useEffect } from 'react';
import { TextLayer } from '@/types/editor';
import { cn } from '@/lib/utils';

interface TextLayerCanvasProps {
  layer: TextLayer;
  isSelected: boolean;
  isEditing: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<TextLayer>) => void;
  onStartEdit: () => void;
  onEndEdit: () => void;
  onDelete: () => void;
  containerWidth: number;
  containerHeight: number;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

export function TextLayerCanvas({
  layer,
  isSelected,
  isEditing,
  onSelect,
  onUpdate,
  onStartEdit,
  onEndEdit,
  onDelete,
  containerWidth,
  containerHeight,
  onDragStart,
  onDragEnd,
}: TextLayerCanvasProps) {
  const textRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [initialPosition, setInitialPosition] = useState({ x: 0, y: 0 });

  const pixelX = (layer.position.x / 100) * containerWidth;
  const pixelY = (layer.position.y / 100) * containerHeight;

  const handlePointerDown = (e: React.PointerEvent) => {
    if (isEditing) return;
    e.preventDefault();
    e.stopPropagation();

    // MANDATORY: select on pointer down (not click)
    onSelect();

    // Begin drag
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setInitialPosition({ x: layer.position.x, y: layer.position.y });

    // Capture pointer so moves/up are reliable even if pointer leaves the element
    try {
      (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    onDragStart?.();
    console.log('[TEXT] pointer down id=', layer.id);
    console.log('[TEXT] drag start id=', layer.id);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handlePointerMove = (e: PointerEvent) => {
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;

      const newX = initialPosition.x + (deltaX / containerWidth) * 100;
      const newY = initialPosition.y + (deltaY / containerHeight) * 100;

      onUpdate({
        position: {
          x: Math.max(0, Math.min(100, newX)),
          y: Math.max(0, Math.min(100, newY)),
        },
      });
    };

    const handlePointerUp = () => {
      setIsDragging(false);
      onDragEnd?.();
      console.log('[TEXT] drag end id=', layer.id, '(selection kept)');
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDragging, dragStart, initialPosition, containerWidth, containerHeight, onUpdate, onDragEnd, layer.id]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onStartEdit();
  };

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    const newContent = e.currentTarget.textContent || '';
    onUpdate({ content: newContent });
  };

  const handleBlur = () => {
    onEndEdit();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onEndEdit();
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onEndEdit();
    }
  };

  const textStyles: React.CSSProperties = {
    fontFamily: layer.style.fontFamily,
    fontSize: `${layer.style.fontSize * layer.scale}px`,
    color: layer.style.color,
    fontWeight: layer.style.fontWeight,
    fontStyle: layer.style.fontStyle,
    textAlign: layer.style.textAlign,
    textTransform: layer.style.textTransform || 'none',
    textDecoration: layer.style.textDecoration || 'none',
    lineHeight: layer.style.lineHeight || 1.2,
    letterSpacing: layer.style.letterSpacing ? `${layer.style.letterSpacing}px` : undefined,
    backgroundColor: layer.style.backgroundColor,
    transform: `rotate(${layer.rotation}deg)`,
    textShadow: layer.style.shadow
      ? `${layer.style.shadow.offsetX}px ${layer.style.shadow.offsetY}px ${layer.style.shadow.blur}px ${layer.style.shadow.color}`
      : undefined,
    WebkitTextStroke: layer.style.outline
      ? `${layer.style.outline.width}px ${layer.style.outline.color}`
      : undefined,
  };

  const getAnimationClass = () => {
    if (!layer.animation || layer.animation.type === 'none') return '';
    
    switch (layer.animation.type) {
      case 'fade':
        return 'animate-fade-in';
      case 'pop':
        return 'animate-scale-in';
      case 'slide-up':
        return 'animate-slide-up';
      case 'slide-down':
        return 'animate-slide-down';
      case 'slide-left':
        return 'animate-slide-left';
      case 'slide-right':
        return 'animate-slide-right';
      default:
        return '';
    }
  };

  return (
    <div
      className={cn(
        'absolute cursor-move select-none',
        isSelected && 'ring-2 ring-primary ring-offset-1',
        getAnimationClass()
      )}
      style={{
        left: pixelX,
        top: pixelY,
        transform: `translate(-50%, -50%)`,
      }}
      onPointerDown={handlePointerDown}
      onDoubleClick={handleDoubleClick}
    >
      <div
        ref={textRef}
        contentEditable={isEditing}
        suppressContentEditableWarning
        className={cn(
          'outline-none whitespace-pre-wrap px-2 py-1',
          isEditing && 'bg-background/80 rounded'
        )}
        style={textStyles}
        onInput={handleInput}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
      >
        {layer.content}
      </div>

      {isSelected && !isEditing && (
        <>
          <div className="absolute -top-1 -left-1 w-2 h-2 bg-primary rounded-full cursor-nw-resize" />
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full cursor-ne-resize" />
          <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-primary rounded-full cursor-sw-resize" />
          <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-primary rounded-full cursor-se-resize" />
          <button
            className="absolute -top-3 -right-3 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center text-xs hover:bg-destructive/80 z-10"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            ✕
          </button>
        </>
      )}
    </div>
  );
}
