import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { LayoutTemplate, Search, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EditorTemplate } from '@/types/editor';
import { toast } from '@/hooks/use-toast';

interface TemplatePickerProps {
  onApplyTemplate: (template: EditorTemplate) => void;
}

// Built-in templates
const BUILT_IN_TEMPLATES: EditorTemplate[] = [
  {
    id: 'birthday-01',
    name: 'Birthday Celebration',
    description: 'Colorful birthday template with confetti',
    thumbnailUrl: '/placeholder.svg',
    duration: 15,
    textLayers: [
      {
        id: 'title',
        type: 'text',
        content: '🎉 Happy Birthday! 🎂',
        start: 0,
        end: 15,
        position: { x: 50, y: 30 },
        scale: 1.2,
        rotation: 0,
        style: {
          fontFamily: 'Playfair Display',
          fontSize: 48,
          color: '#ffffff',
          fontWeight: 700,
          fontStyle: 'normal',
          textAlign: 'center',
          shadow: { color: 'rgba(0,0,0,0.5)', blur: 8, offsetX: 2, offsetY: 2 },
        },
        animation: { type: 'pop', duration: 0.5 },
      },
      {
        id: 'subtitle',
        type: 'text',
        content: 'Wishing you an amazing day!',
        start: 1,
        end: 15,
        position: { x: 50, y: 70 },
        scale: 1,
        rotation: 0,
        style: {
          fontFamily: 'Inter',
          fontSize: 24,
          color: '#ffeaa7',
          fontWeight: 400,
          fontStyle: 'normal',
          textAlign: 'center',
        },
        animation: { type: 'fade', duration: 0.5 },
      },
    ],
    globalFilter: {
      brightness: 110,
      contrast: 110,
      saturation: 120,
      temperature: 10,
      blur: 0,
    },
  },
  {
    id: 'promo-01',
    name: 'Product Promo',
    description: 'Clean promotional template',
    thumbnailUrl: '/placeholder.svg',
    duration: 10,
    textLayers: [
      {
        id: 'headline',
        type: 'text',
        content: 'NEW ARRIVAL',
        start: 0,
        end: 10,
        position: { x: 50, y: 20 },
        scale: 1,
        rotation: 0,
        style: {
          fontFamily: 'Bebas Neue',
          fontSize: 64,
          color: '#ffffff',
          fontWeight: 700,
          fontStyle: 'normal',
          textAlign: 'center',
        },
        animation: { type: 'slide-down', duration: 0.5 },
      },
      {
        id: 'cta',
        type: 'text',
        content: 'SHOP NOW →',
        start: 2,
        end: 10,
        position: { x: 50, y: 85 },
        scale: 1,
        rotation: 0,
        style: {
          fontFamily: 'Inter',
          fontSize: 20,
          color: '#000000',
          backgroundColor: '#ffffff',
          fontWeight: 700,
          fontStyle: 'normal',
          textAlign: 'center',
        },
        animation: { type: 'pop', duration: 0.3 },
      },
    ],
    globalFilter: {
      brightness: 100,
      contrast: 115,
      saturation: 90,
      temperature: 0,
      blur: 0,
    },
  },
  {
    id: 'vlog-01',
    name: 'Vlog Intro',
    description: 'Casual vlog introduction template',
    thumbnailUrl: '/placeholder.svg',
    duration: 5,
    textLayers: [
      {
        id: 'greeting',
        type: 'text',
        content: "Hey there! 👋",
        start: 0,
        end: 5,
        position: { x: 50, y: 50 },
        scale: 1.5,
        rotation: -5,
        style: {
          fontFamily: 'Dancing Script',
          fontSize: 56,
          color: '#ffffff',
          fontWeight: 700,
          fontStyle: 'normal',
          textAlign: 'center',
          shadow: { color: 'rgba(0,0,0,0.3)', blur: 10, offsetX: 0, offsetY: 4 },
        },
        animation: { type: 'pop', duration: 0.4 },
      },
    ],
    globalFilter: {
      brightness: 105,
      contrast: 100,
      saturation: 110,
      temperature: 15,
      blur: 0,
    },
  },
  {
    id: 'quote-01',
    name: 'Inspirational Quote',
    description: 'Elegant quote template',
    thumbnailUrl: '/placeholder.svg',
    duration: 8,
    textLayers: [
      {
        id: 'quote',
        type: 'text',
        content: '"The only way to do great work is to love what you do."',
        start: 0,
        end: 8,
        position: { x: 50, y: 45 },
        scale: 1,
        rotation: 0,
        style: {
          fontFamily: 'Georgia',
          fontSize: 32,
          color: '#ffffff',
          fontWeight: 400,
          fontStyle: 'italic',
          textAlign: 'center',
        },
        animation: { type: 'fade', duration: 1 },
      },
      {
        id: 'author',
        type: 'text',
        content: '— Steve Jobs',
        start: 1.5,
        end: 8,
        position: { x: 50, y: 60 },
        scale: 1,
        rotation: 0,
        style: {
          fontFamily: 'Inter',
          fontSize: 18,
          color: '#cccccc',
          fontWeight: 400,
          fontStyle: 'normal',
          textAlign: 'center',
        },
        animation: { type: 'fade', duration: 0.5 },
      },
    ],
    globalFilter: {
      brightness: 90,
      contrast: 110,
      saturation: 80,
      temperature: -10,
      blur: 0,
    },
  },
  {
    id: 'countdown-01',
    name: 'Coming Soon',
    description: 'Countdown teaser template',
    thumbnailUrl: '/placeholder.svg',
    duration: 10,
    textLayers: [
      {
        id: 'title',
        type: 'text',
        content: 'COMING SOON',
        start: 0,
        end: 10,
        position: { x: 50, y: 40 },
        scale: 1.3,
        rotation: 0,
        style: {
          fontFamily: 'Oswald',
          fontSize: 72,
          color: '#ffffff',
          fontWeight: 700,
          fontStyle: 'normal',
          textAlign: 'center',
          outline: { color: '#ff0000', width: 2 },
        },
        animation: { type: 'typewriter', duration: 2 },
      },
      {
        id: 'date',
        type: 'text',
        content: '01.01.2025',
        start: 2,
        end: 10,
        position: { x: 50, y: 60 },
        scale: 1,
        rotation: 0,
        style: {
          fontFamily: 'Courier New',
          fontSize: 36,
          color: '#ff4444',
          fontWeight: 700,
          fontStyle: 'normal',
          textAlign: 'center',
        },
        animation: { type: 'pop', duration: 0.5 },
      },
    ],
    globalFilter: {
      brightness: 95,
      contrast: 120,
      saturation: 100,
      temperature: 0,
      blur: 0,
    },
  },
];

export function TemplatePicker({ onApplyTemplate }: TemplatePickerProps) {
  const [templates, setTemplates] = useState<EditorTemplate[]>(BUILT_IN_TEMPLATES);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Filter templates by search
  const filteredTemplates = templates.filter(
    (template) =>
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleApplyTemplate = (template: EditorTemplate) => {
    setSelectedId(template.id);
    onApplyTemplate(template);
    toast({
      title: 'Template applied',
      description: `"${template.name}" has been applied to your project`,
    });
  };

  const formatDuration = (seconds: number): string => {
    return `${seconds}s`;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 space-y-3 border-b border-border">
        <div className="flex items-center gap-2">
          <LayoutTemplate className="h-4 w-4" />
          <h3 className="text-sm font-medium">Templates</h3>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
      </div>

      {/* Template grid */}
      <ScrollArea className="flex-1">
        <div className="p-3 grid grid-cols-2 gap-3">
          {isLoading ? (
            <div className="col-span-2 flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="col-span-2 text-center py-8 text-sm text-muted-foreground">
              No templates found
            </div>
          ) : (
            filteredTemplates.map((template) => (
              <button
                key={template.id}
                className={cn(
                  'relative rounded-lg border overflow-hidden transition-all hover:ring-2 hover:ring-primary/50',
                  selectedId === template.id && 'ring-2 ring-primary'
                )}
                onClick={() => handleApplyTemplate(template)}
              >
                {/* Thumbnail */}
                <div className="aspect-[9/16] bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
                  <LayoutTemplate className="h-8 w-8 text-muted-foreground/50" />
                </div>

                {/* Info overlay */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/90 to-transparent p-2">
                  <p className="text-xs font-medium truncate">{template.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDuration(template.duration)}
                  </p>
                </div>

                {/* Selected check */}
                {selectedId === template.id && (
                  <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
                    <Check className="h-3 w-3" />
                  </div>
                )}
              </button>
            ))
          )}
        </div>
      </ScrollArea>

      <div className="p-3 border-t border-border">
        <p className="text-xs text-muted-foreground text-center">
          {templates.length} templates available
        </p>
      </div>
    </div>
  );
}
