// TimeScale - Enhanced time ruler with major/minor ticks based on zoom level
// Dynamic tick density for professional editing experience

import { useMemo } from 'react';

interface TimeScaleProps {
  duration: number;
  pixelsPerSecond: number;
  trackLabelWidth: number;
}

interface TickMark {
  time: number;
  type: 'major' | 'minor' | 'sub';
}

export function TimeScale({ duration, pixelsPerSecond, trackLabelWidth }: TimeScaleProps) {
  // Format time as mm:ss or mm:ss.d based on zoom level
  const formatTime = (seconds: number, showTenths: boolean = false): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    
    if (showTenths) {
      const tenths = Math.floor((seconds % 1) * 10);
      return `${mins}:${secs.toString().padStart(2, '0')}.${tenths}`;
    }
    
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate tick marks based on zoom level
  // More zoomed in = more ticks, different intervals
  const { ticks, showTenths, majorInterval } = useMemo(() => {
    const marks: TickMark[] = [];
    
    // Determine intervals based on pixels per second
    let major: number; // Major tick interval (labeled)
    let minor: number; // Minor tick interval (unlabeled tall)
    let sub: number;   // Sub tick interval (unlabeled short)
    let useTenths = false;
    
    if (pixelsPerSecond >= 200) {
      // Very zoomed in: 0.1s sub, 0.5s minor, 1s major
      major = 1;
      minor = 0.5;
      sub = 0.1;
      useTenths = true;
    } else if (pixelsPerSecond >= 100) {
      // Zoomed in: 0.25s sub, 1s minor, 5s major  
      major = 5;
      minor = 1;
      sub = 0.25;
      useTenths = true;
    } else if (pixelsPerSecond >= 50) {
      // Medium zoom: 0.5s sub, 1s minor, 5s major
      major = 5;
      minor = 1;
      sub = 0.5;
    } else if (pixelsPerSecond >= 25) {
      // Less zoomed: 1s sub, 5s minor, 10s major
      major = 10;
      minor = 5;
      sub = 1;
    } else if (pixelsPerSecond >= 15) {
      // Zoomed out: 5s sub, 10s minor, 30s major
      major = 30;
      minor = 10;
      sub = 5;
    } else {
      // Very zoomed out: 10s sub, 30s minor, 60s major
      major = 60;
      minor = 30;
      sub = 10;
    }

    const endTime = duration + major; // Extend past duration
    
    // Generate all tick marks
    for (let t = 0; t <= endTime; t = Math.round((t + sub) * 1000) / 1000) {
      const isMajor = Math.abs(t % major) < 0.001 || Math.abs((t % major) - major) < 0.001;
      const isMinor = Math.abs(t % minor) < 0.001 || Math.abs((t % minor) - minor) < 0.001;
      
      marks.push({
        time: t,
        type: isMajor ? 'major' : isMinor ? 'minor' : 'sub',
      });
    }
    
    console.log('[TimeScale] Generated', marks.length, 'ticks, interval:', major, 's, pps:', pixelsPerSecond.toFixed(0));
    
    return { ticks: marks, showTenths: useTenths, majorInterval: major };
  }, [duration, pixelsPerSecond]);

  return (
    <div 
      className="h-8 border-b border-border relative bg-gradient-to-b from-muted/30 to-muted/10 select-none"
      style={{ marginLeft: `${trackLabelWidth}px` }}
    >
      {/* Ticks and labels */}
      {ticks.map((tick, i) => {
        const x = tick.time * pixelsPerSecond;
        
        // Skip rendering if too close to previous major label (to prevent overlap)
        if (tick.type === 'major' && tick.time > 0) {
          const labelWidth = showTenths ? 50 : 35;
          // Find last major tick before this one (ES5 compatible)
          const prevMajors = ticks.slice(0, i).filter(t => t.type === 'major');
          const prevMajor = prevMajors.length > 0 ? prevMajors[prevMajors.length - 1] : null;
          if (prevMajor && (x - prevMajor.time * pixelsPerSecond) < labelWidth) {
            return null;
          }
        }
        
        return (
          <div
            key={`${tick.type}-${tick.time}`}
            className="absolute top-0 flex flex-col items-center"
            style={{ left: `${x}px` }}
          >
            {/* Tick line */}
            <div 
              className={`
                ${tick.type === 'major' ? 'h-4 w-px bg-foreground/60' : ''}
                ${tick.type === 'minor' ? 'h-2.5 w-px bg-foreground/40' : ''}
                ${tick.type === 'sub' ? 'h-1.5 w-px bg-foreground/20' : ''}
              `}
            />
            
            {/* Time label for major ticks */}
            {tick.type === 'major' && (
              <span className="text-[10px] text-muted-foreground/80 tabular-nums mt-0.5 whitespace-nowrap font-medium">
                {formatTime(tick.time, showTenths)}
              </span>
            )}
          </div>
        );
      })}
      
      {/* Current duration indicator */}
      <div 
        className="absolute top-0 bottom-0 w-px bg-yellow-500/50"
        style={{ left: `${duration * pixelsPerSecond}px` }}
        title="End of timeline"
      />
    </div>
  );
}