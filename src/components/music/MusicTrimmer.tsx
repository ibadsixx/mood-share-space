import { useState } from 'react';
import { Slider } from '@/components/ui/slider';
import { formatDuration } from '@/utils/formatDuration';

interface MusicTrimmerProps {
  duration: number;
  onSelectSegment: (startAt: number, endAt: number) => void;
  initialStart?: number;
  initialEnd?: number;
  maxSegmentDuration?: number; // Max segment duration (default 15s)
}

export const MusicTrimmer = ({ 
  duration, 
  onSelectSegment,
  initialStart = 0,
  initialEnd = 15,
  maxSegmentDuration = 15
}: MusicTrimmerProps) => {
  const [startAt, setStartAt] = useState(initialStart);
  const [endAt, setEndAt] = useState(Math.min(initialEnd, initialStart + maxSegmentDuration, duration));

  const handleStartChange = (values: number[]) => {
    const newStart = values[0];
    const newEnd = Math.min(newStart + maxSegmentDuration, duration);
    setStartAt(newStart);
    setEndAt(newEnd);
    onSelectSegment(newStart, newEnd);
  };

  const handleEndChange = (values: number[]) => {
    const newEnd = values[0];
    const constrainedEnd = Math.min(newEnd, startAt + maxSegmentDuration, duration);
    setEndAt(constrainedEnd);
    onSelectSegment(startAt, constrainedEnd);
  };

  const segmentDuration = endAt - startAt;

  return (
    <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
      <div className="text-sm text-muted-foreground text-center">
        Select music segment (max {maxSegmentDuration} seconds)
      </div>
      
      <div className="flex justify-between text-sm font-medium">
        <span>Start: {formatDuration(startAt)}</span>
        <span className="text-primary">Duration: {formatDuration(segmentDuration)}</span>
        <span>End: {formatDuration(endAt)}</span>
      </div>

      <div className="space-y-4">
        {/* Start time slider */}
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">Start Time</label>
          <Slider
            min={0}
            max={Math.max(0, duration - 1)}
            step={1}
            value={[startAt]}
            onValueChange={handleStartChange}
            className="w-full"
          />
        </div>

        {/* End time slider */}
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">End Time</label>
          <Slider
            min={startAt + 1}
            max={Math.min(startAt + maxSegmentDuration, duration)}
            step={1}
            value={[endAt]}
            onValueChange={handleEndChange}
            className="w-full"
          />
        </div>

        <div className="flex justify-between text-xs text-muted-foreground">
          <span>0:00</span>
          <span>{formatDuration(duration)}</span>
        </div>
      </div>
    </div>
  );
};
