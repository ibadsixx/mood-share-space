import { Link } from 'react-router-dom';

interface MentionTextProps {
  text: string;
  className?: string;
}

export const MentionText = ({ text, className = '' }: MentionTextProps) => {
  // Split text by mentions and render them as links
  const renderTextWithMentions = (content: string) => {
    const mentionRegex = /@(\w+)/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = mentionRegex.exec(content)) !== null) {
      // Add text before mention
      if (match.index > lastIndex) {
        parts.push(content.substring(lastIndex, match.index));
      }

      // Add mention as link
      const username = match[1];
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
      {renderTextWithMentions(text)}
    </span>
  );
};
