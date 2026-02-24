import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

interface TaggedUser {
  id: string;
  display_name: string;
  username: string;
  profile_pic: string | null;
}

interface TaggedUserChipProps {
  user: TaggedUser;
  onRemove: (userId: string) => void;
}

const TaggedUserChip = ({ user, onRemove }: TaggedUserChipProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.2 }}
    >
      <Badge 
        variant="secondary" 
        className="flex items-center space-x-2 pr-1 py-1 hover:bg-secondary/80 transition-colors"
      >
        <Avatar className="w-5 h-5">
          <AvatarImage src={user.profile_pic || undefined} />
          <AvatarFallback className="bg-primary/10 text-primary text-xs">
            {user.display_name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <span className="text-sm font-medium">{user.display_name}</span>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={(e) => {
            e.stopPropagation();
            onRemove(user.id);
          }}
          className="w-5 h-5 rounded-full bg-muted-foreground/20 hover:bg-destructive hover:text-destructive-foreground flex items-center justify-center transition-colors"
        >
          <X className="w-3 h-3" />
        </motion.button>
      </Badge>
    </motion.div>
  );
};

export default TaggedUserChip;