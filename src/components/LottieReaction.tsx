import { useState, useEffect, memo, useRef } from 'react';
import Lottie, { LottieRefCurrentProps } from 'lottie-react';

interface LottieReactionProps {
  lottiePath: string;
  size?: number;
  loop?: boolean;
  autoplay?: boolean;
  className?: string;
  /** Shown while loading or when JSON fails to load */
  fallback?: string;
}

// Global cache for Lottie animation data to prevent re-fetching
const animationCache = new Map<string, object>();
const loadingPromises = new Map<string, Promise<object>>();

// Preload function that can be called to warm the cache
export const preloadLottieAnimation = async (path: string): Promise<object | null> => {
  // Return from cache if available
  if (animationCache.has(path)) {
    return animationCache.get(path)!;
  }

  // Join existing loading promise if in progress
  if (loadingPromises.has(path)) {
    return loadingPromises.get(path)!;
  }

  // Start new fetch
  const loadPromise = fetch(path)
    .then(response => {
      if (!response.ok) throw new Error('Failed to load animation');
      return response.json();
    })
    .then(data => {
      animationCache.set(path, data);
      loadingPromises.delete(path);
      return data;
    })
    .catch(err => {
      loadingPromises.delete(path);
      console.error('Error loading Lottie animation:', err);
      throw err;
    });

  loadingPromises.set(path, loadPromise);
  return loadPromise;
};

// Lazy-loading Lottie component that fetches JSON dynamically with caching
const LottieReaction = memo(({ 
  lottiePath, 
  size = 40, 
  loop = true, 
  autoplay = true,
  className = '',
  fallback,
}: LottieReactionProps) => {
  const [animationData, setAnimationData] = useState<object | null>(() => 
    animationCache.get(lottiePath) || null
  );
  const [error, setError] = useState(false);
  const lottieRef = useRef<LottieRefCurrentProps>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    
    // If already cached, use it immediately
    if (animationCache.has(lottiePath)) {
      setAnimationData(animationCache.get(lottiePath)!);
      setError(false);
      return;
    }

    // Load the animation
    preloadLottieAnimation(lottiePath)
      .then(data => {
        if (mountedRef.current) {
          setAnimationData(data);
          setError(false);
        }
      })
      .catch(() => {
        if (mountedRef.current) {
          setError(true);
        }
      });

    return () => {
      mountedRef.current = false;
    };
  }, [lottiePath]);

  // Control loop behavior
  useEffect(() => {
    if (lottieRef.current && animationData) {
      if (loop) {
        lottieRef.current.play();
      } else {
        // Play once then stop at first frame
        lottieRef.current.goToAndStop(0, true);
      }
    }
  }, [loop, animationData]);

  const fallbackValue = fallback || '…';
  const isFallbackImage = typeof fallbackValue === 'string' && /\.(png|jpg|jpeg|webp|svg)(\?.*)?$/i.test(fallbackValue);

  // Show fallback image while loading or on error
  if (error || !animationData) {
    return (
      <div 
        className={`flex items-center justify-center ${className}`}
        style={{ width: size, height: size }}
      >
        {isFallbackImage ? (
          <img
            src={fallbackValue}
            alt=""
            style={{ width: size, height: size }}
            className="object-contain"
            loading="lazy"
            draggable={false}
          />
        ) : (
          <span className="text-lg leading-none">{fallbackValue}</span>
        )}
      </div>
    );
  }

  return (
    <div 
      className={`flex items-center justify-center overflow-hidden ${className}`}
      style={{ width: size, height: size }}
    >
      <Lottie
        lottieRef={lottieRef}
        animationData={animationData}
        loop={loop}
        autoplay={autoplay}
        style={{ width: size, height: size }}
        rendererSettings={{
          preserveAspectRatio: 'xMidYMid slice',
        }}
      />
    </div>
  );
});

LottieReaction.displayName = 'LottieReaction';

export default LottieReaction;
