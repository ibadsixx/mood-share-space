import { Link } from 'react-router-dom';

interface HashtagTextProps {
  text: string;
  className?: string;
}

export const HashtagText = ({ text, className = '' }: HashtagTextProps) => {
  // Split text by hashtags and render them as links
  const renderTextWithHashtags = (content: string) => {
    const hashtagRegex = /#(\w+)/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = hashtagRegex.exec(content)) !== null) {
      // Add text before hashtag
      if (match.index > lastIndex) {
        parts.push(content.substring(lastIndex, match.index));
      }

      // Add hashtag as link
      const tag = match[1];
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
      {renderTextWithHashtags(text)}
    </span>
  );
};
