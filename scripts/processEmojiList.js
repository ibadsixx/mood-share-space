// This script processes a pasted list of emoji files and generates emoji.json
// Paste the directory listing into fileList below

const fs = require('fs');
const path = require('path');

// Check if a file is a flag emoji (skip flags)
const isFlag = (code) => {
  const lowerCode = code.toLowerCase();
  // Regional indicator range: 1f1e6 through 1f1ff
  return /^1f1[e-f][0-9a-f](-1f1[e-f][0-9a-f])?$/.test(lowerCode);
};

// Category mappings based on Unicode ranges
const getCategoryByPrefix = (code) => {
  const prefix = code.substring(0, 4).toLowerCase();
  const fullCode = code.toLowerCase();
  
  if (prefix >= '1f60' && prefix <= '1f64') return 'smileys';
  if (prefix >= '1f90' && prefix <= '1faf') return 'people';
  if (prefix >= '1f46' && prefix <= '1f4a') return 'people';
  if (prefix >= '1f9b' && prefix <= '1f9f') return 'people';
  if (prefix === '1f3c' && /^1f3c[0-4]/.test(fullCode)) return 'people';
  if (prefix === '1f57') return 'people';
  if (prefix === '1f38' && fullCode === '1f385') return 'people';
  if (prefix >= '1f3a' && prefix <= '1f3b') return 'activities';
  if (prefix >= '1f93' && prefix <= '1f94') return 'activities';
  if (prefix === '1f3c' && /^1f3c[5-9a-f]/.test(fullCode)) return 'activities';
  if (prefix >= '1f30' && prefix <= '1f37') return 'travel';
  if (prefix >= '1f68' && prefix <= '1f6f') return 'travel';
  if (prefix === '1f5f') return 'travel';
  if (prefix >= '1f4b' && prefix <= '1f4f') return 'objects';
  if (prefix >= '1f50' && prefix <= '1f5e') return 'objects';
  if (prefix >= '1f6a' && prefix <= '1f6d') return 'objects';
  if (prefix >= '1f17' && prefix <= '1f19') return 'symbols';
  if (prefix >= '1f20' && prefix <= '1f23') return 'symbols';
  if (prefix === '1f25') return 'symbols';
  if (fullCode.startsWith('0023') || fullCode.startsWith('002a') || fullCode.startsWith('003')) return 'symbols';
  if (fullCode.startsWith('00a9') || fullCode.startsWith('00ae')) return 'symbols';
  if (prefix === '203c' || prefix === '2049') return 'symbols';
  if (prefix >= '2600' && prefix <= '26ff') return 'symbols';
  if (prefix >= '2700' && prefix <= '27bf') return 'symbols';
  if (prefix >= '1f32' && prefix <= '1f37') return 'food';
  if (prefix >= '1f95' && prefix <= '1f96') return 'food';
  if (fullCode.startsWith('1f9aa')) return 'food';
  if (prefix >= '1f40' && prefix <= '1f43') return 'animals';
  if (prefix >= '1f98' && prefix <= '1f9a') return 'animals';
  if (prefix >= '1f33' && prefix <= '1f34' && /^1f33[0-9a-f]|1f34[0-3]/.test(fullCode)) return 'animals';
  
  return 'uncategorized';
};

// Read all files from the emoji directory
const EMOJI_DIR = path.join(__dirname, '../public/emoji');
const OUTPUT_FILE = path.join(EMOJI_DIR, 'emoji.json');

try {
  console.log('🔍 Reading emoji directory...');
  const files = fs.readdirSync(EMOJI_DIR);
  
  // Filter for PNG files only, excluding flags
  const pngFiles = files.filter(file => {
    if (!file.endsWith('.png')) return false;
    
    const code = file.replace('.png', '');
    if (isFlag(code)) return false;
    
    return true;
  });

  console.log(`📝 Processing ${pngFiles.length} emoji files (flags excluded)...`);

  // Generate emoji entries
  const emojiData = pngFiles.map(file => {
    const code = file.replace('.png', '');
    
    return {
      emoji: code.toLowerCase(),
      name: code.toLowerCase(),
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

  console.log(`\n✅ Generated emoji.json with ${emojiData.length} entries`);
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

  // Show first 10 and last 10
  console.log('\n📋 First 10 entries:');
  emojiData.slice(0, 10).forEach((e, i) => {
    console.log(`   ${i + 1}. ${e.emoji} -> ${e.name} [${e.category}]`);
  });

  console.log('\n📋 Last 10 entries:');
  emojiData.slice(-10).forEach((e, i) => {
    console.log(`   ${emojiData.length - 10 + i + 1}. ${e.emoji} -> ${e.name} [${e.category}]`);
  });

  console.log('\n✅ Done!');
  
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
