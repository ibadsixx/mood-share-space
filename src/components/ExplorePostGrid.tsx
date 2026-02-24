import { useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, MessageCircle, Play } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface ExplorePost {
  id: string;
  user_id: string;
  content: string | null;
  media_url: string | null;
  created_at: string;
  type: 'normal_post' | 'profile_picture_update' | 'cover_photo_update' | 'shared_post' | 'reel';
  profiles: {
    username: string;
    display_name: string;
    profile_pic: string | null;
  };
  likes?: { count: number }[];
  comments?: { count: number }[];
}

interface ExplorePostGridProps {
  posts: ExplorePost[];
  onPostClick: (post: ExplorePost) => void;
}

const ExplorePostGrid = ({ posts, onPostClick }: ExplorePostGridProps) => {
  const [hoveredPost, setHoveredPost] = useState<string | null>(null);

  const formatCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const getLikesCount = (post: ExplorePost) => {
    return post.likes?.[0]?.count || 0;
  };

  const getCommentsCount = (post: ExplorePost) => {
    return post.comments?.[0]?.count || 0;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1">
      {posts.map((post, index) => (
        <motion.div
          key={post.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.05 }}
        >
          <Card 
            className={cn(
              "relative aspect-square overflow-hidden cursor-pointer border-0 rounded-none",
              "hover:brightness-75 transition-all duration-200"
            )}
            onMouseEnter={() => setHoveredPost(post.id)}
            onMouseLeave={() => setHoveredPost(null)}
            onClick={() => onPostClick(post)}
          >
            {/* Media */}
            <div className="relative w-full h-full">
              {post.media_url && post.media_url.includes('.mp4') ? (
                <div className="relative w-full h-full">
                  <video
                    src={post.media_url || ''}
                    className="w-full h-full object-cover"
                    muted
                    playsInline
                  />
                  <div className="absolute top-2 right-2">
                    <Play className="h-5 w-5 text-white fill-white" />
                  </div>
                </div>
              ) : (
                <img
                  src={post.media_url || ''}
                  alt={post.content || 'Post media'}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              )}
              
              {/* Hover Overlay */}
              {hoveredPost === post.id && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-black/50 flex items-center justify-center"
                >
                  <div className="flex items-center gap-6 text-white">
                    <div className="flex items-center gap-2">
                      <Heart className="h-6 w-6 fill-white" />
                      <span className="font-semibold text-lg">
                        {formatCount(getLikesCount(post))}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MessageCircle className="h-6 w-6 fill-white" />
                      <span className="font-semibold text-lg">
                        {formatCount(getCommentsCount(post))}
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  );
};

export default ExplorePostGrid;