// This script outputs a list of all emoji files that can be copy-pasted
// Run with: node scripts/buildEmojiList.js > emoji-list.txt

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EMOJI_DIR = path.join(__dirname, '../public/emoji');
const OUTPUT_FILE = path.join(EMOJI_DIR, 'emoji.json');

// Check if a file is a flag emoji (skip flags)  
const isFlag = (code) => {
  const lowerCode = code.toLowerCase();
  return /^1f1[e-f][0-9a-f](-1f1[e-f][0-9a-f])?$/.test(lowerCode);
};

// Category mappings based on Unicode ranges
const getCategoryByPrefix = (code) => {
  const prefix = code.substring(0, 4).toLowerCase();
  const fullCode = code.toLowerCase();
  
  // Smileys & Emotion (1F600-1F64F, 1F910-1F92F, 1F970-1F97A)
  if (prefix >= '1f60' && prefix <= '1f64') return 'Smileys';
  if (prefix >= '1f91' && prefix <= '1f92') return 'Smileys';
  if (prefix >= '1f97' && prefix <= '1f97') return 'Smileys';
  if (fullCode.startsWith('1f9') && /^1f9[0-3]/.test(fullCode)) return 'Smileys';
  
  // People & Body
  if (prefix >= '1f46' && prefix <= '1f4a') return 'People';
  if (prefix >= '1f9b' && prefix <= '1f9f') return 'People';
  if (prefix === '1f3c' && /^1f3c[0-4]/.test(fullCode)) return 'People';
  if (prefix === '1f57') return 'People';
  if (prefix >= '1f44' && prefix <= '1f45') return 'People';
  if (prefix >= '1fa7' && prefix <= '1faf') return 'People';
  if (prefix >= '1f9' && /^1f9[0-9a-d]/.test(prefix)) return 'People';
  
  // Activities
  if (prefix >= '1f3a' && prefix <= '1f3b') return 'Activities';
  if (prefix >= '1f93' && prefix <= '1f94') return 'Activities';
  if (prefix === '1f3c' && /^1f3c[5-9a-f]/.test(fullCode)) return 'Activities';
  
  // Travel & Places
  if (prefix >= '1f30' && prefix <= '1f32') return 'Travel';
  if (prefix >= '1f68' && prefix <= '1f6f') return 'Travel';
  if (prefix === '1f5f') return 'Travel';
  if (prefix >= '1f3d' && prefix <= '1f3f') return 'Travel';
  
  // Food & Drink
  if (prefix >= '1f32' && prefix <= '1f37') return 'Food';
  if (prefix >= '1f95' && prefix <= '1f96') return 'Food';
  if (fullCode.startsWith('1f9aa') || fullCode.startsWith('1f9c')) return 'Food';
  if (fullCode.startsWith('1fad')) return 'Food';
  
  // Animals & Nature
  if (prefix >= '1f40' && prefix <= '1f43') return 'Animals';
  if (prefix >= '1f98' && prefix <= '1f9a') return 'Animals';
  if (prefix >= '1f33' && prefix <= '1f34') return 'Animals';
  if (prefix >= '1fab' && prefix <= '1fab') return 'Animals';
  
  // Objects
  if (prefix >= '1f4b' && prefix <= '1f4f') return 'Objects';
  if (prefix >= '1f50' && prefix <= '1f5e') return 'Objects';
  if (prefix >= '1f6a' && prefix <= '1f6d') return 'Objects';
  if (prefix >= '1fa8' && prefix <= '1faa') return 'Objects';
  if (prefix >= '1f38' && prefix <= '1f39') return 'Objects';
  
  // Symbols
  if (prefix >= '1f17' && prefix <= '1f19') return 'Symbols';
  if (prefix >= '1f20' && prefix <= '1f23') return 'Symbols';
  if (prefix === '1f25') return 'Symbols';
  if (fullCode.startsWith('0023') || fullCode.startsWith('002a') || fullCode.startsWith('003')) return 'Symbols';
  if (fullCode.startsWith('00a9') || fullCode.startsWith('00ae')) return 'Symbols';
  if (prefix === '203c' || prefix === '2049') return 'Symbols';
  if (prefix >= '2600' && prefix <= '26ff') return 'Symbols';
  if (prefix >= '2700' && prefix <= '27bf') return 'Symbols';
  if (prefix >= '2b0' && prefix <= '2bf') return 'Symbols';
  
  return 'Other';
};

try {
  const files = fs.readdirSync(EMOJI_DIR);
  
  // Filter for PNG files only, excluding flags
  const pngFiles = files.filter(file => {
    if (!file.endsWith('.png')) return false;
    const code = file.replace('.png', '');
    if (isFlag(code)) return false;
    return true;
  });

  console.log(`Processing ${pngFiles.length} emoji files (flags excluded)...`);

  // Generate emoji entries
  const emojiData = pngFiles.map(file => {
    const code = file.replace('.png', '').toLowerCase();
    return {
      emoji: code,
      name: code,
      category: getCategoryByPrefix(code),
      url: `/emoji/${file}`
    };
  });

  // Sort by category then by code
  emojiData.sort((a, b) => {
    if (a.category !== b.category) {
      return a.category.localeCompare(b.category);
    }
    return a.emoji.localeCompare(b.emoji);
  });

  // Write to JSON file
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(emojiData, null, 2), 'utf-8');

  console.log(`✅ Generated emoji.json with ${emojiData.length} entries`);
  console.log(`📍 Location: ${OUTPUT_FILE}`);

  // Display stats
  const categoryCounts = {};
  emojiData.forEach(emoji => {
    categoryCounts[emoji.category] = (categoryCounts[emoji.category] || 0) + 1;
  });

  console.log('\n📊 Category breakdown:');
  Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([cat, count]) => {
      console.log(`   ${cat}: ${count}`);
    });

} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
