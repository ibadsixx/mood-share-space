import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Check } from 'lucide-react';
import { useFriends } from '@/hooks/useFriends';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface Friend {
  id: string;
  display_name: string;
  username: string;
  profile_pic: string | null;
}

interface TagPeopleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedUsers: Friend[];
  onUsersChange: (users: Friend[]) => void;
}

const TagPeopleModal = ({ open, onOpenChange, selectedUsers, onUsersChange }: TagPeopleModalProps) => {
  const { user } = useAuth();
  const { friends } = useFriends(user?.id);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredFriends, setFilteredFriends] = useState<Friend[]>([]);

  useEffect(() => {
    if (!friends) return;
    
    const filtered = friends.filter(friend =>
      friend.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      friend.username.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    setFilteredFriends(filtered);
  }, [friends, searchQuery]);

  const toggleUserSelection = (friend: Friend) => {
    const isSelected = selectedUsers.some(user => user.id === friend.id);
    
    if (isSelected) {
      onUsersChange(selectedUsers.filter(user => user.id !== friend.id));
    } else {
      onUsersChange([...selectedUsers, friend]);
    }
  };

  const isUserSelected = (friendId: string) => {
    return selectedUsers.some(user => user.id === friendId);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tag People</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search friends..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Friends List */}
          <div className="max-h-60 overflow-y-auto">
            <AnimatePresence>
              {filteredFriends.map((friend) => (
                <motion.div
                  key={friend.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors",
                    isUserSelected(friend.id) ? "bg-primary/10" : "hover:bg-accent"
                  )}
                  onClick={() => toggleUserSelection(friend)}
                >
                  <div className="flex items-center space-x-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={friend.profile_pic || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {friend.display_name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">{friend.display_name}</p>
                      <p className="text-xs text-muted-foreground">@{friend.username}</p>
                    </div>
                  </div>
                  
                  {isUserSelected(friend.id) && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-6 h-6 bg-primary rounded-full flex items-center justify-center"
                    >
                      <Check className="w-4 h-4 text-primary-foreground" />
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
            
            {filteredFriends.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p>No friends found</p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={() => onOpenChange(false)}>
              Done ({selectedUsers.length})
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TagPeopleModal;