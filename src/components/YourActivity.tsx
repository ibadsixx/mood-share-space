import React from 'react';
import { ChevronRight, Video, Film, Play, Search, Users, MessageCircle, LayoutGrid, ImageIcon, ThumbsUp, UserCheck, LogIn, Heart } from 'lucide-react';

interface ActivityMenuItem {
  id: string;
  icon: React.ReactNode;
  label: string;
}

const activityItems: ActivityMenuItem[] = [
  { id: 'live-videos', icon: <Video className="h-5 w-5" />, label: 'Your live broadcasts' },
  { id: 'videos-searched', icon: <Film className="h-5 w-5" />, label: 'Clips you\'ve looked up' },
  { id: 'videos-watched', icon: <Play className="h-5 w-5" />, label: 'Videos you\'ve viewed' },
  { id: 'search-history', icon: <Search className="h-5 w-5" />, label: 'Your lookup history' },
  { id: 'groups-searched', icon: <Users className="h-5 w-5" />, label: 'Communities you\'ve explored' },
  { id: 'comments', icon: <MessageCircle className="h-5 w-5" />, label: 'Remarks' },
  { id: 'group-posts-comments', icon: <LayoutGrid className="h-5 w-5" />, label: 'Community posts and remarks' },
  { id: 'stories-activity', icon: <ImageIcon className="h-5 w-5" />, label: 'Stories engagement' },
  { id: 'pages-likes', icon: <ThumbsUp className="h-5 w-5" />, label: 'Pages, page endorsements and passions' },
  { id: 'your-friends', icon: <UserCheck className="h-5 w-5" />, label: 'Your companions' },
  { id: 'logged-in', icon: <LogIn className="h-5 w-5" />, label: 'Where you\'re signed in' },
  { id: 'relationships', icon: <Heart className="h-5 w-5" />, label: 'Connections' },
];

const YourActivity: React.FC = () => {
  return (
    <div className="divide-y divide-border">
      {activityItems.map((item) => (
        <button
          key={item.id}
          className="w-full flex items-center gap-4 px-4 py-4 hover:bg-muted/50 transition-colors text-left"
        >
          <span className="text-muted-foreground">{item.icon}</span>
          <span className="flex-1 text-sm font-medium text-foreground">{item.label}</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
      ))}
    </div>
  );
};

export default YourActivity;
