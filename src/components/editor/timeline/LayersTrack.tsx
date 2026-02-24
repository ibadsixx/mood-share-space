// LayersTrack - Generic track for images, text, emojis/stickers
import { Image, Type, Smile } from 'lucide-react';
import { TimelineClip } from './TimelineClip';
import { EmojiLayer, TextLayer, ImageLayer } from '@/types/editor';

interface LayersTrackProps {
  type: 'image' | 'text' | 'emoji';
  layers: Array<ImageLayer | TextLayer | EmojiLayer>;
  pixelsPerSecond: number;
  selectedLayerId: string | null;
  onLayerSelect: (type: string, id: string) => void;
  onLayerUpdate: (type: string, id: string, updates: any) => void;
  onLayerDelete: (type: string, id: string) => void;
  trackLabelWidth: number;
}

const trackConfig = {
  image: {
    icon: Image,
    label: 'Images',
    bgColor: 'rgb(168 85 247 / 0.9)',
    emptyText: 'Add images from Media panel',
    getLabel: (layer: ImageLayer) => layer.fileName,
  },
  text: {
    icon: Type,
    label: 'Text',
    bgColor: 'rgb(234 179 8 / 0.9)',
    emptyText: 'Add text from Text panel',
    getLabel: (layer: TextLayer) => layer.content,
  },
  emoji: {
    icon: Smile,
    label: 'Stickers',
    bgColor: 'rgb(236 72 153 / 0.9)',
    emptyText: 'Add stickers from Stickers panel',
    getLabel: (layer: EmojiLayer) => layer.content.substring(0, 10),
  },
};

export function LayersTrack({
  type,
  layers,
  pixelsPerSecond,
  selectedLayerId,
  onLayerSelect,
  onLayerUpdate,
  onLayerDelete,
  trackLabelWidth,
}: LayersTrackProps) {
  const config = trackConfig[type];
  const Icon = config.icon;

  return (
    <div className="flex items-center h-12 px-2">
      <div 
        className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0"
        style={{ width: `${trackLabelWidth - 8}px` }}
      >
        <Icon className="h-4 w-4" />
        <span className="font-medium">{config.label}</span>
      </div>
      
      <div className="flex-1 h-10 bg-muted/20 rounded relative ml-2 border border-border/50">
        {layers.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
            {config.emptyText}
          </div>
        )}
        
        {layers.map((layer) => (
          <TimelineClip
            key={layer.id}
            id={layer.id}
            type={type}
            label={config.getLabel(layer as any)}
            start={layer.start}
            end={layer.end}
            bgColor={config.bgColor}
            pixelsPerSecond={pixelsPerSecond}
            isSelected={selectedLayerId === layer.id}
            canTrim={true}
            canDelete={true}
            onSelect={() => onLayerSelect(type, layer.id)}
            onUpdate={(updates) => onLayerUpdate(type, layer.id, updates)}
            onDelete={() => onLayerDelete(type, layer.id)}
          />
        ))}
      </div>
    </div>
  );
}
