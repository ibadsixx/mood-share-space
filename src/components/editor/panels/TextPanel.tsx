import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Type, Plus, AlignLeft, AlignCenter, AlignRight, Italic, CaseSensitive } from 'lucide-react';
import { TextLayer, TextStyle, TextAnimation, defaultTextStyle } from '@/types/editor';

interface TextPanelProps {
  onAddText: (text: Omit<TextLayer, 'id' | 'start' | 'end'>) => void;
  selectedText?: TextLayer;
  onUpdateText?: (id: string, updates: Partial<TextLayer>) => void;
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

const TEXT_TRANSFORMS = [
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
];

export function TextPanel({ onAddText, selectedText, onUpdateText }: TextPanelProps) {
  const [newText, setNewText] = useState('Add your text');
  const [style, setStyle] = useState<TextStyle>(defaultTextStyle);
  const [animation, setAnimation] = useState<TextAnimation>({ type: 'none', duration: 0.5 });

  const handleAddText = () => {
    if (!newText.trim()) return;
    
    onAddText({
      type: 'text',
      content: newText,
      position: { x: 50, y: 50 },
      scale: 1,
      rotation: 0,
      style,
      animation: animation.type !== 'none' ? animation : undefined,
    });
    
    setNewText('Add your text');
  };

  const handleStyleChange = <K extends keyof TextStyle>(key: K, value: TextStyle[K]) => {
    const newStyle = { ...style, [key]: value };
    setStyle(newStyle);
    
    if (selectedText && onUpdateText) {
      onUpdateText(selectedText.id, { style: newStyle });
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Type className="h-4 w-4" />
        <span>Text</span>
      </div>

      {/* Add New Text */}
      <div className="space-y-2">
        <Label className="text-xs">Add Text</Label>
        <div className="flex gap-2">
          <Input
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            className="text-sm"
            placeholder="Enter text..."
          />
          <Button size="sm" onClick={handleAddText}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Font Family */}
      <div className="space-y-2">
        <Label className="text-xs">Font</Label>
        <Select value={style.fontFamily} onValueChange={(v) => handleStyleChange('fontFamily', v)}>
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FONT_OPTIONS.map(font => (
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
          <span className="text-xs text-muted-foreground">{style.fontSize}px</span>
        </div>
        <Slider
          value={[style.fontSize]}
          onValueChange={(v) => handleStyleChange('fontSize', v[0])}
          min={12}
          max={120}
          step={1}
        />
      </div>

      {/* Font Weight */}
      <div className="space-y-2">
        <Label className="text-xs">Weight</Label>
        <Select value={String(style.fontWeight)} onValueChange={(v) => handleStyleChange('fontWeight', Number(v))}>
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FONT_WEIGHTS.map(weight => (
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
          variant={style.fontStyle === 'italic' ? 'default' : 'outline'}
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => handleStyleChange('fontStyle', style.fontStyle === 'italic' ? 'normal' : 'italic')}
          title="Italic"
        >
          <Italic className="h-4 w-4" />
        </Button>
        <div className="flex-1" />
        <Button
          variant={style.textAlign === 'left' ? 'default' : 'outline'}
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => handleStyleChange('textAlign', 'left')}
        >
          <AlignLeft className="h-4 w-4" />
        </Button>
        <Button
          variant={style.textAlign === 'center' ? 'default' : 'outline'}
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => handleStyleChange('textAlign', 'center')}
        >
          <AlignCenter className="h-4 w-4" />
        </Button>
        <Button
          variant={style.textAlign === 'right' ? 'default' : 'outline'}
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
        <Select value={style.textTransform || 'none'} onValueChange={(v) => handleStyleChange('textTransform', v as TextStyle['textTransform'])}>
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TEXT_TRANSFORMS.map(transform => (
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
          {COLOR_PRESETS.map(color => (
            <button
              key={color}
              className={`w-6 h-6 rounded border-2 ${style.color === color ? 'border-primary' : 'border-transparent'}`}
              style={{ backgroundColor: color }}
              onClick={() => handleStyleChange('color', color)}
            />
          ))}
          <input
            type="color"
            value={style.color}
            onChange={(e) => handleStyleChange('color', e.target.value)}
            className="w-6 h-6 rounded cursor-pointer"
          />
        </div>
      </div>

      {/* Animation */}
      <div className="space-y-2">
        <Label className="text-xs">Animation</Label>
        <Select 
          value={animation.type} 
          onValueChange={(v) => setAnimation({ ...animation, type: v as TextAnimation['type'] })}
        >
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ANIMATION_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Shadow Toggle */}
      <div className="space-y-2">
        <Label className="text-xs">Effects</Label>
        <div className="flex gap-2">
          <Button
            variant={style.shadow ? 'default' : 'outline'}
            size="sm"
            className="text-xs h-8"
            onClick={() => handleStyleChange('shadow', style.shadow ? undefined : {
              color: 'rgba(0,0,0,0.5)',
              blur: 4,
              offsetX: 2,
              offsetY: 2,
            })}
          >
            Shadow
          </Button>
          <Button
            variant={style.outline ? 'default' : 'outline'}
            size="sm"
            className="text-xs h-8"
            onClick={() => handleStyleChange('outline', style.outline ? undefined : {
              color: '#000000',
              width: 2,
            })}
          >
            Outline
          </Button>
        </div>
      </div>
    </div>
  );
}
