// usePerformanceMonitor - Performance monitoring for editor
// Tracks render times, memory usage, and FPS

import { useCallback, useRef, useState, useEffect } from 'react';

interface PerformanceMetrics {
  fps: number;
  avgFrameTime: number;
  memoryUsageMB: number | null;
  renderCount: number;
  lastRenderTime: number;
  timeToFirstRender: number | null;
}

interface PerformanceOptions {
  enabled?: boolean;
  sampleSize?: number;
  logInterval?: number;
}

export function usePerformanceMonitor(options: PerformanceOptions = {}) {
  const { enabled = true, sampleSize = 60, logInterval = 5000 } = options;

  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 0,
    avgFrameTime: 0,
    memoryUsageMB: null,
    renderCount: 0,
    lastRenderTime: 0,
    timeToFirstRender: null,
  });

  const frameTimesRef = useRef<number[]>([]);
  const lastFrameTimeRef = useRef<number>(performance.now());
  const renderCountRef = useRef<number>(0);
  const firstRenderTimeRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(performance.now());
  const animationFrameRef = useRef<number | null>(null);

  // Record a frame render
  const recordFrame = useCallback(() => {
    if (!enabled) return;

    const now = performance.now();
    const frameTime = now - lastFrameTimeRef.current;
    lastFrameTimeRef.current = now;

    // Track first render
    if (firstRenderTimeRef.current === null) {
      firstRenderTimeRef.current = now - startTimeRef.current;
    }

    // Add to samples
    frameTimesRef.current.push(frameTime);
    if (frameTimesRef.current.length > sampleSize) {
      frameTimesRef.current.shift();
    }

    renderCountRef.current++;
  }, [enabled, sampleSize]);

  // Calculate current metrics
  const calculateMetrics = useCallback((): PerformanceMetrics => {
    const frameTimes = frameTimesRef.current;
    
    if (frameTimes.length === 0) {
      return {
        fps: 0,
        avgFrameTime: 0,
        memoryUsageMB: null,
        renderCount: renderCountRef.current,
        lastRenderTime: 0,
        timeToFirstRender: firstRenderTimeRef.current,
      };
    }

    const avgFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
    const fps = 1000 / avgFrameTime;

    // Get memory usage if available
    let memoryUsageMB: number | null = null;
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      memoryUsageMB = Math.round(memory.usedJSHeapSize / 1024 / 1024);
    }

    return {
      fps: Math.round(fps),
      avgFrameTime: Math.round(avgFrameTime * 100) / 100,
      memoryUsageMB,
      renderCount: renderCountRef.current,
      lastRenderTime: frameTimes[frameTimes.length - 1] || 0,
      timeToFirstRender: firstRenderTimeRef.current,
    };
  }, []);

  // Update metrics periodically
  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(() => {
      const newMetrics = calculateMetrics();
      setMetrics(newMetrics);

      // Log to console
      if (renderCountRef.current > 0) {
        console.log('[PERFORMANCE]', 
          `FPS: ${newMetrics.fps}`,
          `| Frame: ${newMetrics.avgFrameTime}ms`,
          `| Memory: ${newMetrics.memoryUsageMB ?? 'N/A'}MB`,
          `| Renders: ${newMetrics.renderCount}`
        );
      }
    }, logInterval);

    return () => clearInterval(interval);
  }, [enabled, logInterval, calculateMetrics]);

  // Mark a significant event
  const markEvent = useCallback((eventName: string) => {
    if (!enabled) return;
    
    performance.mark(eventName);
    console.log(`[PERFORMANCE] Event: ${eventName} at ${performance.now().toFixed(2)}ms`);
  }, [enabled]);

  // Measure time between two marks
  const measureBetween = useCallback((startMark: string, endMark: string, measureName: string) => {
    if (!enabled) return 0;
    
    try {
      performance.measure(measureName, startMark, endMark);
      const entries = performance.getEntriesByName(measureName);
      const duration = entries[entries.length - 1]?.duration || 0;
      console.log(`[PERFORMANCE] ${measureName}: ${duration.toFixed(2)}ms`);
      return duration;
    } catch {
      return 0;
    }
  }, [enabled]);

  // Start measuring a block
  const startMeasure = useCallback((name: string) => {
    if (!enabled) return;
    performance.mark(`${name}-start`);
  }, [enabled]);

  // End measuring a block
  const endMeasure = useCallback((name: string) => {
    if (!enabled) return 0;
    
    performance.mark(`${name}-end`);
    return measureBetween(`${name}-start`, `${name}-end`, name);
  }, [enabled, measureBetween]);

  // Reset metrics
  const reset = useCallback(() => {
    frameTimesRef.current = [];
    renderCountRef.current = 0;
    firstRenderTimeRef.current = null;
    startTimeRef.current = performance.now();
    setMetrics({
      fps: 0,
      avgFrameTime: 0,
      memoryUsageMB: null,
      renderCount: 0,
      lastRenderTime: 0,
      timeToFirstRender: null,
    });
  }, []);

  return {
    metrics,
    recordFrame,
    markEvent,
    startMeasure,
    endMeasure,
    reset,
    getMetrics: calculateMetrics,
  };
}

// Utility to run performance test
export async function runPerformanceTest(testFn: () => void, iterations: number = 100): Promise<{
  avgTime: number;
  minTime: number;
  maxTime: number;
  totalTime: number;
}> {
  const times: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    testFn();
    const end = performance.now();
    times.push(end - start);
  }

  const totalTime = times.reduce((a, b) => a + b, 0);
  const avgTime = totalTime / times.length;
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);

  console.log(`[PERF TEST] ${iterations} iterations:`, {
    avgTime: avgTime.toFixed(3) + 'ms',
    minTime: minTime.toFixed(3) + 'ms',
    maxTime: maxTime.toFixed(3) + 'ms',
    totalTime: totalTime.toFixed(3) + 'ms',
  });

  return { avgTime, minTime, maxTime, totalTime };
}
