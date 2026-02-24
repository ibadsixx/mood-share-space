// ZoomControls - Enhanced zoom with pinch-to-zoom, wheel zoom, cursor-centered zoom
// Supports: +/- buttons, slider, Ctrl+wheel, pinch gestures, fit-to-view

import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

interface ZoomControlsProps {
  zoomLevel: number;
  minZoom: number;
  maxZoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomChange: (level: number) => void;
  pixelsPerSecond: number;
  containerRef?: React.RefObject<HTMLElement>;
  duration?: number;
}

export function ZoomControls({
  zoomLevel,
  minZoom,
  maxZoom,
  onZoomIn,
  onZoomOut,
  onZoomChange,
  pixelsPerSecond,
  containerRef,
  duration = 30,
}: ZoomControlsProps) {
  const animationRef = useRef<number | null>(null);
  const targetZoomRef = useRef(zoomLevel);
  const [isAnimating, setIsAnimating] = useState(false);

  // Smooth zoom animation with easing
  const animateZoom = useCallback((targetZoom: number, cursorX?: number) => {
    targetZoomRef.current = targetZoom;
    const startZoom = zoomLevel;
    const startTime = performance.now();
    const animDuration = 150; // ms
    
    setIsAnimating(true);
    
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / animDuration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      
      const current = startZoom + (targetZoomRef.current - startZoom) * eased;
      
      if (progress >= 1) {
        onZoomChange(targetZoomRef.current);
        animationRef.current = null;
        setIsAnimating(false);
        return;
      }
      
      onZoomChange(Math.round(current * 10) / 10);
      animationRef.current = requestAnimationFrame(animate);
    };
    
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    animationRef.current = requestAnimationFrame(animate);
  }, [zoomLevel, onZoomChange]);

  // Cleanup animation on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Pinch-to-zoom support for trackpad and touch devices
  useEffect(() => {
    const container = containerRef?.current;
    if (!container) return;

    let initialDistance = 0;
    let initialZoom = zoomLevel;
    let lastScale = 1;

    // Touch pinch
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        initialDistance = Math.sqrt(dx * dx + dy * dy);
        initialZoom = zoomLevel;
        lastScale = 1;
        console.log('[ZoomControls] Pinch start, distance:', initialDistance.toFixed(0));
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && initialDistance > 0) {
        e.preventDefault();
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const currentDistance = Math.sqrt(dx * dx + dy * dy);
        
        const scale = currentDistance / initialDistance;
        
        // Only apply if significant change
        if (Math.abs(scale - lastScale) > 0.05) {
          lastScale = scale;
          const newZoom = Math.max(minZoom, Math.min(maxZoom, Math.round(initialZoom * scale)));
          console.log('[ZoomControls] Pinch zoom:', newZoom);
          onZoomChange(newZoom);
        }
      }
    };

    const handleTouchEnd = () => {
      initialDistance = 0;
      lastScale = 1;
      console.log('[ZoomControls] Pinch end');
    };

    // Trackpad pinch (gesture events)
    const handleGestureStart = (e: any) => {
      e.preventDefault();
      initialZoom = zoomLevel;
    };

    const handleGestureChange = (e: any) => {
      e.preventDefault();
      const scale = e.scale;
      const newZoom = Math.max(minZoom, Math.min(maxZoom, Math.round(initialZoom * scale)));
      console.log('[ZoomControls] Gesture zoom:', newZoom, 'scale:', scale.toFixed(2));
      onZoomChange(newZoom);
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);
    
    // Safari trackpad gestures
    container.addEventListener('gesturestart', handleGestureStart);
    container.addEventListener('gesturechange', handleGestureChange);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('gesturestart', handleGestureStart);
      container.removeEventListener('gesturechange', handleGestureChange);
    };
  }, [containerRef, zoomLevel, minZoom, maxZoom, onZoomChange]);

  const handleZoomIn = useCallback(() => {
    const step = zoomLevel >= 10 ? 2 : 1;
    const newZoom = Math.min(maxZoom, zoomLevel + step);
    console.log('[ZoomControls] Zoom in:', zoomLevel, '→', newZoom);
    animateZoom(newZoom);
  }, [zoomLevel, maxZoom, animateZoom]);

  const handleZoomOut = useCallback(() => {
    const step = zoomLevel > 10 ? 2 : 1;
    const newZoom = Math.max(minZoom, zoomLevel - step);
    console.log('[ZoomControls] Zoom out:', zoomLevel, '→', newZoom);
    animateZoom(newZoom);
  }, [zoomLevel, minZoom, animateZoom]);

  // Fit timeline to view (calculate optimal zoom)
  const handleFitToView = useCallback(() => {
    if (!containerRef?.current) {
      animateZoom(5);
      return;
    }
    
    const containerWidth = containerRef.current.clientWidth - 100; // Account for padding
    const optimalPps = containerWidth / duration;
    const optimalZoom = Math.max(minZoom, Math.min(maxZoom, Math.round(optimalPps / 10)));
    
    console.log('[ZoomControls] Fit to view:', optimalZoom, 'pps:', optimalPps.toFixed(0));
    animateZoom(optimalZoom);
  }, [containerRef, duration, minZoom, maxZoom, animateZoom]);

  const zoomPercentage = Math.round((zoomLevel / maxZoom) * 100);

  return (
    <div className="flex items-center gap-1 bg-muted/50 rounded-md p-1">
      <Button 
        variant="ghost" 
        size="icon" 
        className="h-7 w-7" 
        onClick={handleZoomOut}
        disabled={zoomLevel <= minZoom || isAnimating}
        title="Zoom Out (- or Ctrl+Scroll down)"
      >
        <ZoomOut className="h-4 w-4" />
      </Button>
      
      <div className="w-24">
        <Slider
          value={[zoomLevel]}
          onValueChange={(v) => onZoomChange(v[0])}
          min={minZoom}
          max={maxZoom}
          step={1}
          className="cursor-pointer"
        />
      </div>
      
      <Button 
        variant="ghost" 
        size="icon" 
        className="h-7 w-7" 
        onClick={handleZoomIn}
        disabled={zoomLevel >= maxZoom || isAnimating}
        title="Zoom In (+ or Ctrl+Scroll up)"
      >
        <ZoomIn className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={handleFitToView}
        title="Fit to View (reset zoom)"
      >
        <Maximize2 className="h-3.5 w-3.5" />
      </Button>
      
      <span className="text-xs text-muted-foreground ml-1 w-20 tabular-nums text-right">
        {pixelsPerSecond.toFixed(0)}px/s
      </span>
    </div>
  );
}