import { useState, useEffect } from 'react';
import { Flag, Bug, Code, EyeOff, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReelReportModal from './ReelReportModal';
import ReelFeedbackModal from './ReelFeedbackModal';
import ReelEmbedModal from './ReelEmbedModal';
import { useSeeLessPreference } from '@/hooks/useSeeLessPreference';

interface ReelMoreMenuProps {
  reelId: string;
  reelOwnerId?: string;
  isPublic?: boolean;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: React.ReactNode;
  onHideReel?: () => Promise<void>;
}

const menuItems = [
  { id: 'seeless', label: 'See less', icon: EyeOff },
  { id: 'report', label: 'Find support or report video', icon: Flag },
  { id: 'feedback', label: "Something isn't working", icon: Bug },
  { id: 'embed', label: 'Embed', icon: Code },
];

const ReelMoreMenu = ({ reelId, reelOwnerId, isPublic = true, isOpen, onOpenChange, trigger, onHideReel }: ReelMoreMenuProps) => {
  const [showReportModal, setShowReportModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showEmbedModal, setShowEmbedModal] = useState(false);
  const [isHiding, setIsHiding] = useState(false);
  const { hideReel, isLoading: isHidingReel } = useSeeLessPreference();

  // Handle ESC key to close menu
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onOpenChange(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent body scroll when menu is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onOpenChange]);

  const handleMenuAction = async (actionId: string) => {
    onOpenChange(false);
    
    switch (actionId) {
      case 'report':
        setShowReportModal(true);
        break;
      case 'feedback':
        setShowFeedbackModal(true);
        break;
      case 'embed':
        setShowEmbedModal(true);
        break;
      case 'seeless':
        console.log('[SEE_LESS] Clicked - reel_id:', reelId);
        setIsHiding(true);
        
        // Optimistic update: immediately call onHideReel to remove from UI
        if (onHideReel) {
          onHideReel();
        }
        
        // Then persist to database
        const success = await hideReel(reelId);
        if (!success) {
          console.error('[SEE_LESS] Failed to persist hide');
        }
        setIsHiding(false);
        break;
    }
  };

  const filteredItems = menuItems.filter(item => {
    // Only show Embed if reel is public
    if (item.id === 'embed' && !isPublic) return false;
    return true;
  });

  return (
    <>
      {/* Trigger button - render directly without wrapper onClick */}
      {trigger}

      {/* Overlay + Menu */}
      <AnimatePresence>
        {isOpen && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center">
              {/* Dark overlay */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 bg-black/70"
                onClick={() => onOpenChange(false)}
              />

              {/* Menu container */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="relative z-10 w-[280px] rounded-xl overflow-hidden shadow-2xl bg-neutral-900"
              >
              {/* Close button (optional, for accessibility) */}
              <button
                onClick={() => onOpenChange(false)}
                className="absolute top-2 right-2 p-1.5 rounded-full hover:bg-white/10 transition-colors"
                aria-label="Close menu"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>

              {/* Menu items */}
              <div className="py-2">
                {filteredItems.map((item, index) => (
                  <button
                    key={item.id}
                    onClick={() => handleMenuAction(item.id)}
                    disabled={(item.id === 'seeless' && (isHiding || isHidingReel))}
                    className={`
                      w-full flex items-center gap-3 px-4 py-3.5 text-left
                      transition-colors duration-150
                      hover:bg-white/10 active:bg-white/15
                      disabled:opacity-50 disabled:cursor-not-allowed
                      ${index === 0 ? 'pt-4' : ''}
                      ${index === filteredItems.length - 1 ? 'pb-4' : ''}
                    `}
                  >
                    <div className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10">
                      <item.icon className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-[15px] font-medium text-white">
                      {item.label}
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Sub-modals */}
      <ReelReportModal 
        reelId={reelId}
        reelOwnerId={reelOwnerId}
        isOpen={showReportModal} 
        onClose={() => setShowReportModal(false)} 
      />
      <ReelFeedbackModal 
        isOpen={showFeedbackModal} 
        onClose={() => setShowFeedbackModal(false)}
        postId={reelId}
        postType="reel"
        postOwnerId={reelOwnerId || ''}
      />
      <ReelEmbedModal 
        reelId={reelId} 
        isOpen={showEmbedModal} 
        onClose={() => setShowEmbedModal(false)} 
      />
    </>
  );
};

export default ReelMoreMenu;
