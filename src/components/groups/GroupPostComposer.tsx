import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Send } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';

interface GroupPostComposerProps {
  onPost: (content: string) => Promise<void>;
}

export const GroupPostComposer = ({ onPost }: GroupPostComposerProps) => {
  const [content, setContent] = useState('');
  const [posting, setPosting] = useState(false);
  const { user } = useAuth();
  const { profile } = useProfile();

  const handlePost = async () => {
    if (!content.trim()) return;
    setPosting(true);
    try {
      await onPost(content.trim());
      setContent('');
    } finally {
      setPosting(false);
    }
  };

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={profile?.profile_pic || ''} />
            <AvatarFallback>{profile?.display_name?.[0] || 'U'}</AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-3">
            <Textarea
              placeholder="Write something to the group..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[80px] resize-none"
            />
            <div className="flex justify-end">
              <Button
                onClick={handlePost}
                disabled={!content.trim() || posting}
                size="sm"
              >
                <Send className="h-4 w-4 mr-1" />
                {posting ? 'Posting...' : 'Post'}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
