import { Link } from 'react-router-dom';
import { TrendingUp, Hash } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useTrendingHashtags } from '@/hooks/useTrendingHashtags';

export const TrendingHashtags = () => {
  const { hashtags, loading } = useTrendingHashtags(5);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5 text-primary" />
            Trending Hashtags
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (hashtags.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5 text-primary" />
            Trending Hashtags
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No trending hashtags in the last 24 hours
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingUp className="h-5 w-5 text-primary" />
          Trending Hashtags
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {hashtags.map((hashtag, index) => (
          <Link
            key={hashtag.tag}
            to={`/hashtag/${hashtag.tag}`}
            className="flex items-center justify-between p-2 rounded-lg hover:bg-accent transition-colors group"
          >
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground w-5">
                {index + 1}
              </span>
              <Hash className="h-4 w-4 text-primary" />
              <span className="font-medium text-foreground group-hover:text-primary transition-colors">
                {hashtag.tag}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">
              {hashtag.count} {hashtag.count === 1 ? 'post' : 'posts'}
            </span>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
};
