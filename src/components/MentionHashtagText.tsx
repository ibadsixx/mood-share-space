import { Link } from 'react-router-dom';

interface MentionHashtagTextProps {
  text: string;
  className?: string;
}

export const MentionHashtagText = ({ text, className = '' }: MentionHashtagTextProps) => {
  // Render text with both mentions and hashtags as clickable links
  const renderTextWithLinks = (content: string) => {
    // Combined regex to match both @mentions and #hashtags
    const regex = /(@\w+)|(#\w+)/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(content)) !== null) {
      // Add text before match
      if (match.index > lastIndex) {
        parts.push(content.substring(lastIndex, match.index));
      }

      if (match[1]) {
        // This is a mention (@username)
        const username = match[1].substring(1);
        parts.push(
          <Link
            key={`mention-${match.index}`}
            to={`/profile/${username}`}
            className="text-primary hover:underline font-medium"
            onClick={(e) => e.stopPropagation()}
          >
            @{username}
          </Link>
        );
      } else if (match[2]) {
        // This is a hashtag (#tag)
        const tag = match[2].substring(1);
        parts.push(
          <Link
            key={`hashtag-${match.index}`}
            to={`/hashtag/${tag.toLowerCase()}`}
            className="text-primary hover:underline font-medium"
            onClick={(e) => e.stopPropagation()}
          >
            #{tag}
          </Link>
        );
      }

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < content.length) {
      parts.push(content.substring(lastIndex));
    }

    return parts.length > 0 ? parts : content;
  };

  return (
    <span className={className}>
      {renderTextWithLinks(text)}
    </span>
  );
};
