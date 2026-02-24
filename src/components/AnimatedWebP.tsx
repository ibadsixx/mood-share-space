import { memo } from 'react';

interface AnimatedWebPProps {
  webpPath: string;
  fallbackPath?: string;
  size?: number;
  className?: string;
  alt?: string;
}

/**
 * Displays an animated WebP image.
 * Falls back to a static PNG if the animated WebP fails to load.
 * WebP animations loop automatically - no additional logic needed.
 */
const AnimatedWebP = memo(({ 
  webpPath, 
  fallbackPath,
  size = 36, 
  className = '',
  alt = 'Reaction'
}: AnimatedWebPProps) => {
  return (
    <img
      src={webpPath}
      alt={alt}
      width={size}
      height={size}
      className={`object-contain ${className}`}
      draggable={false}
      loading="eager"
      onError={(e) => {
        // Fall back to static PNG if animated WebP fails
        if (fallbackPath) {
          const target = e.currentTarget;
          if (target.src !== fallbackPath) {
            target.src = fallbackPath;
          }
        }
      }}
    />
  );
});

AnimatedWebP.displayName = 'AnimatedWebP';

export default AnimatedWebP;
