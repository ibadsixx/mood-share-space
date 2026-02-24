import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Type, Trash2, AlignLeft, AlignCenter, AlignRight, 
  Italic, Underline, Copy, RotateCcw
} from 'lucide-react';
import { TextLayer, TextStyle, TextAnimation } from '@/types/editor';

interface TextLayerEditorProps {
  layer: TextLayer;
  onUpdate: (updates: Partial<TextLayer>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

const FONT_OPTIONS = [
  { id: 'inter', name: 'Inter', css: "'Inter', sans-serif" },
  { id: 'poppins', name: 'Poppins', css: "'Poppins', sans-serif" },
  { id: 'montserrat', name: 'Montserrat', css: "'Montserrat', sans-serif" },
  { id: 'roboto', name: 'Roboto', css: "'Roboto', sans-serif" },
  { id: 'open-sans', name: 'Open Sans', css: "'Open Sans', sans-serif" },
  { id: 'playfair', name: 'Playfair Display', css: "'Playfair Display', serif" },
  { id: 'bebas', name: 'Bebas Neue', css: "'Bebas Neue', sans-serif" },
  { id: 'oswald', name: 'Oswald', css: "'Oswald', sans-serif" },
  { id: 'lato', name: 'Lato', css: "'Lato', sans-serif" },
  { id: 'dancing', name: 'Dancing Script', css: "'Dancing Script', cursive" },
  { id: 'georgia', name: 'Georgia', css: "'Georgia', serif" },
  { id: 'arial', name: 'Arial', css: "'Arial', sans-serif" },
  { id: 'times', name: 'Times New Roman', css: "'Times New Roman', serif" },
  { id: 'courier', name: 'Courier New', css: "'Courier New', monospace" },
  { id: 'mono', name: 'Monospace', css: "monospace" },
];

const FONT_WEIGHTS = [
  { value: 300, label: 'Light' },
  { value: 400, label: 'Regular' },
  { value: 500, label: 'Medium' },
  { value: 600, label: 'SemiBold' },
  { value: 700, label: 'Bold' },
  { value: 800, label: 'ExtraBold' },
];

const TEXT_TRANSFORMS: { value: NonNullable<TextStyle['textTransform']>; label: string }[] = [
  { value: 'none', label: 'Normal' },
  { value: 'uppercase', label: 'UPPERCASE' },
  { value: 'lowercase', label: 'lowercase' },
  { value: 'capitalize', label: 'Capitalize' },
];

const ANIMATION_OPTIONS: { value: TextAnimation['type']; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'fade', label: 'Fade In' },
  { value: 'pop', label: 'Pop' },
  { value: 'slide-up', label: 'Slide Up' },
  { value: 'slide-down', label: 'Slide Down' },
  { value: 'slide-left', label: 'Slide Left' },
  { value: 'slide-right', label: 'Slide Right' },
  { value: 'typewriter', label: 'Typewriter' },
];

const COLOR_PRESETS = [
  '#ffffff', '#000000', '#ff0000', '#00ff00', '#0000ff',
  '#ffff00', '#ff00ff', '#00ffff', '#ff6b6b', '#4ecdc4',
  '#45b7d1', '#96ceb4', '#ffeaa7', '#dfe6e9', '#fd79a8',
];

export function TextLayerEditor({ layer, onUpdate, onDelete, onDuplicate }: TextLayerEditorProps) {
  const [activeTab, setActiveTab] = useState('style');

  const handleStyleChange = <K extends keyof TextStyle>(key: K, value: TextStyle[K]) => {
    onUpdate({
      style: { ...layer.style, [key]: value },
    });
  };

  const handleTimingChange = (key: 'start' | 'end', value: number) => {
    onUpdate({ [key]: value });
  };

  const handleReset = () => {
    onUpdate({
      scale: 1,
      rotation: 0,
      style: {
        fontFamily: 'Inter',
        fontSize: 32,
        color: '#ffffff',
        fontWeight: 700,
        fontStyle: 'normal',
        textAlign: 'center',
        textTransform: 'none',
        backgroundColor: undefined,
        shadow: undefined,
        outline: undefined,
      },
    });
  };

  return (
    <div className="space-y-4 max-h-[600px] overflow-y-auto">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <Type className="h-4 w-4" />
          Edit Text Layer
        </h3>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleReset} title="Reset styles">
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onDuplicate}>
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Text Content */}
      <div className="space-y-2">
        <Label className="text-xs">Text Content</Label>
        <Input
          value={layer.content}
          onChange={(e) => onUpdate({ content: e.target.value })}
          placeholder="Enter text..."
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full">
          <TabsTrigger value="style" className="flex-1 text-xs">Style</TabsTrigger>
          <TabsTrigger value="effects" className="flex-1 text-xs">Effects</TabsTrigger>
          <TabsTrigger value="transform" className="flex-1 text-xs">Transform</TabsTrigger>
        </TabsList>

        <TabsContent value="style" className="space-y-4 mt-4">
          {/* Font Family */}
          <div className="space-y-2">
            <Label className="text-xs">Font</Label>
            <Select
              value={layer.style.fontFamily}
              onValueChange={(v) => handleStyleChange('fontFamily', v)}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FONT_OPTIONS.map((font) => (
                  <SelectItem key={font.id} value={font.name} style={{ fontFamily: font.css }}>
                    {font.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Font Size */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Size</Label>
              <span className="text-xs text-muted-foreground">{layer.style.fontSize}px</span>
            </div>
            <Slider
              value={[layer.style.fontSize]}
              onValueChange={(v) => handleStyleChange('fontSize', v[0])}
              min={8}
              max={200}
              step={1}
            />
          </div>

          {/* Font Weight */}
          <div className="space-y-2">
            <Label className="text-xs">Weight</Label>
            <Select
              value={String(layer.style.fontWeight)}
              onValueChange={(v) => handleStyleChange('fontWeight', Number(v))}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FONT_WEIGHTS.map((weight) => (
                  <SelectItem key={weight.value} value={String(weight.value)}>
                    {weight.label} ({weight.value})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Font Style & Alignment Buttons */}
          <div className="flex gap-2">
            <Button
              variant={layer.style.fontStyle === 'italic' ? 'default' : 'outline'}
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => handleStyleChange('fontStyle', layer.style.fontStyle === 'italic' ? 'normal' : 'italic')}
              title="Italic"
            >
              <Italic className="h-4 w-4" />
            </Button>
            <Button
              variant={layer.style.textDecoration === 'underline' ? 'default' : 'outline'}
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => {
                const current = layer.style.textDecoration;
                handleStyleChange('textDecoration', current === 'underline' ? 'none' : 'underline');
              }}
              title="Underline"
            >
              <Underline className="h-4 w-4" />
            </Button>
            <div className="flex-1" />
            <Button
              variant={layer.style.textAlign === 'left' ? 'default' : 'outline'}
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => handleStyleChange('textAlign', 'left')}
            >
              <AlignLeft className="h-4 w-4" />
            </Button>
            <Button
              variant={layer.style.textAlign === 'center' ? 'default' : 'outline'}
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => handleStyleChange('textAlign', 'center')}
            >
              <AlignCenter className="h-4 w-4" />
            </Button>
            <Button
              variant={layer.style.textAlign === 'right' ? 'default' : 'outline'}
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => handleStyleChange('textAlign', 'right')}
            >
              <AlignRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Text Transform */}
          <div className="space-y-2">
            <Label className="text-xs">Transform</Label>
            <Select
              value={layer.style.textTransform || 'none'}
              onValueChange={(v) => handleStyleChange('textTransform', v as TextStyle['textTransform'])}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TEXT_TRANSFORMS.map((transform) => (
                  <SelectItem key={transform.value} value={transform.value}>
                    {transform.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Text Color */}
          <div className="space-y-2">
            <Label className="text-xs">Color</Label>
            <div className="flex gap-1 flex-wrap">
              {COLOR_PRESETS.map((color) => (
                <button
                  key={color}
                  className={`w-6 h-6 rounded border-2 ${
                    layer.style.color === color ? 'border-primary' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => handleStyleChange('color', color)}
                />
              ))}
              <input
                type="color"
                value={layer.style.color}
                onChange={(e) => handleStyleChange('color', e.target.value)}
                className="w-6 h-6 rounded cursor-pointer"
              />
            </div>
          </div>

          {/* Background Color */}
          <div className="space-y-2">
            <Label className="text-xs">Background</Label>
            <div className="flex gap-2 items-center">
              <Button
                variant={layer.style.backgroundColor ? 'outline' : 'default'}
                size="sm"
                className="text-xs h-7"
                onClick={() => handleStyleChange('backgroundColor', layer.style.backgroundColor ? undefined : 'rgba(0,0,0,0.5)')}
              >
                {layer.style.backgroundColor ? 'Remove' : 'Add Background'}
              </Button>
              {layer.style.backgroundColor && (
                <input
                  type="color"
                  value={layer.style.backgroundColor.startsWith('rgba') ? '#000000' : layer.style.backgroundColor}
                  onChange={(e) => handleStyleChange('backgroundColor', e.target.value)}
                  className="w-6 h-6 rounded cursor-pointer"
                />
              )}
            </div>
          </div>

          {/* Line Height */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Line Height</Label>
              <span className="text-xs text-muted-foreground">{(layer.style.lineHeight || 1.2).toFixed(1)}</span>
            </div>
            <Slider
              value={[layer.style.lineHeight || 1.2]}
              onValueChange={(v) => handleStyleChange('lineHeight', v[0])}
              min={0.8}
              max={3}
              step={0.1}
            />
          </div>

          {/* Letter Spacing */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Letter Spacing</Label>
              <span className="text-xs text-muted-foreground">{(layer.style.letterSpacing || 0)}px</span>
            </div>
            <Slider
              value={[layer.style.letterSpacing || 0]}
              onValueChange={(v) => handleStyleChange('letterSpacing', v[0])}
              min={-5}
              max={20}
              step={0.5}
            />
          </div>
        </TabsContent>

        <TabsContent value="effects" className="space-y-4 mt-4">
          {/* Shadow */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Shadow</Label>
              <Button
                variant={layer.style.shadow ? 'default' : 'outline'}
                size="sm"
                className="text-xs h-6"
                onClick={() =>
                  handleStyleChange(
                    'shadow',
                    layer.style.shadow
                      ? undefined
                      : { color: 'rgba(0,0,0,0.5)', blur: 4, offsetX: 2, offsetY: 2 }
                  )
                }
              >
                {layer.style.shadow ? 'On' : 'Off'}
              </Button>
            </div>
            {layer.style.shadow && (
              <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Blur</span>
                    <span className="text-xs">{layer.style.shadow.blur}px</span>
                  </div>
                  <Slider
                    value={[layer.style.shadow.blur]}
                    onValueChange={(v) =>
                      handleStyleChange('shadow', { ...layer.style.shadow!, blur: v[0] })
                    }
                    min={0}
                    max={30}
                    step={1}
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Offset X</span>
                    <span className="text-xs">{layer.style.shadow.offsetX}px</span>
                  </div>
                  <Slider
                    value={[layer.style.shadow.offsetX]}
                    onValueChange={(v) =>
                      handleStyleChange('shadow', { ...layer.style.shadow!, offsetX: v[0] })
                    }
                    min={-20}
                    max={20}
                    step={1}
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Offset Y</span>
                    <span className="text-xs">{layer.style.shadow.offsetY}px</span>
                  </div>
                  <Slider
                    value={[layer.style.shadow.offsetY]}
                    onValueChange={(v) =>
                      handleStyleChange('shadow', { ...layer.style.shadow!, offsetY: v[0] })
                    }
                    min={-20}
                    max={20}
                    step={1}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Color</span>
                  <input
                    type="color"
                    value="#000000"
                    onChange={(e) =>
                      handleStyleChange('shadow', { ...layer.style.shadow!, color: e.target.value })
                    }
                    className="w-6 h-6 rounded cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Outline */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Outline / Stroke</Label>
              <Button
                variant={layer.style.outline ? 'default' : 'outline'}
                size="sm"
                className="text-xs h-6"
                onClick={() =>
                  handleStyleChange(
                    'outline',
                    layer.style.outline ? undefined : { color: '#000000', width: 2 }
                  )
                }
              >
                {layer.style.outline ? 'On' : 'Off'}
              </Button>
            </div>
            {layer.style.outline && (
              <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Width</span>
                    <span className="text-xs">{layer.style.outline.width}px</span>
                  </div>
                  <Slider
                    value={[layer.style.outline.width]}
                    onValueChange={(v) =>
                      handleStyleChange('outline', { ...layer.style.outline!, width: v[0] })
                    }
                    min={1}
                    max={10}
                    step={0.5}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Color</span>
                  <input
                    type="color"
                    value={layer.style.outline.color}
                    onChange={(e) =>
                      handleStyleChange('outline', { ...layer.style.outline!, color: e.target.value })
                    }
                    className="w-6 h-6 rounded cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Animation */}
          <div className="space-y-2">
            <Label className="text-xs">Animation</Label>
            <Select
              value={layer.animation?.type || 'none'}
              onValueChange={(v) =>
                onUpdate({
                  animation: {
                    type: v as TextAnimation['type'],
                    duration: layer.animation?.duration || 0.5,
                  },
                })
              }
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ANIMATION_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {layer.animation && layer.animation.type !== 'none' && (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Duration</span>
                  <span className="text-xs">{layer.animation.duration}s</span>
                </div>
                <Slider
                  value={[layer.animation.duration]}
                  onValueChange={(v) =>
                    onUpdate({
                      animation: { ...layer.animation!, duration: v[0] },
                    })
                  }
                  min={0.1}
                  max={3}
                  step={0.1}
                />
              </div>
            )}
          </div>

          {/* Opacity */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Opacity</Label>
              <span className="text-xs text-muted-foreground">{Math.round(((layer as any).opacity ?? 1) * 100)}%</span>
            </div>
            <Slider
              value={[((layer as any).opacity ?? 1) * 100]}
              onValueChange={(v) => onUpdate({ opacity: v[0] / 100 } as any)}
              min={0}
              max={100}
              step={1}
            />
          </div>
        </TabsContent>

        <TabsContent value="transform" className="space-y-4 mt-4">
          {/* Scale */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Scale</Label>
              <span className="text-xs text-muted-foreground">{(layer.scale * 100).toFixed(0)}%</span>
            </div>
            <Slider
              value={[layer.scale * 100]}
              onValueChange={(v) => onUpdate({ scale: v[0] / 100 })}
              min={10}
              max={300}
              step={1}
            />
          </div>

          {/* Rotation */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Rotation</Label>
              <span className="text-xs text-muted-foreground">{layer.rotation}°</span>
            </div>
            <Slider
              value={[layer.rotation]}
              onValueChange={(v) => onUpdate({ rotation: v[0] })}
              min={-180}
              max={180}
              step={1}
            />
          </div>

          {/* Position */}
          <div className="space-y-2">
            <Label className="text-xs">Position</Label>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">X: {layer.position.x.toFixed(0)}%</span>
                <Slider
                  value={[layer.position.x]}
                  onValueChange={(v) => onUpdate({ position: { ...layer.position, x: v[0] } })}
                  min={0}
                  max={100}
                  step={1}
                />
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Y: {layer.position.y.toFixed(0)}%</span>
                <Slider
                  value={[layer.position.y]}
                  onValueChange={(v) => onUpdate({ position: { ...layer.position, y: v[0] } })}
                  min={0}
                  max={100}
                  step={1}
                />
              </div>
            </div>
          </div>

          {/* Timing */}
          <div className="space-y-2">
            <Label className="text-xs">Timing (seconds)</Label>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Start</span>
                <Input
                  type="number"
                  value={layer.start}
                  onChange={(e) => handleTimingChange('start', parseFloat(e.target.value) || 0)}
                  min={0}
                  step={0.1}
                  className="h-8"
                />
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">End</span>
                <Input
                  type="number"
                  value={layer.end}
                  onChange={(e) => handleTimingChange('end', parseFloat(e.target.value) || 0)}
                  min={layer.start + 0.1}
                  step={0.1}
                  className="h-8"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Duration: {(layer.end - layer.start).toFixed(1)}s
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
