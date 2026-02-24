import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useFriends } from '@/hooks/useFriends';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface Friend {
  id: string;
  display_name: string;
  username: string;
  profile_pic: string | null;
}

interface MentionAutocompleteProps {
  show: boolean;
  searchQuery: string;
  position: { top: number; left: number };
  onSelect: (friend: Friend) => void;
  onClose: () => void;
}

const MentionAutocomplete = ({ 
  show, 
  searchQuery, 
  position, 
  onSelect, 
  onClose 
}: MentionAutocompleteProps) => {
  const { user } = useAuth();
  const { friends } = useFriends(user?.id);
  const [filteredFriends, setFilteredFriends] = useState<Friend[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!friends || !searchQuery) {
      setFilteredFriends([]);
      return;
    }

    const filtered = friends
      .filter(friend =>
        friend.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        friend.username.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .slice(0, 5); // Limit to 5 results

    setFilteredFriends(filtered);
    setSelectedIndex(0);
  }, [friends, searchQuery]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!show || filteredFriends.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev < filteredFriends.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev > 0 ? prev - 1 : filteredFriends.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredFriends[selectedIndex]) {
            onSelect(filteredFriends[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [show, filteredFriends, selectedIndex, onSelect, onClose]);

  if (!show || filteredFriends.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        ref={containerRef}
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        className="fixed z-50 bg-popover border border-border rounded-lg shadow-lg min-w-64 max-w-80"
        style={{
          top: position.top,
          left: position.left,
        }}
      >
        <div className="p-2 space-y-1">
          {filteredFriends.map((friend, index) => (
            <motion.div
              key={friend.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: index * 0.05 }}
              className={cn(
                "flex items-center space-x-3 p-2 rounded-md cursor-pointer transition-colors",
                index === selectedIndex ? "bg-accent" : "hover:bg-accent/50"
              )}
              onClick={() => onSelect(friend)}
            >
              <Avatar className="w-8 h-8">
                <AvatarImage src={friend.profile_pic || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                  {friend.display_name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{friend.display_name}</p>
                <p className="text-xs text-muted-foreground truncate">@{friend.username}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default MentionAutocomplete;