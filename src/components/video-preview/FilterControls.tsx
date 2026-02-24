import { VideoFilter } from '@/types/videoEditing';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Sun, Contrast, Droplets, Thermometer, Circle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface FilterControlsProps {
  filter: VideoFilter;
  onChange: (filter: VideoFilter) => void;
}

// City-inspired filter presets
const cityPresets = [
  { name: 'Paris', filter: { brightness: 105, contrast: 95, saturation: 90, temperature: 15, blur: 0 } },
  { name: 'Los Angeles', filter: { brightness: 110, contrast: 115, saturation: 130, temperature: 20, blur: 0 } },
  { name: 'Oslo', filter: { brightness: 100, contrast: 105, saturation: 70, temperature: -25, blur: 0 } },
  { name: 'Lagos', filter: { brightness: 108, contrast: 110, saturation: 125, temperature: 25, blur: 0 } },
  { name: 'Melbourne', filter: { brightness: 100, contrast: 100, saturation: 95, temperature: 0, blur: 0 } },
  { name: 'Jakarta', filter: { brightness: 105, contrast: 105, saturation: 110, temperature: 15, blur: 0 } },
  { name: 'Abu Dhabi', filter: { brightness: 112, contrast: 105, saturation: 105, temperature: 35, blur: 0 } },
  { name: 'Buenos Aires', filter: { brightness: 98, contrast: 120, saturation: 85, temperature: 5, blur: 0 } },
  { name: 'New York', filter: { brightness: 95, contrast: 130, saturation: 90, temperature: -15, blur: 0 } },
  { name: 'Jaipur', filter: { brightness: 108, contrast: 110, saturation: 120, temperature: 30, blur: 0 } },
  { name: 'Cairo', filter: { brightness: 110, contrast: 108, saturation: 95, temperature: 40, blur: 0 } },
  { name: 'Tokyo', filter: { brightness: 100, contrast: 125, saturation: 115, temperature: -20, blur: 0 } },
  { name: 'Rio de Janeiro', filter: { brightness: 112, contrast: 115, saturation: 140, temperature: 20, blur: 0 } },
];

// Basic presets
const basicPresets = [
  { name: 'None', filter: { brightness: 100, contrast: 100, saturation: 100, temperature: 0, blur: 0 } },
  { name: 'Warm', filter: { brightness: 105, contrast: 105, saturation: 110, temperature: 30, blur: 0 } },
  { name: 'Cold', filter: { brightness: 100, contrast: 110, saturation: 90, temperature: -30, blur: 0 } },
  { name: 'Vivid', filter: { brightness: 105, contrast: 120, saturation: 130, temperature: 10, blur: 0 } },
  { name: 'Fade', filter: { brightness: 110, contrast: 85, saturation: 80, temperature: 0, blur: 0 } },
  { name: 'B&W', filter: { brightness: 100, contrast: 110, saturation: 0, temperature: 0, blur: 0 } },
];

export function FilterControls({ filter, onChange }: FilterControlsProps) {
  const handleChange = (key: keyof VideoFilter, value: number) => {
    onChange({ ...filter, [key]: value });
  };

  const isFilterActive = (preset: VideoFilter): boolean => {
    return (
      filter.brightness === preset.brightness &&
      filter.contrast === preset.contrast &&
      filter.saturation === preset.saturation &&
      filter.temperature === preset.temperature
    );
  };

  return (
    <div className="space-y-4">
      {/* City Filter Presets */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">City Filters</Label>
        <div className="flex flex-wrap gap-2">
          {cityPresets.map((preset) => (
            <button
              key={preset.name}
              onClick={() => onChange(preset.filter)}
              className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                isFilterActive(preset.filter)
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border hover:bg-accent'
              }`}
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* Basic Presets */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">Basic Presets</Label>
        <div className="flex flex-wrap gap-2">
          {basicPresets.map((preset) => (
            <button
              key={preset.name}
              onClick={() => onChange(preset.filter)}
              className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                isFilterActive(preset.filter)
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border hover:bg-accent'
              }`}
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* Manual Controls */}
      <div className="space-y-3 pt-2 border-t border-border">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Sun className="h-4 w-4 text-muted-foreground" />
            <Label className="text-xs">Brightness</Label>
            <span className="ml-auto text-xs text-muted-foreground">{filter.brightness}%</span>
          </div>
          <Slider
            value={[filter.brightness]}
            onValueChange={([v]) => handleChange('brightness', v)}
            min={0}
            max={200}
            step={1}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Contrast className="h-4 w-4 text-muted-foreground" />
            <Label className="text-xs">Contrast</Label>
            <span className="ml-auto text-xs text-muted-foreground">{filter.contrast}%</span>
          </div>
          <Slider
            value={[filter.contrast]}
            onValueChange={([v]) => handleChange('contrast', v)}
            min={0}
            max={200}
            step={1}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Droplets className="h-4 w-4 text-muted-foreground" />
            <Label className="text-xs">Saturation</Label>
            <span className="ml-auto text-xs text-muted-foreground">{filter.saturation}%</span>
          </div>
          <Slider
            value={[filter.saturation]}
            onValueChange={([v]) => handleChange('saturation', v)}
            min={0}
            max={200}
            step={1}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Thermometer className="h-4 w-4 text-muted-foreground" />
            <Label className="text-xs">Temperature</Label>
            <span className="ml-auto text-xs text-muted-foreground">{filter.temperature}</span>
          </div>
          <Slider
            value={[filter.temperature]}
            onValueChange={([v]) => handleChange('temperature', v)}
            min={-100}
            max={100}
            step={1}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Circle className="h-4 w-4 text-muted-foreground" />
            <Label className="text-xs">Blur</Label>
            <span className="ml-auto text-xs text-muted-foreground">{filter.blur}px</span>
          </div>
          <Slider
            value={[filter.blur]}
            onValueChange={([v]) => handleChange('blur', v)}
            min={0}
            max={20}
            step={0.5}
          />
        </div>
      </div>
    </div>
  );
}
