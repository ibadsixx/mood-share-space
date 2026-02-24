import React, { useState, useEffect, useMemo } from 'react';
import { Emoji } from './Emoji';
import { emojiService, EmojiData } from '../services/emojiService';

interface EmojiTextProps {
  /** Text content that may contain emojis */
  text: string;
  /** Size for rendered emojis (default: 18) */
  emojiSize?: number;
  /** Additional CSS classes */
  className?: string;
}

// Convert a Unicode emoji to its hex code representation (e.g., "😊" -> "1f60a")
const unicodeToHex = (emoji: string): string => {
  const codePoints: string[] = [];
  for (const char of emoji) {
    const cp = char.codePointAt(0);
    if (cp !== undefined) {
      codePoints.push(cp.toString(16).toLowerCase());
    }
  }
  return codePoints.join('-');
};

export const EmojiText: React.FC<EmojiTextProps> = ({
  text,
  emojiSize = 18,
  className = ''
}) => {
  const [emojiMap, setEmojiMap] = useState<Map<string, EmojiData>>(new Map());

  useEffect(() => {
    const loadEmojis = async () => {
      const allEmojis = await emojiService.getAllEmojis();
      const map = new Map<string, EmojiData>();
      
      allEmojis.forEach(emoji => {
        // Map by emoji code (e.g., "1f602")
        map.set(emoji.emoji.toLowerCase(), emoji);
        // Map by name for shortcodes (e.g., "joy" -> ":joy:")
        map.set(`:${emoji.name}:`, emoji);
      });
      
      setEmojiMap(map);
    };

    loadEmojis();
  }, []);

  const parsedContent = useMemo(() => {
    if (emojiMap.size === 0) {
      // While loading, just return the raw text
      return [{ type: 'text' as const, content: text }];
    }

    // Comprehensive emoji regex that matches:
    // - Multi-codepoint emojis (with ZWJ, skin tones, etc.)
    // - Single codepoint emojis
    // - Variation selectors
    const emojiRegex = /(?:\p{Emoji_Presentation}|\p{Emoji}\uFE0F)(?:\u200D(?:\p{Emoji_Presentation}|\p{Emoji}\uFE0F))*|\p{Emoji_Modifier_Base}\p{Emoji_Modifier}?/gu;
    
    const parts: Array<{ type: 'text'; content: string } | { type: 'emoji'; emoji: EmojiData }> = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    // Find all emoji matches
    while ((match = emojiRegex.exec(text)) !== null) {
      const emoji = match[0];
      const matchIndex = match.index;

      // Add text before this emoji
      if (matchIndex > lastIndex) {
        parts.push({
          type: 'text',
          content: text.slice(lastIndex, matchIndex)
        });
      }

      // Convert the Unicode emoji to hex code
      const hexCode = unicodeToHex(emoji);
      const emojiData = emojiMap.get(hexCode);

      if (emojiData) {
        // Found a matching PNG emoji
        parts.push({
          type: 'emoji',
          emoji: emojiData
        });
      } else {
        // No PNG version found, keep original text (native emoji)
        parts.push({
          type: 'text',
          content: emoji
        });
      }

      lastIndex = matchIndex + emoji.length;
    }

    // Add remaining text after the last emoji
    if (lastIndex < text.length) {
      parts.push({
        type: 'text',
        content: text.slice(lastIndex)
      });
    }

    // If no parts were added, return original text
    if (parts.length === 0) {
      return [{ type: 'text' as const, content: text }];
    }

    return parts;
  }, [text, emojiMap]);

  return (
    <span className={className}>
      {parsedContent.map((part, index) => {
        if (part.type === 'text') {
          return <span key={index}>{part.content}</span>;
        }

        // Render emoji using PNG URL
        return (
          <Emoji
            key={index}
            url={part.emoji.url}
            alt={part.emoji.name}
            size={emojiSize}
          />
        );
      })}
    </span>
  );
};
