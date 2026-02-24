import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { MediaControlsSettings } from '@/hooks/useMediaControls';
import { Separator } from '@/components/ui/separator';

interface SettingsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: MediaControlsSettings;
  onSpeedChange: (speed: number) => void;
  onQualityChange: (quality: MediaControlsSettings['quality']) => void;
  onLoopToggle: () => void;
  onAutoReplayToggle: () => void;
  onShowControlsToggle: () => void;
  showQualitySelector?: boolean;
}

const SettingsPanel = ({
  open,
  onOpenChange,
  settings,
  onSpeedChange,
  onQualityChange,
  onLoopToggle,
  onAutoReplayToggle,
  onShowControlsToggle,
  showQualitySelector = true
}: SettingsPanelProps) => {
  const speedOptions = [
    { value: 0.5, label: '0.5x' },
    { value: 1, label: '1x (Normal)' },
    { value: 1.25, label: '1.25x' },
    { value: 1.5, label: '1.5x' }
  ];

  const qualityOptions = [
    { value: 'auto', label: 'Auto' },
    { value: '360p', label: 'Low (360p)' },
    { value: '720p', label: 'Medium (720p)' },
    { value: '1080p', label: 'High (1080p)' }
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[90vw] sm:w-[400px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Playback Settings</SheetTitle>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Playback Speed */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Playback Speed</Label>
            <RadioGroup
              value={settings.speed.toString()}
              onValueChange={(value) => onSpeedChange(parseFloat(value))}
            >
              {speedOptions.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={option.value.toString()} id={`speed-${option.value}`} />
                  <Label htmlFor={`speed-${option.value}`} className="cursor-pointer font-normal">
                    {option.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
            <p className="text-xs text-muted-foreground">
              Note: Speed only affects video, not music playback
            </p>
          </div>

          <Separator />

          {/* Quality Selector (Reels only) */}
          {showQualitySelector && (
            <>
              <div className="space-y-3">
                <Label className="text-base font-semibold">Video Quality</Label>
                <RadioGroup
                  value={settings.quality}
                  onValueChange={(value) => onQualityChange(value as MediaControlsSettings['quality'])}
                >
                  {qualityOptions.map((option) => (
                    <div key={option.value} className="flex items-center space-x-2">
                      <RadioGroupItem value={option.value} id={`quality-${option.value}`} />
                      <Label htmlFor={`quality-${option.value}`} className="cursor-pointer font-normal">
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
              <Separator />
            </>
          )}

          {/* Loop */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base font-semibold">Loop</Label>
              <p className="text-sm text-muted-foreground">
                Replay video and music when it ends
              </p>
            </div>
            <Switch
              checked={settings.loop}
              onCheckedChange={onLoopToggle}
            />
          </div>

          <Separator />

          {/* Auto-Replay */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base font-semibold">Auto-Replay</Label>
              <p className="text-sm text-muted-foreground">
                Automatically replay after finishing
              </p>
            </div>
            <Switch
              checked={settings.autoReplay}
              onCheckedChange={onAutoReplayToggle}
            />
          </div>

          <Separator />

          {/* Show Controls */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base font-semibold">Show Controls</Label>
              <p className="text-sm text-muted-foreground">
                Display playback controls overlay
              </p>
            </div>
            <Switch
              checked={settings.showControls}
              onCheckedChange={onShowControlsToggle}
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default SettingsPanel;
