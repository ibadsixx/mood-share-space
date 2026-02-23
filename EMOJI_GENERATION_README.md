# 🎨 Emoji JSON Generation Guide

## Quick Start

Run this command to generate the complete emoji.json file:

```bash
node scripts/processEmojiList.js
```

This will:
- ✅ Scan all ~3800 PNG files in `/public/emoji/`
- ✅ Exclude all flag emojis (country flags)
- ✅ Categorize each emoji automatically
- ✅ Generate `/public/emoji/emoji.json` with all entries

## Output Format

Each emoji entry looks like this:

```json
{
  "emoji": "1f60a",
  "name": "1f60a",
  "category": "smileys",
  "url": "/emoji/1f60a.png"
}
```

## Categories

- `smileys` - Smiling faces and emotions
- `people` - People, body parts, gestures
- `animals` - Animals and nature
- `food` - Food and drinks
- `travel` - Travel, places, vehicles
- `activities` - Sports, hobbies, activities
- `objects` - Objects, tools, items
- `symbols` - Symbols, signs, shapes
- `uncategorized` - Other emojis

## What Gets Excluded

- All country flag emojis (regional indicators 1F1E6-1F1FF)
- Non-PNG files

## Expected Output

```
✅ Generated emoji.json with ~3500+ entries
📍 Location: public/emoji/emoji.json

📊 Category breakdown:
   people: 1800+
   smileys: 150+
   symbols: 300+
   ...etc

📋 First 10 entries:
   1. 0023-20e3 -> 0023-20e3 [symbols]
   ...

📋 Last 10 entries:
   ...
```

## Alternative: Updated Generate Script

The original `scripts/generateEmojiJson.js` has also been updated with the same logic. Run either script:

```bash
# Option 1 (new script)
node scripts/processEmojiList.js

# Option 2 (original script, updated)
node scripts/generateEmojiJson.js
```

Both will produce the same result!
