import React, { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

const HEX_CODE_RE = /^[0-9a-f]{2,}(?:-[0-9a-f]{2,})*$/i;

// Convert a Unicode emoji to its hex code representation (e.g., "😊" -> "1f60a")
const unicodeToHex = (emoji: string): string => {
  const codePoints: string[] = [];
  for (const char of emoji) {
    const cp = char.codePointAt(0);
    if (cp !== undefined) codePoints.push(cp.toString(16).toLowerCase());
  }
  return codePoints.join("-");
};

export const hexCodeToUnicodeEmoji = (hex: string): string => {
  try {
    const cps = hex
      .toLowerCase()
      .split("-")
      .map((h) => parseInt(h, 16))
      .filter((n) => Number.isFinite(n));
    if (cps.length === 0) return "";
    return String.fromCodePoint(...cps);
  } catch {
    return "";
  }
};

/**
 * Accepts either a hex code like "1f970" / "0023-20e3" or a Unicode emoji like "🥰".
 * Returns a normalized lowercase hex code for mapping to /public/emoji assets.
 */
export const normalizeEmojiToHexCode = (emoji: string): string => {
  const trimmed = (emoji ?? "").trim();
  if (!trimmed) return "";
  if (HEX_CODE_RE.test(trimmed)) return trimmed.toLowerCase();
  return unicodeToHex(trimmed);
};

/**
 * Ensures we can send a real emoji character even when the stored value is a hex code.
 */
export const normalizeEmojiToUnicode = (emoji: string): string => {
  const trimmed = (emoji ?? "").trim();
  if (!trimmed) return "";
  if (!HEX_CODE_RE.test(trimmed)) return trimmed;
  return hexCodeToUnicodeEmoji(trimmed) || "";
};

interface EmojiAssetProps {
  emoji: string;
  alt: string;
  size?: number;
  className?: string;
}

/**
 * Renders an emoji using local PNG assets in /public/emoji.
 * Falls back to rendering the Unicode emoji if the PNG fails to load.
 */
export const EmojiAsset: React.FC<EmojiAssetProps> = ({
  emoji,
  alt,
  size = 24,
  className,
}) => {
  const [failed, setFailed] = useState(false);

  const { hexCode, unicode } = useMemo(() => {
    const code = normalizeEmojiToHexCode(emoji);
    const uni = normalizeEmojiToUnicode(emoji) || (code ? hexCodeToUnicodeEmoji(code) : "");
    return { hexCode: code, unicode: uni };
  }, [emoji]);

  if (!hexCode || failed) {
    return (
      <span
        className={cn("inline-flex items-center justify-center", className)}
        style={{ fontSize: size, lineHeight: 1 }}
        aria-label={alt}
        title={alt}
      >
        {unicode || ""}
      </span>
    );
  }

  return (
    <img
      src={`/emoji/${hexCode}.png`}
      alt={alt}
      title={alt}
      width={size}
      height={size}
      className={cn("inline-block", className)}
      style={{ verticalAlign: "middle" }}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
};
